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
import { useAuth } from '@/lib/authContext';
import { VideoGrid } from './VideoGrid';
import { MeetingControls } from './MeetingControls';
import { ChatPanel } from './ChatPanel';
import { ParticipantsPanel } from './ParticipantsPanel';
import { WhiteboardModal, WhiteboardDrawEvent } from './WhiteboardModal';
import { HostControlModal } from './HostControlModal';
import { ShareMeetingModal } from './ShareMeetingModal';
import { ReactionsOverlay } from './ReactionsOverlay';
import { Copy, Check, Clock, Zap, Share2 } from 'lucide-react';

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
  const [remoteScreenStreams, setRemoteScreenStreams] = useState<Map<string, MediaStream>>(new Map());

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

  const { user } = useAuth();

  // Panels & Modals
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [incomingDrawEvent, setIncomingDrawEvent] = useState<WhiteboardDrawEvent | null>(null);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Meeting duration timer
  const [duration, setDuration] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isLiveKitSFU, setIsLiveKitSFU] = useState(false);

  // Loading / Mutex states for audio/video toggling
  const [isTogglingAudio, setIsTogglingAudio] = useState(false);
  const [isTogglingVideo, setIsTogglingVideo] = useState(false);
  const isTogglingAudioRef = useRef(false);
  const isTogglingVideoRef = useRef(false);

  const rtcManagerRef = useRef<WebRTCManager | null>(null);
  const liveKitManagerRef = useRef<LiveKitRoomManager | null>(null);

  // Initialize Room & Media Engine
  useEffect(() => {
    let active = true;

    async function init() {
      // 1. Fetch or initialize room data from Firestore
      const roomData = await getOrCreateRoom(
        roomId,
        user?.uid || '',
        user?.displayName || ''
      );

      if (active) {
        setRoomSettings(roomData);
      }

      // True Database Verification: user is host ONLY if their UID matches Firestore hostId
      const isVerifiedHost = Boolean(user?.uid && roomData.hostId && user.uid === roomData.hostId);

      if (active) {
        setLocalParticipant((prev) => ({ ...prev, isHost: isVerifiedHost }));
      }

      // Check if room is locked and user is not verified host
      if (roomData.isLocked && !isVerifiedHost) {
        alert('This Sabha meeting has been locked by the host.');
        router.push('/');
        return;
      }

      // 2. Try LiveKit SFU first (handles 50 to 100+ participants)
      let connectedViaLiveKit = false;
      try {
        const username = initialParticipant.name || initialParticipant.id;
        const res = await fetch(
          `/api/livekit-token?room=${encodeURIComponent(roomId)}&username=${encodeURIComponent(username)}&isHost=${isVerifiedHost}`
        );

        if (res.ok) {
          const data = await res.json();
          if (data.token && data.wsUrl && active) {
            const cleanWsUrl = (data.wsUrl || '').trim();
            const cleanToken = (data.token || '').trim();
            const lkManager = new LiveKitRoomManager(cleanWsUrl, cleanToken, initialParticipant);
            liveKitManagerRef.current = lkManager;

            lkManager.onRemoteStreamAdded = (peerId, stream) => {
              setRemoteStreams((prev) => new Map(prev).set(peerId, new MediaStream(stream.getTracks())));
            };

            lkManager.onRemoteStreamRemoved = (peerId) => {
              setRemoteStreams((prev) => {
                const next = new Map(prev);
                next.delete(peerId);
                return next;
              });
            };

            // Dedicated screen sharing stream subscriptions
            lkManager.onRemoteScreenStreamAdded = (peerId, stream) => {
              setRemoteScreenStreams((prev) => new Map(prev).set(peerId, new MediaStream(stream.getTracks())));
            };

            lkManager.onRemoteScreenStreamRemoved = (peerId) => {
              setRemoteScreenStreams((prev) => {
                const next = new Map(prev);
                next.delete(peerId);
                return next;
              });
            };

            lkManager.onLocalScreenShareStopped = () => {
              setScreenStream(null);
              setLocalParticipant((p) => ({ ...p, screenSharing: false }));
            };

            lkManager.onParticipantsChanged = (participants) => {
              setRemoteParticipants(participants);
            };

            // Whiteboard & data packets
            lkManager.onDataReceived = (payload) => {
              if (payload?.type === 'whiteboard') {
                setIncomingDrawEvent(payload.event);
              }
            };

            // Keep local stream synchronized with any track updates
            lkManager.onLocalStreamChanged = (stream) => {
              if (active && stream) {
                setLocalStream(new MediaStream(stream.getTracks()));
              }
            };

            await lkManager.connect();
            const lkLocalStream = await lkManager.publishLocalTracks(
              initialParticipant.audioEnabled,
              initialParticipant.videoEnabled
            );

            if (lkLocalStream && lkLocalStream.getTracks().length > 0) {
              setLocalStream(lkLocalStream);
            }

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

        let meshStream = initialStream;
        if (!meshStream || meshStream.getTracks().every((t) => t.readyState === 'ended')) {
          try {
            meshStream = await navigator.mediaDevices.getUserMedia({
              audio: initialParticipant.audioEnabled,
              video: initialParticipant.videoEnabled ? { width: 1280, height: 720 } : false,
            });
            if (active) {
              setLocalStream(meshStream);
            }
          } catch (err) {
            console.warn('Fallback WebRTC getUserMedia failed:', err);
          }
        }

        if (meshStream) {
          manager.setLocalStream(meshStream);
        }

        manager.onRemoteStreamAdded = (peerId, stream) => {
          setRemoteStreams((prev) => new Map(prev).set(peerId, new MediaStream(stream.getTracks())));
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

    // 6. Fast cleanup on app close, tab close, or navigation (beforeunload + pagehide)
    const handleCleanExit = () => {
      if (liveKitManagerRef.current) {
        liveKitManagerRef.current.disconnect();
      }
      if (rtcManagerRef.current) {
        rtcManagerRef.current.leaveRoom();
      }
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const payload = JSON.stringify({ roomId, participantId: initialParticipant.id });
        navigator.sendBeacon('/api/room/leave', new Blob([payload], { type: 'application/json' }));
      }
    };

    window.addEventListener('beforeunload', handleCleanExit);
    window.addEventListener('pagehide', handleCleanExit);

    return () => {
      active = false;
      window.removeEventListener('beforeunload', handleCleanExit);
      window.removeEventListener('pagehide', handleCleanExit);
      handleCleanExit();
      clearInterval(timer);
      unsubSettings();
      unsubChat();
      unsubReactions();
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
    if (isTogglingAudioRef.current) return;

    if (roomSettings.allowUnmute === false && !localParticipant.isHost && !localParticipant.audioEnabled) {
      alert('The host has disabled participants from unmuting.');
      return;
    }

    isTogglingAudioRef.current = true;
    setIsTogglingAudio(true);

    const nextState = !localParticipant.audioEnabled;

    try {
      if (liveKitManagerRef.current) {
        const updatedStream = await liveKitManagerRef.current.setAudioEnabled(nextState);
        if (updatedStream && updatedStream.getTracks().length > 0) {
          setLocalStream(new MediaStream(updatedStream.getTracks()));
        }
      }

      if (localStream) {
        localStream.getAudioTracks().forEach((t) => (t.enabled = nextState));
        setLocalStream(new MediaStream(localStream.getTracks()));
      }

      setLocalParticipant((p) => ({ ...p, audioEnabled: nextState }));
      rtcManagerRef.current?.updateParticipantState({ audioEnabled: nextState });
    } catch (err) {
      console.warn('Microphone toggle warning:', err);
    } finally {
      isTogglingAudioRef.current = false;
      setIsTogglingAudio(false);
    }
  };

  // Automatically turn on video if host forces cameras on
  useEffect(() => {
    if (roomSettings.requireVideo && !localParticipant.isHost && !localParticipant.videoEnabled) {
      const enableVideoAutomatically = async () => {
        try {
          if (liveKitManagerRef.current) {
            const updatedStream = await liveKitManagerRef.current.setVideoEnabled(true);
            setLocalStream(new MediaStream(updatedStream.getTracks()));
          } else if (localStream) {
            localStream.getVideoTracks().forEach((t) => (t.enabled = true));
            setLocalStream(new MediaStream(localStream.getTracks()));
          }
          setLocalParticipant((p) => ({ ...p, videoEnabled: true }));
          rtcManagerRef.current?.updateParticipantState({ videoEnabled: true });
        } catch (err) {
          console.warn('Auto enable video failed:', err);
        }
      };
      enableVideoAutomatically();
    }
  }, [roomSettings.requireVideo, localParticipant.isHost, localParticipant.videoEnabled]);

  // Toggle Video
  const handleToggleVideo = async () => {
    if (isTogglingVideoRef.current) return;

    if (roomSettings.requireVideo && !localParticipant.isHost && localParticipant.videoEnabled) {
      alert('The host (सभापति) requires all participants to keep their camera on.');
      return;
    }

    isTogglingVideoRef.current = true;
    setIsTogglingVideo(true);

    const nextState = !localParticipant.videoEnabled;

    try {
      if (liveKitManagerRef.current) {
        const updatedStream = await liveKitManagerRef.current.setVideoEnabled(nextState);
        setLocalStream(new MediaStream(updatedStream.getTracks()));
      } else if (localStream) {
        localStream.getVideoTracks().forEach((t) => (t.enabled = nextState));
        setLocalStream(new MediaStream(localStream.getTracks()));
      }

      setLocalParticipant((p) => ({ ...p, videoEnabled: nextState }));
      rtcManagerRef.current?.updateParticipantState({ videoEnabled: nextState });
    } catch (err) {
      console.warn('Camera toggle warning:', err);
    } finally {
      isTogglingVideoRef.current = false;
      setIsTogglingVideo(false);
    }
  };

  // Toggle Screen Share
  const handleToggleScreenShare = async () => {
    if (roomSettings.allowScreenShare === false && !localParticipant.isHost && !localParticipant.screenSharing) {
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
      if (liveKitManagerRef.current) {
        setLocalStream(liveKitManagerRef.current.getLocalStream());
      }
      setLocalParticipant((p) => ({ ...p, screenSharing: false }));
      rtcManagerRef.current?.updateParticipantState({ screenSharing: false });
    } else {
      try {
        if (liveKitManagerRef.current) {
          const lkScreen = await liveKitManagerRef.current.setScreenShareEnabled(true);
          if (lkScreen) {
            setScreenStream(lkScreen);
            setLocalParticipant((p) => ({ ...p, screenSharing: true }));
            const track = lkScreen.getVideoTracks()[0];
            if (track) {
              track.onended = () => {
                liveKitManagerRef.current?.setScreenShareEnabled(false);
                setScreenStream(null);
                setLocalParticipant((p) => ({ ...p, screenSharing: false }));
              };
            }
          }
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

  // Broadcast Whiteboard stroke / clear
  const handleBroadcastDraw = (drawEvent: WhiteboardDrawEvent) => {
    if (liveKitManagerRef.current) {
      liveKitManagerRef.current.sendData({
        type: 'whiteboard',
        event: drawEvent,
      });
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
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const payload = JSON.stringify({ roomId, participantId: peerId });
      navigator.sendBeacon('/api/room/leave', new Blob([payload], { type: 'application/json' }));
    }
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
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const payload = JSON.stringify({ roomId, participantId: p.id });
        navigator.sendBeacon('/api/room/leave', new Blob([payload], { type: 'application/json' }));
      }
    }
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const payload = JSON.stringify({ roomId, participantId: localParticipant.id });
      navigator.sendBeacon('/api/room/leave', new Blob([payload], { type: 'application/json' }));
    }
    if (liveKitManagerRef.current) {
      await liveKitManagerRef.current.disconnect();
    }
    await rtcManagerRef.current?.leaveRoom();
    router.push('/');
  };

  const handleLeaveMeeting = async () => {
    if (confirm('Are you sure you want to leave the Sabha?')) {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const payload = JSON.stringify({ roomId, participantId: localParticipant.id });
        navigator.sendBeacon('/api/room/leave', new Blob([payload], { type: 'application/json' }));
      }
      if (liveKitManagerRef.current) {
        await liveKitManagerRef.current.disconnect();
      }
      await rtcManagerRef.current?.leaveRoom();
      router.push('/');
    }
  };

  const copyInviteLink = () => {
    const cleanUrl = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(cleanUrl);
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

        {/* Right: Invite & Copy Clean Link */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
            title="Invite participants with clean link, WhatsApp, or apps"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Invite</span>
          </button>

          <button
            onClick={copyInviteLink}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition shadow-sm active:scale-95 cursor-pointer"
            title="Copy clean participant join link"
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
          screenStream={screenStream}
          remoteScreenStreams={remoteScreenStreams}
          onStopScreenShare={handleToggleScreenShare}
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
          onOpenInvite={() => setIsShareModalOpen(true)}
        />
      </div>

      {/* Zoom-Style Bottom Toolbar */}
      <MeetingControls
        isHost={localParticipant.isHost}
        audioEnabled={localParticipant.audioEnabled}
        videoEnabled={localParticipant.videoEnabled}
        isTogglingAudio={isTogglingAudio}
        isTogglingVideo={isTogglingVideo}
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
        isWhiteboardOpen={isWhiteboardOpen}
        onToggleWhiteboard={() => setIsWhiteboardOpen(!isWhiteboardOpen)}
        onOpenSecurityModal={() => setIsSecurityOpen(true)}
        onSendReaction={handleSendReaction}
        onLeaveMeeting={handleLeaveMeeting}
      />

      {/* Interactive Modals */}
      <WhiteboardModal
        isOpen={isWhiteboardOpen}
        onClose={() => setIsWhiteboardOpen(false)}
        onBroadcastDraw={handleBroadcastDraw}
        incomingDrawEvent={incomingDrawEvent}
      />

      <HostControlModal
        isOpen={isSecurityOpen}
        onClose={() => setIsSecurityOpen(false)}
        roomSettings={roomSettings}
        onUpdateSettings={handleUpdateSettings}
        onEndMeetingForAll={handleEndMeetingForAll}
      />

      {/* Share / Invite Modal */}
      <ShareMeetingModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        roomId={roomId}
        hostName={roomSettings.hostName}
      />

      {/* Floating Emoji Reactions Layer */}
      <ReactionsOverlay latestReaction={latestReaction} />
    </div>
  );
}
