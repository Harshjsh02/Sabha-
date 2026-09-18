'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Participant, RoomSettings, ChatMessage, ReactionItem, WaitingParticipant } from '@/lib/types';
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
  subscribeToWaitingRoom,
  admitParticipant,
  denyParticipant,
  admitAllParticipants,
  updateHostPresence,
} from '@/lib/roomService';
import { useAuth } from '@/lib/authContext';
import { VideoGrid } from './VideoGrid';
import { MeetingControls } from './MeetingControls';
import { ChatPanel } from './ChatPanel';
import { ParticipantsPanel } from './ParticipantsPanel';
import { WhiteboardModal, WhiteboardDrawEvent } from './WhiteboardModal';
import { HostControlModal } from './HostControlModal';
import { ShareMeetingModal } from './ShareMeetingModal';
import { RecordModal } from './RecordModal';
import { LeaveMeetingModal } from './LeaveMeetingModal';
import { WaitingRoomBanner } from './WaitingRoomBanner';
import { ReactionsOverlay } from './ReactionsOverlay';
import {
  Copy,
  Check,
  Clock,
  Zap,
  Share2,
  ShieldCheck,
  ChevronDown,
  LayoutTemplate,
  LayoutGrid,
  Grid2X2,
  Maximize,
  Minimize,
  Lock,
} from 'lucide-react';

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
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [waitingList, setWaitingList] = useState<WaitingParticipant[]>([]);
  const [incomingDrawEvent, setIncomingDrawEvent] = useState<WhiteboardDrawEvent | null>(null);

  // Recording State & Audio Mixing
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingAudioContextRef = useRef<AudioContext | null>(null);
  const recordingDisplayStreamRef = useRef<MediaStream | null>(null);
  const recordingMicStreamRef = useRef<MediaStream | null>(null);

  // Meeting duration timer & Zoom View mode state
  const [duration, setDuration] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isLiveKitSFU, setIsLiveKitSFU] = useState(false);

  // Zoom-style View Switcher & Top-Bar State
  const [viewMode, setViewMode] = useState<'gallery' | 'speaker' | 'multi-speaker'>('gallery');
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showMeetingInfo, setShowMeetingInfo] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement>(null);
  const meetingInfoRef = useRef<HTMLDivElement>(null);

  // Click-outside listeners for top-bar dropdowns
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) {
        setShowViewMenu(false);
      }
      if (meetingInfoRef.current && !meetingInfoRef.current.contains(e.target as Node)) {
        setShowMeetingInfo(false);
      }
    }
    if (showViewMenu || showMeetingInfo) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showViewMenu, showMeetingInfo]);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
    setShowViewMenu(false);
  };

  const rtcManagerRef = useRef<WebRTCManager | null>(null);
  const liveKitManagerRef = useRef<LiveKitRoomManager | null>(null);
  const activeCameraStreamRef = useRef<MediaStream | null>(initialStream || null);

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

      if (isVerifiedHost) {
        updateHostPresence(roomId, true).catch(() => {});
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
        const identity = initialParticipant.id;
        const username = initialParticipant.name || initialParticipant.id;
        const res = await fetch(
          `/api/livekit-token?room=${encodeURIComponent(roomId)}&identity=${encodeURIComponent(identity)}&username=${encodeURIComponent(username)}&isHost=${isVerifiedHost}&photoURL=${encodeURIComponent(initialParticipant.photoURL || '')}`
        );

        if (res.ok) {
          const data = await res.json();
          if (data.token && data.wsUrl && active) {
            const cleanWsUrl = (data.wsUrl || '').trim();
            const cleanToken = (data.token || '').trim();
            const lkManager = new LiveKitRoomManager(cleanWsUrl, cleanToken, initialParticipant);

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

            lkManager.onKicked = (reason?: string) => {
              if (reason === 'meeting-ended') {
                alert('The host has ended this Sabha assembly.');
              } else {
                alert('You have been removed from this Sabha by the host.');
              }
              router.push('/');
            };

            await lkManager.connect();
            const lkLocalStream = await lkManager.publishLocalTracks(
              initialParticipant.audioEnabled,
              initialParticipant.videoEnabled,
              initialStream
            );

            if (lkLocalStream && lkLocalStream.getTracks().length > 0) {
              setLocalStream(lkLocalStream);
            }

            liveKitManagerRef.current = lkManager;
            setIsLiveKitSFU(true);
            connectedViaLiveKit = true;
          }
        }
      } catch (err) {
        console.warn('LiveKit SFU connection attempt returned, falling back to WebRTC Mesh:', err);
        if (liveKitManagerRef.current) {
          liveKitManagerRef.current.disconnect().catch(() => {});
          liveKitManagerRef.current = null;
        }
        setIsLiveKitSFU(false);
        connectedViaLiveKit = false;
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
          activeCameraStreamRef.current = meshStream;
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

        manager.onRemoteScreenStreamAdded = (peerId, stream) => {
          setRemoteScreenStreams((prev) => new Map(prev).set(peerId, new MediaStream(stream.getTracks())));
        };

        manager.onRemoteScreenStreamRemoved = (peerId) => {
          setRemoteScreenStreams((prev) => {
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

        manager.onKicked = (reason?: string) => {
          if (reason === 'meeting-ended') {
            alert('The host has ended this Sabha assembly.');
          } else {
            alert('You have been removed from this Sabha by the host.');
          }
          router.push('/');
        };

        manager.onWhiteboardReceived = (event) => {
          setIncomingDrawEvent(event);
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
      if (initialParticipant.isHost) {
        updateHostPresence(roomId, false).catch(() => {});
      }
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

    return () => {
      active = false;
      window.removeEventListener('beforeunload', handleCleanExit);
      if (initialParticipant.isHost) {
        updateHostPresence(roomId, false).catch(() => {});
      }
      if (liveKitManagerRef.current) {
        liveKitManagerRef.current.disconnect();
      }
      if (rtcManagerRef.current) {
        rtcManagerRef.current.leaveRoom();
      }
      clearInterval(timer);
      unsubSettings();
      unsubChat();
      unsubReactions();
    };
  }, [roomId, initialParticipant.id]);

  // Subscribe to waiting room for host
  useEffect(() => {
    if (!localParticipant.isHost) return;
    const unsub = subscribeToWaitingRoom(roomId, (list) => {
      setWaitingList(list);
    });
    return () => unsub();
  }, [roomId, localParticipant.isHost]);

  // Reset unread chat count when chat opens
  useEffect(() => {
    if (isChatOpen) {
      setUnreadChatCount(0);
    }
  }, [isChatOpen]);

  // Toggle Audio
  const handleToggleAudio = async () => {
    if (roomSettings.allowUnmute === false && !localParticipant.isHost && !localParticipant.audioEnabled) {
      alert('The host has disabled participants from unmuting.');
      return;
    }

    const nextState = !localParticipant.audioEnabled;

    // 1. Optimistic UI update (0ms instant feedback)
    setLocalParticipant((p) => ({ ...p, audioEnabled: nextState }));
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => (t.enabled = nextState));
      setLocalStream(new MediaStream(localStream.getTracks()));
    }

    try {
      if (isLiveKitSFU && liveKitManagerRef.current) {
        const updatedStream = await liveKitManagerRef.current.setAudioEnabled(nextState);
        if (updatedStream && updatedStream.getTracks().length > 0) {
          setLocalStream(new MediaStream(updatedStream.getTracks()));
        }
      } else {
        // WebRTC Mesh mode
        let activeStream = localStream;
        const liveAudioTrack = activeStream?.getAudioTracks().find((t) => t.readyState === 'live');

        if (nextState) {
          if (liveAudioTrack) {
            liveAudioTrack.enabled = true;
            setLocalStream(new MediaStream(activeStream!.getTracks()));
            rtcManagerRef.current?.setLocalStream(activeStream!);
          } else {
            try {
              const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
              const newAudioTrack = micStream.getAudioTracks()[0];
              if (newAudioTrack) {
                newAudioTrack.enabled = true;
                const tracks = activeStream ? activeStream.getTracks().filter((t) => t.kind !== 'audio') : [];
                tracks.push(newAudioTrack);
                const combinedStream = new MediaStream(tracks);
                setLocalStream(combinedStream);
                rtcManagerRef.current?.setLocalStream(combinedStream);
              }
            } catch (mediaErr) {
              console.warn('Microphone permission or device error:', mediaErr);
              setLocalParticipant((p) => ({ ...p, audioEnabled: false }));
              return;
            }
          }
        } else {
          if (liveAudioTrack) {
            liveAudioTrack.enabled = false;
            setLocalStream(new MediaStream(activeStream!.getTracks()));
            rtcManagerRef.current?.setLocalStream(activeStream!);
          }
        }
      }
      rtcManagerRef.current?.updateParticipantState({ audioEnabled: nextState });
    } catch (err) {
      console.warn('Microphone toggle warning:', err);
      // Revert if failed
      setLocalParticipant((p) => ({ ...p, audioEnabled: !nextState }));
    }
  };

  // Automatically turn on video if host forces cameras on
  useEffect(() => {
    if (roomSettings.requireVideo && !localParticipant.isHost && !localParticipant.videoEnabled) {
      const enableVideoAutomatically = async () => {
        try {
          setLocalParticipant((p) => ({ ...p, videoEnabled: true }));
          if (localStream) {
            localStream.getVideoTracks().forEach((t) => (t.enabled = true));
            setLocalStream(new MediaStream(localStream.getTracks()));
          }
          if (isLiveKitSFU && liveKitManagerRef.current) {
            const updatedStream = await liveKitManagerRef.current.setVideoEnabled(true);
            if (updatedStream && updatedStream.getTracks().length > 0) {
              setLocalStream(new MediaStream(updatedStream.getTracks()));
            }
          }
          rtcManagerRef.current?.updateParticipantState({ videoEnabled: true });
        } catch (err) {
          console.warn('Auto enable video failed:', err);
        }
      };
      enableVideoAutomatically();
    }
  }, [roomSettings.requireVideo, localParticipant.isHost, localParticipant.videoEnabled, isLiveKitSFU, localStream]);

  // Toggle Video
  const handleToggleVideo = async () => {
    if (roomSettings.requireVideo && !localParticipant.isHost && localParticipant.videoEnabled) {
      alert('The host (सभापति) requires all participants to keep their camera on.');
      return;
    }

    const nextState = !localParticipant.videoEnabled;

    // 1. Optimistic UI update (0ms instant feedback)
    setLocalParticipant((p) => ({ ...p, videoEnabled: nextState }));
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => (t.enabled = nextState));
      setLocalStream(new MediaStream(localStream.getTracks()));
    }

    try {
      if (isLiveKitSFU && liveKitManagerRef.current) {
        const updatedStream = await liveKitManagerRef.current.setVideoEnabled(nextState);
        if (updatedStream && updatedStream.getTracks().length > 0) {
          setLocalStream(new MediaStream(updatedStream.getTracks()));
        }
      } else {
        // WebRTC Mesh mode
        let activeStream = localStream;
        const liveVideoTrack = activeStream?.getVideoTracks().find((t) => t.readyState === 'live');

        if (nextState) {
          if (liveVideoTrack) {
            liveVideoTrack.enabled = true;
            setLocalStream(new MediaStream(activeStream!.getTracks()));
            activeCameraStreamRef.current = activeStream;
            rtcManagerRef.current?.setLocalStream(activeStream!);
          } else {
            try {
              const camStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 },
              });
              const newVideoTrack = camStream.getVideoTracks()[0];
              if (newVideoTrack) {
                newVideoTrack.enabled = true;
                const tracks = activeStream ? activeStream.getTracks().filter((t) => t.kind !== 'video') : [];
                tracks.push(newVideoTrack);
                const combinedStream = new MediaStream(tracks);
                setLocalStream(combinedStream);
                activeCameraStreamRef.current = combinedStream;
                rtcManagerRef.current?.setLocalStream(combinedStream);
              }
            } catch (mediaErr) {
              console.warn('Camera permission or device error:', mediaErr);
              setLocalParticipant((p) => ({ ...p, videoEnabled: false }));
              return;
            }
          }
        } else {
          if (liveVideoTrack) {
            liveVideoTrack.enabled = false;
            setLocalStream(new MediaStream(activeStream!.getTracks()));
            rtcManagerRef.current?.setLocalStream(activeStream!);
          }
        }
      }
      rtcManagerRef.current?.updateParticipantState({ videoEnabled: nextState });
    } catch (err) {
      console.warn('Camera toggle warning:', err);
      // Revert if failed
      setLocalParticipant((p) => ({ ...p, videoEnabled: !nextState }));
    }
  };

  // Toggle Screen Share
  const handleToggleScreenShare = async () => {
    if (roomSettings.allowScreenShare === false && !localParticipant.isHost && !localParticipant.screenSharing) {
      alert('The host has disabled screen sharing for participants.');
      return;
    }

    if (localParticipant.screenSharing) {
      // --- STOP SHARING ---
      if (isLiveKitSFU && liveKitManagerRef.current) {
        await liveKitManagerRef.current.setScreenShareEnabled(false);
      } else {
        rtcManagerRef.current?.setScreenStream(null);
      }
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
        setScreenStream(null);
      }
      setLocalParticipant((p) => ({ ...p, screenSharing: false }));
      rtcManagerRef.current?.updateParticipantState({ screenSharing: false });
    } else {
      // --- START SHARING ---
      try {
        if (isLiveKitSFU && liveKitManagerRef.current) {
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
          // WebRTC Mesh mode (direct browser getDisplayMedia)
          const stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
          });

          // Retain local camera stream intact - do not overwrite localStream!
          setScreenStream(stream);
          rtcManagerRef.current?.setScreenStream(stream);
          setLocalParticipant((p) => ({ ...p, screenSharing: true }));
          rtcManagerRef.current?.updateParticipantState({ screenSharing: true });

          // Browser native "Stop Sharing" floating bar handler
          const screenVideoTrack = stream.getVideoTracks()[0];
          if (screenVideoTrack) {
            screenVideoTrack.onended = () => {
              rtcManagerRef.current?.setScreenStream(null);
              setScreenStream(null);
              setLocalParticipant((p) => ({ ...p, screenSharing: false }));
              rtcManagerRef.current?.updateParticipantState({ screenSharing: false });
            };
          }
        }
      } catch (err) {
        console.warn('Screen share canceled or failed:', err);
      }
    }
  };

  // Broadcast Whiteboard stroke / clear
  const handleBroadcastDraw = (drawEvent: WhiteboardDrawEvent) => {
    if (isLiveKitSFU && liveKitManagerRef.current) {
      liveKitManagerRef.current.sendData({
        type: 'whiteboard',
        event: drawEvent,
      });
    } else {
      rtcManagerRef.current?.sendWhiteboardEvent(drawEvent);
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

  // Stop Recording helper
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn('Error stopping media recorder:', err);
      }
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingSeconds(0);
    setIsRecording(false);
  };

  // Toggle Recording: Open options modal or stop active recording
  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      setIsRecordModalOpen(true);
    }
  };

  // Start Recording with Web Audio API multi-channel audio mixing
  const handleStartRecording = async ({
    includeMic,
    includeParticipants,
  }: {
    includeMic: boolean;
    includeParticipants: boolean;
  }) => {
    try {
      // 1. Capture screen display (video & system audio)
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      recordingDisplayStreamRef.current = displayStream;

      const videoTrack = displayStream.getVideoTracks()[0];
      if (!videoTrack) {
        throw new Error('No video track available in display capture');
      }

      // 2. Set up AudioContext to mix all selected sources
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      recordingAudioContextRef.current = audioCtx;
      const destination = audioCtx.createMediaStreamDestination();

      let hasAnyAudio = false;

      // 2a. System audio from display capture
      const displayAudioTracks = displayStream.getAudioTracks();
      if (displayAudioTracks.length > 0) {
        try {
          const displayAudioStream = new MediaStream(displayAudioTracks);
          const displaySource = audioCtx.createMediaStreamSource(displayAudioStream);
          displaySource.connect(destination);
          hasAnyAudio = true;
        } catch (e) {
          console.warn('Failed to mix display audio:', e);
        }
      }

      // 2b. Microphone audio (own voice)
      let micStream: MediaStream | null = null;
      if (includeMic) {
        const existingAudioTrack = localStream?.getAudioTracks().find((t) => t.readyState === 'live');
        if (existingAudioTrack) {
          try {
            const micAudioStream = new MediaStream([existingAudioTrack]);
            const micSource = audioCtx.createMediaStreamSource(micAudioStream);
            micSource.connect(destination);
            hasAnyAudio = true;
          } catch (e) {
            console.warn('Failed to mix existing mic track:', e);
          }
        } else {
          try {
            micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            recordingMicStreamRef.current = micStream;
            const micSource = audioCtx.createMediaStreamSource(micStream);
            micSource.connect(destination);
            hasAnyAudio = true;
          } catch (err) {
            console.warn('Microphone capture failed or denied:', err);
          }
        }
      }

      // 2c. Remote participants audio
      if (includeParticipants) {
        remoteStreams.forEach((rStream) => {
          const remoteAudioTracks = rStream.getAudioTracks().filter((t) => t.readyState === 'live');
          if (remoteAudioTracks.length > 0) {
            try {
              const remoteAudioStream = new MediaStream(remoteAudioTracks);
              const remoteSource = audioCtx.createMediaStreamSource(remoteAudioStream);
              remoteSource.connect(destination);
              hasAnyAudio = true;
            } catch (e) {
              console.warn('Failed to mix remote audio:', e);
            }
          }
        });
      }

      // 3. Assemble combined tracks for MediaRecorder
      const combinedTracks: MediaStreamTrack[] = [videoTrack];
      if (hasAnyAudio) {
        const mixedAudioTrack = destination.stream.getAudioTracks()[0];
        if (mixedAudioTrack) {
          combinedTracks.push(mixedAudioTrack);
        }
      } else if (displayAudioTracks.length > 0) {
        combinedTracks.push(displayAudioTracks[0]);
      }

      const finalStream = new MediaStream(combinedTracks);

      // 4. Select best supported MIME type
      let mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8,opus';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/mp4';
      }

      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(finalStream, { mimeType });

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        // Stop all temporary capture tracks
        displayStream.getTracks().forEach((t) => t.stop());
        if (micStream) {
          micStream.getTracks().forEach((t) => t.stop());
          recordingMicStreamRef.current = null;
        }
        if (recordingAudioContextRef.current && recordingAudioContextRef.current.state !== 'closed') {
          recordingAudioContextRef.current.close().catch(() => {});
          recordingAudioContextRef.current = null;
        }
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        setRecordingSeconds(0);
        setIsRecording(false);

        // Download the recorded WebM file
        if (recordedChunksRef.current.length > 0) {
          const blob = new Blob(recordedChunksRef.current, { type: mimeType });
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
          }, 150);
        }
      };

      // Native browser "Stop sharing" floating bar handler
      videoTrack.onended = () => {
        stopRecording();
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      // Start recording timer
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Recording cancelled or failed:', err);
      setIsRecording(false);
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

  const handleAdmitWaiting = async (participantId: string) => {
    await admitParticipant(roomId, participantId);
  };

  const handleDenyWaiting = async (participantId: string) => {
    await denyParticipant(roomId, participantId);
  };

  const handleAdmitAllWaiting = async (participantIds: string[]) => {
    await admitAllParticipants(roomId, participantIds);
  };

  const handleEndMeetingForAll = async () => {
    setIsLeaveModalOpen(false);
    updateHostPresence(roomId, false).catch(() => {});
    // 1. Notify server with endForAll flag (closes LiveKit room and purges Firestore room participants)
    try {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const payload = JSON.stringify({ roomId, participantId: localParticipant.id, endForAll: true });
        navigator.sendBeacon('/api/room/leave', new Blob([payload], { type: 'application/json' }));
      } else {
        fetch('/api/room/leave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId, participantId: localParticipant.id, endForAll: true }),
        }).catch(() => {});
      }
    } catch {}

    // 2. Broadcast kick/end command to all peers
    try {
      await rtcManagerRef.current?.sendKickCommand('broadcast', 'meeting-ended');
      for (const p of remoteParticipants) {
        rtcManagerRef.current?.sendKickCommand(p.id, 'meeting-ended').catch(() => {});
      }
    } catch {}

    // 3. Disconnect local engines and navigate home
    if (liveKitManagerRef.current) {
      await liveKitManagerRef.current.disconnect().catch(() => {});
    }
    await rtcManagerRef.current?.leaveRoom().catch(() => {});
    router.push('/');
  };

  const handleLeaveMeeting = async () => {
    setIsLeaveModalOpen(false);
    if (localParticipant.isHost) {
      updateHostPresence(roomId, false).catch(() => {});
    }
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const payload = JSON.stringify({ roomId, participantId: localParticipant.id });
      navigator.sendBeacon('/api/room/leave', new Blob([payload], { type: 'application/json' }));
    } else {
      fetch('/api/room/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, participantId: localParticipant.id }),
      }).catch(() => {});
    }
    if (liveKitManagerRef.current) {
      await liveKitManagerRef.current.disconnect().catch(() => {});
    }
    await rtcManagerRef.current?.leaveRoom().catch(() => {});
    router.push('/');
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
      {/* Zoom-Style Top Header Bar */}
      <div className="h-14 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-2 sm:px-4 flex items-center justify-between z-30 select-none">
        {/* Left: Branding & Room Info */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 font-black text-sm flex items-center justify-center shadow-md shadow-amber-500/10">
            स
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="font-bold text-white text-sm hidden xs:inline">Sabha</span>
            <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-800/90 text-amber-400 font-mono border border-slate-700/50">
              {roomId}
            </span>
            {isLiveKitSFU && (
              <span className="hidden md:flex text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/30 items-center gap-1">
                <Zap className="w-3 h-3" /> SFU 100+
              </span>
            )}
            {roomSettings.isLocked && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Locked
              </span>
            )}
          </div>
        </div>

        {/* Center: Recording Indicator */}
        <div className="flex items-center gap-2">
          {isRecording && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-xs font-semibold text-rose-400 animate-pulse shadow-sm">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span className="font-mono">{formatDuration(recordingSeconds)}</span>
              <span className="hidden sm:inline text-[10px] text-rose-300 font-bold">REC</span>
            </div>
          )}
        </div>

        {/* Right: Zoom Header Suite (Shield + Timer + View Switcher + Invite) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Zoom Green Shield: Verified Encryption & Security Status */}
          <div className="relative" ref={meetingInfoRef}>
            <button
              onClick={() => setShowMeetingInfo(!showMeetingInfo)}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 transition cursor-pointer"
              title="Meeting Info & Security Details"
            >
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
              <span className="font-mono text-xs text-slate-300 font-medium hidden sm:inline">
                {formatDuration(duration)}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:inline" />
            </button>

            {/* Meeting Info Popover */}
            {showMeetingInfo && (
              <div className="absolute top-full right-0 mt-2 w-72 sm:w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-4 z-50 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Sabha Meeting Info</h4>
                    <p className="text-[10px] text-emerald-400 font-medium">End-to-end verified session</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Meeting ID</span>
                    <span className="font-mono text-slate-200 font-semibold">{roomId}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Host (सभापति)</span>
                    <span className="text-slate-200 truncate max-w-[140px]">{roomSettings.hostName || 'Host'}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Duration</span>
                    <span className="font-mono text-slate-200">{formatDuration(duration)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Network Engine</span>
                    <span className="text-amber-400 font-semibold">{isLiveKitSFU ? 'LiveKit SFU Mesh' : 'WebRTC Peer Mesh'}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                  <button
                    onClick={copyInviteLink}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center justify-center gap-1.5 transition border border-slate-700/60 cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMeetingInfo(false);
                      setIsShareModalOpen(true);
                    }}
                    className="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Invite</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          {/* Zoom View Dropdown: Speaker vs Gallery vs Multi-speaker (matching Image 3) */}
          <div className="relative" ref={viewMenuRef}>
            <button
              onClick={() => setShowViewMenu(!showViewMenu)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/60 transition cursor-pointer text-xs font-semibold"
              title="Change Meeting Layout (Speaker / Gallery)"
            >
              {viewMode === 'speaker' ? (
                <LayoutTemplate className="w-3.5 h-3.5 text-amber-400" />
              ) : viewMode === 'multi-speaker' ? (
                <Grid2X2 className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span className="hidden xs:inline">View</span>
            </button>

            {/* Dropdown Menu matching Image 3 */}
            {showViewMenu && (
              <div className="absolute top-full right-0 mt-2 w-48 sm:w-56 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl py-1.5 z-50 text-xs text-slate-200 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Speaker View */}
                <button
                  onClick={() => {
                    setViewMode('speaker');
                    setShowViewMenu(false);
                  }}
                  className={`w-full px-3 py-2.5 flex items-center justify-between hover:bg-slate-800/80 transition cursor-pointer ${
                    viewMode === 'speaker' ? 'text-amber-400 font-semibold' : 'text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-4 flex items-center justify-center">
                      {viewMode === 'speaker' && <Check className="w-3.5 h-3.5" />}
                    </span>
                    <span>Speaker</span>
                  </div>
                  <LayoutTemplate className="w-4 h-4 text-slate-400" />
                </button>

                {/* Gallery View */}
                <button
                  onClick={() => {
                    setViewMode('gallery');
                    setShowViewMenu(false);
                  }}
                  className={`w-full px-3 py-2.5 flex items-center justify-between hover:bg-slate-800/80 transition cursor-pointer ${
                    viewMode === 'gallery' ? 'text-amber-400 font-semibold' : 'text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-4 flex items-center justify-center">
                      {viewMode === 'gallery' && <Check className="w-3.5 h-3.5" />}
                    </span>
                    <span>Gallery</span>
                  </div>
                  <LayoutGrid className="w-4 h-4 text-slate-400" />
                </button>

                {/* Multi-speaker View */}
                <button
                  onClick={() => {
                    setViewMode('multi-speaker');
                    setShowViewMenu(false);
                  }}
                  className={`w-full px-3 py-2.5 flex items-center justify-between hover:bg-slate-800/80 transition cursor-pointer ${
                    viewMode === 'multi-speaker' ? 'text-amber-400 font-semibold' : 'text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-4 flex items-center justify-center">
                      {viewMode === 'multi-speaker' && <Check className="w-3.5 h-3.5" />}
                    </span>
                    <span>Multi-speaker</span>
                  </div>
                  <Grid2X2 className="w-4 h-4 text-slate-400" />
                </button>

                <div className="my-1 border-t border-slate-800" />

                {/* Fullscreen Toggle */}
                <button
                  onClick={handleToggleFullscreen}
                  className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-slate-800/80 transition cursor-pointer text-slate-300 hover:text-white"
                >
                  <div className="flex items-center gap-2 pl-6">
                    <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
                  </div>
                  {isFullscreen ? <Minimize className="w-4 h-4 text-slate-400" /> : <Maximize className="w-4 h-4 text-slate-400" />}
                </button>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          {/* Invite Button */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
            title="Invite participants"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Invite</span>
          </button>
        </div>
      </div>

      {/* Main Body: Video Grid + Side Panels */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Floating Host Knocking Notification Banner */}
        {localParticipant.isHost && (
          <WaitingRoomBanner
            waitingList={waitingList}
            onAdmit={handleAdmitWaiting}
            onDeny={handleDenyWaiting}
            onAdmitAll={handleAdmitAllWaiting}
            onOpenParticipants={() => {
              setIsParticipantsOpen(true);
              setIsChatOpen(false);
            }}
          />
        )}

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
          viewMode={viewMode}
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
          waitingList={waitingList}
          onAdmit={handleAdmitWaiting}
          onDeny={handleDenyWaiting}
          onAdmitAll={handleAdmitAllWaiting}
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
        screenSharing={localParticipant.screenSharing}
        isHandRaised={localParticipant.isHandRaised}
        isRecording={isRecording}
        participantCount={remoteParticipants.length + 1}
        waitingCount={waitingList.length}
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
        onLeaveMeeting={() => setIsLeaveModalOpen(true)}
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

      {/* Recording Audio Options Modal */}
      <RecordModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onStartRecording={handleStartRecording}
        isMicAvailable={Boolean(localStream?.getAudioTracks().length)}
      />

      {/* Leave / End Sabha Confirmation Modal */}
      <LeaveMeetingModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        isHost={localParticipant.isHost}
        onLeaveMeeting={handleLeaveMeeting}
        onEndMeetingForAll={handleEndMeetingForAll}
      />

      {/* Floating Emoji Reactions Layer */}
      <ReactionsOverlay latestReaction={latestReaction} />
    </div>
  );
}
