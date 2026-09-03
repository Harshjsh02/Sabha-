'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Participant, RoomSettings, ChatMessage, ReactionItem } from '@/lib/types';
import { WebRTCManager } from '@/lib/webrtc';
import { LiveKitRoomManager } from '@/lib/livekitService';
import {
  getOrCreateRoom,
  updateRoomSettings,
  subscribeToRoomSettings,
  sendChatMessage,
  subscribeToChatMessages,
  sendReaction,
  subscribeToReactions,
} from '@/lib/roomService';
import { VideoGrid } from './VideoGrid';
import { MeetingControls } from './MeetingControls';
import { ChatPanel } from './ChatPanel';
import { ParticipantsPanel } from './ParticipantsPanel';
import { WhiteboardModal } from './WhiteboardModal';
import { HostControlModal } from './HostControlModal';
import { ReactionsOverlay } from './ReactionsOverlay';
import { Copy, Check, ShieldCheck, Clock, Zap } from 'lucide-react';

interface MeetingRoomProps {
  roomId: string;
  initialParticipant: Participant;
  initialStream: MediaStream | null;
}

export function MeetingRoom({
  roomId,
  initialParticipant,
  initialStream,
}: MeetingRoomProps) {
  const router = useRouter();

  // Participant & Stream state
  const [localParticipant, setLocalParticipant] = useState<Participant>(initialParticipant);
  const [localStream, setLocalStream] = useState<MediaStream | null>(initialStream);
  const [remoteParticipants, setRemoteParticipants] = useState<Participant[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  // Room settings & Realtime data
  const [roomSettings, setRoomSettings] = useState<RoomSettings>({
    roomId,
    hostId: initialParticipant.isHost ? initialParticipant.id : '',
    hostName: initialParticipant.isHost ? initialParticipant.name : '',
    title: `Sabha ${roomId}`,
    isLocked: false,
    allowScreenShare: true,
    allowChat: true,
    allowUnmute: true,
    createdAt: Date.now(),
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [latestReaction, setLatestReaction] = useState<ReactionItem | null>(null);

  // Panels & Modals
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Meeting duration timer
  const [duration, setDuration] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isLiveKitSFU, setIsLiveKitSFU] = useState(false);

  const rtcManagerRef = useRef<WebRTCManager | null>(null);
  const liveKitManagerRef = useRef<LiveKitRoomManager | null>(null);

  // Initialize Room & Media Engine
  useEffect(() => {
    let active = true;

    async function init() {
      // 1. Fetch or initialize room data
      const roomData = await getOrCreateRoom(
        roomId,
        initialParticipant.isHost ? initialParticipant.id : '',
        initialParticipant.isHost ? initialParticipant.name : ''
      );

      if (active) {
        setRoomSettings(roomData);
      }

      // Check if room is locked and user is not host
      if (roomData.isLocked && !initialParticipant.isHost) {
        alert('This Sabha meeting has been locked by the host.');
        router.push('/');
        return;
      }

      // 2. Try LiveKit SFU first (handles 50 to 100+ participants)
      let connectedViaLiveKit = false;
      try {
        const username = initialParticipant.name || initialParticipant.id;
        const res = await fetch(
          `/api/livekit-token?room=${encodeURIComponent(roomId)}&username=${encodeURIComponent(username)}&isHost=${initialParticipant.isHost}`
        );

        if (res.ok) {
          const data = await res.json();
          if (data.token && data.wsUrl && active) {
            const lkManager = new LiveKitRoomManager(data.wsUrl, data.token, initialParticipant);
            liveKitManagerRef.current = lkManager;

            lkManager.onRemoteStreamAdded = (peerId, stream) => {
              setRemoteStreams((prev) => new Map(prev).set(peerId, stream));
            };

            lkManager.onRemoteStreamRemoved = (peerId) => {
              setRemoteStreams((prev) => {
                const next = new Map(prev);
                next.delete(peerId);
                return next;
              });
            };

            lkManager.onParticipantsChanged = (participants) => {
              setRemoteParticipants(participants);
            };

            await lkManager.connect();
            await lkManager.publishLocalTracks(
              initialParticipant.audioEnabled,
              initialParticipant.videoEnabled
            );

            setIsLiveKitSFU(true);
            connectedViaLiveKit = true;
          }
        }
      } catch (err) {
        console.warn('LiveKit SFU connection attempt returned:', err);
      }

      // 3. Fallback to WebRTC Mesh if LiveKit is not configured or fails
      if (!connectedViaLiveKit && active) {
        const manager = new WebRTCManager(roomId, initialParticipant);
        rtcManagerRef.current = manager;

        if (initialStream) {
          manager.setLocalStream(initialStream);
        }

        manager.onRemoteStreamAdded = (peerId, stream) => {
          setRemoteStreams((prev) => new Map(prev).set(peerId, stream));
        };

        manager.onRemoteStreamRemoved = (peerId) => {
          setRemoteStreams((prev) => {
            const next = new Map(prev);
            next.delete(peerId);
            return next;
          });
        };

        manager.onParticipantsChanged = (participants) => {
          const others = participants.filter((p) => p.id !== initialParticipant.id);
          setRemoteParticipants(others);
        };

        manager.onMuteRequested = () => {
          if (localStream) {
            localStream.getAudioTracks().forEach((t) => (t.enabled = false));
          }
          setLocalParticipant((prev) => ({ ...prev, audioEnabled: false }));
          manager.updateParticipantState({ audioEnabled: false });
          alert('You have been muted by the host.');
        };

        manager.onKicked = () => {
          alert('You have been removed from this Sabha by the host.');
          router.push('/');
        };

        await manager.joinRoom();
      }
    }

    init();

    // 4. Subscriptions
    const unsubSettings = subscribeToRoomSettings(roomId, (updated) => {
      setRoomSettings(updated);
    });

    const unsubChat = subscribeToChatMessages(roomId, (allMsgs) => {
      setMessages(allMsgs);
      if (!isChatOpen && allMsgs.length > 0) {
        setUnreadChatCount((c) => c + 1);
      }
    });

    const unsubReactions = subscribeToReactions(roomId, (rx) => {
      setLatestReaction(rx);
    });

    // 5. Duration timer
    const timer = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);

    return () => {
      active = false;
      clearInterval(timer);
      unsubSettings();
      unsubChat();
      unsubReactions();
      if (liveKitManagerRef.current) {
        liveKitManagerRef.current.disconnect();
      }
      if (rtcManagerRef.current) {
        rtcManagerRef.current.leaveRoom();
      }
    };
  }, [roomId, initialParticipant.id]);

  // Reset unread chat count when chat opens
  useEffect(() => {
    if (isChatOpen) {
      setUnreadChatCount(0);
    }
  }, [isChatOpen]);

  // Toggle Audio
  const handleToggleAudio = async () => {
    if (!roomSettings.allowUnmute && !localParticipant.isHost && !localParticipant.audioEnabled) {
      alert('The host has disabled participants from unmuting.');
      return;
    }

    const nextState = !localParticipant.audioEnabled;

    if (liveKitManagerRef.current) {
      await liveKitManagerRef.current.setAudioEnabled(nextState);
    }

    if (localStream) {
      localStream.getAudioTracks().forEach((t) => (t.enabled = nextState));
    }

    setLocalParticipant((p) => ({ ...p, audioEnabled: nextState }));
    rtcManagerRef.current?.updateParticipantState({ audioEnabled: nextState });
  };

  // Toggle Video
  const handleToggleVideo = async () => {
    const nextState = !localParticipant.videoEnabled;

    if (liveKitManagerRef.current) {
      await liveKitManagerRef.current.setVideoEnabled(nextState);
    }

    if (localStream) {
      localStream.getVideoTracks().forEach((t) => (t.enabled = nextState));
    }

    setLocalParticipant((p) => ({ ...p, videoEnabled: nextState }));
    rtcManagerRef.current?.updateParticipantState({ videoEnabled: nextState });
  };

  // Toggle Screen Share
  const handleToggleScreenShare = async () => {
    if (!roomSettings.allowScreenShare && !localParticipant.isHost && !localParticipant.screenSharing) {
      alert('The host has disabled screen sharing for participants.');
      return;
    }

    if (localParticipant.screenSharing) {
      // Stop sharing
      if (liveKitManagerRef.current) {
        await liveKitManagerRef.current.setScreenShareEnabled(false);
      }
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
        setScreenStream(null);
      }
      if (initialStream) {
        rtcManagerRef.current?.setLocalStream(initialStream);
        setLocalStream(initialStream);
      }
      setLocalParticipant((p) => ({ ...p, screenSharing: false }));
      rtcManagerRef.current?.updateParticipantState({ screenSharing: false });
    } else {
      try {
        if (liveKitManagerRef.current) {
          const lkScreen = await liveKitManagerRef.current.setScreenShareEnabled(true);
          if (lkScreen) {
            setScreenStream(lkScreen);
          }
          setLocalParticipant((p) => ({ ...p, screenSharing: true }));
        } else {
          const stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
          });

          setScreenStream(stream);
          rtcManagerRef.current?.setLocalStream(stream);
          setLocalStream(stream);
          setLocalParticipant((p) => ({ ...p, screenSharing: true }));
          rtcManagerRef.current?.updateParticipantState({ screenSharing: true });

          stream.getVideoTracks()[0].onended = () => {
            if (initialStream) {
              rtcManagerRef.current?.setLocalStream(initialStream);
              setLocalStream(initialStream);
            }
            setScreenStream(null);
            setLocalParticipant((p) => ({ ...p, screenSharing: false }));
            rtcManagerRef.current?.updateParticipantState({ screenSharing: false });
          };
        }
      } catch (err) {
        console.warn('Screen share canceled or failed:', err);
      }
    }
  };

  // Toggle Hand Raise
  const handleToggleHandRaise = () => {
    const next = !localParticipant.isHandRaised;
    setLocalParticipant((p) => ({ ...p, isHandRaised: next }));
    rtcManagerRef.current?.updateParticipantState({ isHandRaised: next });
    if (next) {
      sendReaction(roomId, '✋', localParticipant.id, localParticipant.name);
    }
  };

  // Send Reaction
  const handleSendReaction = (emoji: string) => {
    sendReaction(roomId, emoji, localParticipant.id, localParticipant.name);
  };

  // Send Chat Message
  const handleSendMessage = (text: string, to: string) => {
    sendChatMessage(roomId, {
      senderId: localParticipant.id,
      senderName: localParticipant.name,
      senderPhoto: localParticipant.photoURL,
      text,
      to,
    });
  };

  // Recording feature (In-browser MediaRecorder API)
  const handleToggleRecording = async () => {
    if (isRecording) {
      // Stop Recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      try {
        const captureStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        recordedChunksRef.current = [];
        const recorder = new MediaRecorder(captureStream, {
          mimeType: 'video/webm;codecs=vp9,opus',
        });

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          captureStream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `sabha-recording-${roomId}-${Date.now()}.webm`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          }, 100);
        };

        recorder.start(1000);
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      } catch (err) {
        console.warn('Recording cancelled or not supported:', err);
      }
    }
  };

  // Host Controls
  const handleMuteAll = () => {
    rtcManagerRef.current?.sendMuteAllCommand(remoteParticipants);
  };

  const handleMuteParticipant = (peerId: string) => {
    rtcManagerRef.current?.sendMuteCommand(peerId);
  };

  const handleKickParticipant = (peerId: string) => {
    rtcManagerRef.current?.sendKickCommand(peerId);
  };

  const handleToggleLock = () => {
    updateRoomSettings(roomId, { isLocked: !roomSettings.isLocked });
  };

  const handleUpdateSettings = (updates: Partial<RoomSettings>) => {
    updateRoomSettings(roomId, updates);
  };

  const handleEndMeetingForAll = async () => {
    for (const p of remoteParticipants) {
      await rtcManagerRef.current?.sendKickCommand(p.id);
    }
    if (liveKitManagerRef.current) {
      await liveKitManagerRef.current.disconnect();
    }
    await rtcManagerRef.current?.leaveRoom();
    router.push('/');
  };

  const handleLeaveMeeting = async () => {
    if (confirm('Are you sure you want to leave the Sabha?')) {
      if (liveKitManagerRef.current) {
        await liveKitManagerRef.current.disconnect();
      }
      await rtcManagerRef.current?.leaveRoom();
      router.push('/');
    }
  };

  const copyInviteLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col overflow-hidden select-none">
      {/* Top Header Bar */}
      <div className="h-14 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center shadow-md">
            स
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">Sabha</span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-mono">
                {roomId}
              </span>
              {isLiveKitSFU && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/30 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> 100+ Capacity
                </span>
              )}
              {roomSettings.isLocked && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">
                  Locked
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Meeting Duration */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>{formatDuration(duration)}</span>
        </div>

        {/* Right: Copy Link */}
        <div className="flex items-center gap-2">
          <button
            onClick={copyInviteLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition shadow-sm"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
          </button>
        </div>
      </div>

      {/* Main Body: Video Grid + Side Panels */}
      <div className="flex-1 flex min-h-0 relative">
        <VideoGrid
          localParticipant={localParticipant}
          localStream={localStream}
          remoteParticipants={remoteParticipants}
          remoteStreams={remoteStreams}
          isHostViewer={localParticipant.isHost}
          onMuteParticipant={handleMuteParticipant}
          onKickParticipant={handleKickParticipant}
        />

        {/* Side Panel: In-Meeting Chat */}
        <ChatPanel
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          messages={messages}
          participants={[localParticipant, ...remoteParticipants]}
          currentUserId={localParticipant.id}
          onSendMessage={handleSendMessage}
          allowChat={roomSettings.allowChat}
          isHost={localParticipant.isHost}
        />

        {/* Side Panel: Participants Roster */}
        <ParticipantsPanel
          isOpen={isParticipantsOpen}
          onClose={() => setIsParticipantsOpen(false)}
          participants={[localParticipant, ...remoteParticipants]}
          currentUserId={localParticipant.id}
          isHost={localParticipant.isHost}
          isLocked={roomSettings.isLocked}
          onMuteAll={handleMuteAll}
          onMuteParticipant={handleMuteParticipant}
          onKickParticipant={handleKickParticipant}
          onToggleLock={handleToggleLock}
        />
      </div>

      {/* Zoom-Style Bottom Toolbar */}
      <MeetingControls
        isHost={localParticipant.isHost}
        audioEnabled={localParticipant.audioEnabled}
        videoEnabled={localParticipant.videoEnabled}
        screenSharing={localParticipant.screenSharing}
        isHandRaised={localParticipant.isHandRaised}
        isRecording={isRecording}
        participantCount={remoteParticipants.length + 1}
        unreadChatCount={unreadChatCount}
        onToggleAudio={handleToggleAudio}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleHandRaise={handleToggleHandRaise}
        onToggleRecording={handleToggleRecording}
        onToggleParticipantsPanel={() => {
          setIsParticipantsOpen(!isParticipantsOpen);
          setIsChatOpen(false);
        }}
        onToggleChatPanel={() => {
          setIsChatOpen(!isChatOpen);
          setIsParticipantsOpen(false);
        }}
        onOpenWhiteboard={() => setIsWhiteboardOpen(true)}
        onOpenSecurityModal={() => setIsSecurityOpen(true)}
        onSendReaction={handleSendReaction}
        onLeaveMeeting={handleLeaveMeeting}
      />

      {/* Interactive Modals */}
      <WhiteboardModal
        isOpen={isWhiteboardOpen}
        onClose={() => setIsWhiteboardOpen(false)}
      />

      <HostControlModal
        isOpen={isSecurityOpen}
        onClose={() => setIsSecurityOpen(false)}
        roomSettings={roomSettings}
        onUpdateSettings={handleUpdateSettings}
        onEndMeetingForAll={handleEndMeetingForAll}
      />

      {/* Floating Emoji Reactions Layer */}
      <ReactionsOverlay latestReaction={latestReaction} />
    </div>
  );
}
