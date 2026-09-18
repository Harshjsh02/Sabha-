'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { Participant, RoomSettings, WaitingParticipant } from '@/lib/types';
import { getOrCreateRoom, subscribeToRoomSettings, requestToJoinWaitingRoom } from '@/lib/roomService';
import { GreenRoom } from '@/components/meeting/GreenRoom';
import { WaitingRoom } from '@/components/meeting/WaitingRoom';
import { MeetingRoom } from '@/components/meeting/MeetingRoom';

interface RoomClientProps {
  roomId: string;
  isHostParam: boolean;
}

export function RoomClient({ roomId, isHostParam }: RoomClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [roomSettings, setRoomSettings] = useState<RoomSettings | null>(null);
  const [inMeeting, setInMeeting] = useState(false);
  const [inWaitingRoom, setInWaitingRoom] = useState(false);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);

  // Subscribe to room settings and initialize room document
  useEffect(() => {
    let active = true;

    async function initSettings() {
      const settings = await getOrCreateRoom(
        roomId,
        user?.uid || '',
        user?.displayName || ''
      );
      if (active) {
        setRoomSettings(settings);
      }
    }

    initSettings();

    const unsub = subscribeToRoomSettings(roomId, (updated) => {
      if (active) {
        setRoomSettings(updated);
      }
    });

    return () => {
      active = false;
      unsub();
    };
  }, [roomId, user?.uid, user?.displayName]);

  const handleJoin = async (
    name: string,
    audioEnabled: boolean,
    videoEnabled: boolean,
    stream: MediaStream | null
  ) => {
    // Generate a unique session ID per device so multiple devices (same account or different accounts)
    // each receive their own unique participant tile, stream, and WebRTC connection.
    const sessionId = Math.random().toString(36).substring(2, 8);
    const peerId = user?.uid ? `${user.uid}_${sessionId}` : `peer_${sessionId}`;
    const userUid = user?.uid || peerId;

    // Host check: user UID matches hostId in Firestore or host query param
    const isHost = Boolean(
      (user?.uid && roomSettings?.hostId && user.uid === roomSettings.hostId) ||
      isHostParam
    );

    const newParticipant: Participant = {
      id: peerId,
      uid: userUid,
      name: name,
      photoURL: user?.photoURL || null,
      isHost: isHost,
      audioEnabled,
      videoEnabled,
      screenSharing: false,
      isHandRaised: false,
      isMutedByHost: false,
      joinedAt: Date.now(),
    };

    setParticipant(newParticipant);
    setActiveStream(stream);

    // If verified host, enter meeting directly without waiting
    if (isHost) {
      setInMeeting(true);
      return;
    }

    // For attendees: check if waiting room policy is active or host has not joined yet
    const shouldWait =
      roomSettings?.waitingRoomEnabled !== false || !roomSettings?.hostJoined;

    if (shouldWait) {
      const waitData: WaitingParticipant = {
        id: peerId,
        uid: userUid,
        name: name,
        photoURL: user?.photoURL || null,
        status: 'waiting',
        audioEnabled,
        videoEnabled,
        requestedAt: Date.now(),
      };

      await requestToJoinWaitingRoom(roomId, waitData);
      setInWaitingRoom(true);
    } else {
      setInMeeting(true);
    }
  };

  // Phase 1: In Waiting Room
  if (inWaitingRoom && participant) {
    return (
      <WaitingRoom
        roomId={roomId}
        participant={participant}
        stream={activeStream}
        onAdmitted={() => {
          setInWaitingRoom(false);
          setInMeeting(true);
        }}
        onLeave={() => router.push('/')}
      />
    );
  }

  // Phase 2: In Meeting Room
  if (inMeeting && participant) {
    return (
      <MeetingRoom
        roomId={roomId}
        initialParticipant={participant}
        initialStream={activeStream}
      />
    );
  }

  // Phase 0: In Green Room (Preview & Device Setup)
  return (
    <GreenRoom
      roomId={roomId}
      initialName={user?.displayName || ''}
      onJoin={handleJoin}
    />
  );
}
