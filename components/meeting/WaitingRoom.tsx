'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Clock,
  ShieldAlert,
  Sparkles,
  PhoneOff,
  Loader2,
  Users,
} from 'lucide-react';
import { Participant, RoomSettings } from '@/lib/types';
import {
  subscribeToWaitingStatus,
  subscribeToRoomSettings,
  leaveWaitingRoom,
} from '@/lib/roomService';

interface WaitingRoomProps {
  roomId: string;
  participant: Participant;
  stream: MediaStream | null;
  onAdmitted: () => void;
  onLeave: () => void;
}

export function WaitingRoom({
  roomId,
  participant,
  stream,
  onAdmitted,
  onLeave,
}: WaitingRoomProps) {
  const router = useRouter();
  const [roomSettings, setRoomSettings] = useState<RoomSettings | null>(null);
  const [status, setStatus] = useState<'waiting' | 'admitted' | 'denied'>('waiting');
  const [audioEnabled, setAudioEnabled] = useState(participant.audioEnabled);
  const [videoEnabled, setVideoEnabled] = useState(participant.videoEnabled);
  const [volumeLevel, setVolumeLevel] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // 1. Subscribe to Room Settings to detect when host enters
  useEffect(() => {
    const unsub = subscribeToRoomSettings(roomId, (settings) => {
      setRoomSettings(settings);
      // If host turned off waiting room, automatically admit
      if (settings && settings.waitingRoomEnabled === false && settings.hostJoined) {
        onAdmitted();
      }
    });
    return () => unsub();
  }, [roomId, onAdmitted]);

  // 2. Subscribe to Waiting Status ('waiting' -> 'admitted' -> 'denied')
  useEffect(() => {
    const unsub = subscribeToWaitingStatus(roomId, participant.id, (newStatus) => {
      setStatus(newStatus);
      if (newStatus === 'admitted') {
        onAdmitted();
      }
    });

    return () => {
      unsub();
    };
  }, [roomId, participant.id, onAdmitted]);

  // 3. Audio analyzer for local microphone preview
  useEffect(() => {
    if (!stream) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      try {
        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;

        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateVolume = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setVolumeLevel(Math.min(100, Math.round((avg / 128) * 100)));
          animFrameRef.current = requestAnimationFrame(updateVolume);
        };
        updateVolume();
      } catch (err) {
        console.warn('Audio analyzer error in WaitingRoom:', err);
      }
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [stream]);

  // 4. Mount video preview
  useEffect(() => {
    if (videoRef.current && stream && videoEnabled) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream, videoEnabled]);

  // Toggle Audio
  const handleToggleAudio = () => {
    if (stream) {
      stream.getAudioTracks().forEach((t) => (t.enabled = !audioEnabled));
    }
    setAudioEnabled(!audioEnabled);
  };

  // Toggle Video
  const handleToggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach((t) => (t.enabled = !videoEnabled));
    }
    setVideoEnabled(!videoEnabled);
  };

  const handleCancelWait = async () => {
    await leaveWaitingRoom(roomId, participant.id);
    onLeave();
  };

  const isHostInside = Boolean(roomSettings?.hostJoined);
  const hostName = roomSettings?.hostName || 'The Host';

  // If host denied entry
  if (status === 'denied') {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-slate-950 text-slate-100">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-5">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Entry Denied</h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            The host has declined your request to join this Sabha assembly.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Camera Preview Tile */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="relative w-full aspect-video bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center group">
            {/* Camera Video Stream */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover scale-x-[-1] ${
                videoEnabled && stream ? 'block' : 'hidden'
              }`}
            />

            {/* Avatar Fallback */}
            {(!videoEnabled || !stream) && (
              <div className="flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-2xl font-bold text-slate-400 mb-3">
                  {participant.name ? participant.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <p className="text-xs font-medium text-slate-400">
                  {!stream ? 'Camera unavailable' : 'Camera is turned off'}
                </p>
              </div>
            )}

            {/* Mic Volume Level Bar */}
            {audioEnabled && (
              <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/70 backdrop-blur-md border border-slate-800/80">
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
                <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-75"
                    style={{ width: `${volumeLevel}%` }}
                  />
                </div>
              </div>
            )}

            {/* Floating Camera & Mic Toggles */}
            <div className="absolute bottom-4 flex items-center gap-3">
              <button
                type="button"
                onClick={handleToggleAudio}
                className={`p-3 rounded-2xl transition backdrop-blur-md border cursor-pointer ${
                  audioEnabled
                    ? 'bg-slate-900/80 hover:bg-slate-800 text-white border-slate-700/60 shadow-lg'
                    : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 shadow-lg'
                }`}
                title={audioEnabled ? 'Mute Mic' : 'Unmute Mic'}
              >
                {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={handleToggleVideo}
                className={`p-3 rounded-2xl transition backdrop-blur-md border cursor-pointer ${
                  videoEnabled
                    ? 'bg-slate-900/80 hover:bg-slate-800 text-white border-slate-700/60 shadow-lg'
                    : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 shadow-lg'
                }`}
                title={videoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
              >
                {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">You can adjust your audio & video while you wait</p>
        </div>

        {/* Right Column: Waiting Room Card */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            {/* Status Icon Badge */}
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-2xl">
                {isHostInside ? (
                  <Sparkles className="w-6 h-6 animate-pulse text-amber-400" />
                ) : (
                  <Clock className="w-6 h-6 animate-pulse text-amber-400" />
                )}
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                  Waiting Room
                </span>
                <h1 className="text-xl font-bold text-white leading-snug">
                  {isHostInside
                    ? 'The host will let you in soon'
                    : 'Waiting for the host to join'}
                </h1>
              </div>
            </div>

            {/* Description Card */}
            <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl mb-6">
              <div className="flex items-center gap-2.5 mb-2 text-xs text-slate-300 font-medium">
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin flex-shrink-0" />
                <span>
                  {isHostInside
                    ? `We've let ${hostName} know you're waiting.`
                    : 'The meeting will start once the host arrives.'}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isHostInside
                  ? 'Please remain on this screen. You will enter the meeting room automatically as soon as the host admits you.'
                  : `You are connected to Sabha ${roomId}. As soon as the host starts the meeting, they will be prompted to admit you.`}
              </p>
            </div>

            {/* User Profile Card */}
            <div className="flex items-center justify-between p-3.5 bg-slate-950/40 border border-slate-800/60 rounded-xl mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-amber-400 text-sm">
                  {participant.name ? participant.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <span className="block text-xs font-semibold text-white">{participant.name}</span>
                  <span className="block text-[10px] text-slate-400">Knocking as Attendee</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Connected</span>
              </div>
            </div>

            {/* Action Buttons */}
            <button
              onClick={handleCancelWait}
              className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-rose-600/20 hover:text-rose-400 hover:border-rose-500/30 text-slate-300 border border-slate-700 font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <PhoneOff className="w-4 h-4" />
              <span>Leave Waiting Room</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
