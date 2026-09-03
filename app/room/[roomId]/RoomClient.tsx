'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { Participant } from '@/lib/types';
import { GreenRoom } from '@/components/meeting/GreenRoom';
import { MeetingRoom } from '@/components/meeting/MeetingRoom';

interface RoomClientProps {
  roomId: string;
  isHostParam: boolean;
}

export function RoomClient({ roomId, isHostParam }: RoomClientProps) {
  const { user } = useAuth();
  const [hasJoined, setHasJoined] = useState(false);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);

  const handleJoin = (
    name: string,
    audioEnabled: boolean,
    videoEnabled: boolean,
    stream: MediaStream | null
  ) => {
    const peerId = user?.uid || 'peer_' + Math.random().toString(36).substring(2, 9);

    const newParticipant: Participant = {
      id: peerId,
      uid: peerId,
      name: name,
      photoURL: user?.photoURL || null,
      isHost: isHostParam,
      audioEnabled,
      videoEnabled,
      screenSharing: false,
      isHandRaised: false,
      isMutedByHost: false,
      joinedAt: Date.now(),
    };

    setParticipant(newParticipant);
    setActiveStream(stream);
    setHasJoined(true);
  };

  if (!hasJoined || !participant) {
    return (
      <GreenRoom
        roomId={roomId}
        initialName={user?.displayName || ''}
        onJoin={handleJoin}
      />
    );
  }

  return (
    <MeetingRoom
      roomId={roomId}
      initialParticipant={participant}
      initialStream={activeStream}
    />
  );
}
