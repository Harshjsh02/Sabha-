'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, LogIn, ArrowRight, ShieldCheck, Lock } from 'lucide-react';
import { useAuth } from '@/lib/authContext';

interface GreenRoomProps {
  roomId: string;
  initialName: string;
  onJoin: (name: string, audioEnabled: boolean, videoEnabled: boolean, stream: MediaStream | null) => void;
}

export function GreenRoom({ roomId, onJoin }: GreenRoomProps) {
  const { user, signInWithGoogle, loading } = useAuth();
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Request initial media stream for preview
  useEffect(() => {
    let localStream: MediaStream | null = null;

    async function initMedia() {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });

        setStream(localStream);

        if (videoRef.current) {
          videoRef.current.srcObject = localStream;
        }

        // Setup audio visualizer
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          audioContextRef.current = ctx;
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          analyserRef.current = analyser;

          const source = ctx.createMediaStreamSource(localStream);
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
        }
      } catch (err) {
        console.warn('Could not acquire user media preview in GreenRoom:', err);
      }
    }

    initMedia();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Ensure camera preview stream is attached and playing
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (stream && videoEnabled) {
      if (videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
      }
      videoEl.play().catch((err) => {
        console.warn('GreenRoom video playback warning:', err);
      });
    }
  }, [stream, videoEnabled]);

  // Handle toggles
  const handleToggleAudio = () => {
    if (stream) {
      stream.getAudioTracks().forEach((t) => (t.enabled = !audioEnabled));
    }
    setAudioEnabled(!audioEnabled);
  };

  const handleToggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach((t) => (t.enabled = !videoEnabled));
    }
    setVideoEnabled(!videoEnabled);
  };

  const handleJoinClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.displayName) {
      alert('Please sign in with Google to join the meeting.');
      return;
    }

    // Stop the preview audio context analyzer so it doesn't collide with in-meeting context
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }

    // Stop the preview tracks to free the mic/cam hardware locks for the meeting room
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    onJoin(user.displayName, audioEnabled, videoEnabled, null);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: Camera Preview Tile */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="relative w-full aspect-video bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center group">
            {/* Camera Video Stream (Always mounted for instant stream play) */}
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
                  {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
                <p className="text-xs font-medium text-slate-400">
                  {!stream ? 'Starting camera...' : 'Camera is turned off'}
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

            {/* Floating Camera & Mic toggles */}
            <div className="absolute bottom-4 flex items-center gap-3">
              <button
                type="button"
                onClick={handleToggleAudio}
                className={`p-3 rounded-2xl transition backdrop-blur-md border ${
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
                className={`p-3 rounded-2xl transition backdrop-blur-md border ${
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
        </div>

        {/* Right: Join Configuration Form */}
        <div className="lg:col-span-5 bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100">
          <div className="mb-6">
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
              सभा Green Room
            </span>
            <h2 className="text-2xl font-bold mt-2 tracking-tight">Ready to join?</h2>
            <p className="text-xs text-slate-400 mt-1">
              Room Code: <span className="font-mono text-amber-400 font-semibold">{roomId}</span>
            </p>
          </div>

          {!user ? (
            /* Login Mandatory Card */
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
                <Lock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-200 text-sm">Google Login Required</p>
                  <p className="mt-1 text-slate-300 leading-relaxed">
                    To prevent impersonation and keep meetings safe, all participants must sign in with Google before entering Sabha.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm flex items-center justify-center gap-3 transition shadow-xl"
              >
                <LogIn className="w-4 h-4 text-slate-900" />
                <span>Sign in with Google to Enter</span>
              </button>
            </div>
          ) : (
            /* Verified User Profile Card */
            <form onSubmit={handleJoinClick} className="space-y-5">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-medium text-slate-400">Authenticated Identity</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3" /> Verified Google ID
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName}
                      className="w-10 h-10 rounded-full border border-amber-500/40 object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm border border-amber-500/30">
                      {user.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate">{user.displayName}</p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition transform active:scale-98 cursor-pointer"
              >
                <span>Join Sabha Meeting</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
