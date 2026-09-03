'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, LogIn, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/authContext';

interface GreenRoomProps {
  roomId: string;
  initialName: string;
  onJoin: (name: string, audioEnabled: boolean, videoEnabled: boolean, stream: MediaStream | null) => void;
}

export function GreenRoom({ roomId, initialName, onJoin }: GreenRoomProps) {
  const { user, signInWithGoogle } = useAuth();
  const [name, setName] = useState(initialName || user?.displayName || '');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Update name if user logs in
  useEffect(() => {
    if (user?.displayName && !name) {
      setName(user.displayName);
    }
  }, [user]);

  // Request initial media stream
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
        console.warn('Could not acquire user media preview:', err);
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
    if (!name.trim()) return;

    // Stop the preview audio context analyzer so it doesn't collide with in-meeting context
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }

    onJoin(name.trim(), audioEnabled, videoEnabled, stream);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: Camera Preview Tile */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="relative w-full aspect-video bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center group">
            {videoEnabled && stream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-2xl font-bold text-slate-400 mb-3">
                  {name ? name.charAt(0).toUpperCase() : 'U'}
                </div>
                <p className="text-xs font-medium text-slate-400">Camera is turned off</p>
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

          <form onSubmit={handleJoinClick} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Your Display Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Harshita Sharma"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {!user && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-2 transition"
                >
                  <LogIn className="w-4 h-4 text-amber-400" />
                  <span>Sign in with Google (Optional)</span>
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition transform active:scale-98"
            >
              <span>Join Sabha Meeting</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
