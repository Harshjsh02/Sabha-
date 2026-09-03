'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Participant } from '@/lib/types';
import { AudioActivityDetector } from '@/lib/audio';
import {
  Mic,
  MicOff,
  Pin,
  PinOff,
  Crown,
  Hand,
  MoreVertical,
  VolumeX,
  UserX,
  Maximize2,
} from 'lucide-react';

interface VideoTileProps {
  participant: Participant;
  stream: MediaStream | null;
  isLocal: boolean;
  isHostViewer: boolean;
  isPinned: boolean;
  onTogglePin: (id: string) => void;
  onMuteParticipant?: (id: string) => void;
  onKickParticipant?: (id: string) => void;
}

export function VideoTile({
  participant,
  stream,
  isLocal,
  isHostViewer,
  isPinned,
  onTogglePin,
  onMuteParticipant,
  onKickParticipant,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Attach stream to HTMLVideoElement
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, participant.videoEnabled]);

  // Active speaker detection
  useEffect(() => {
    if (!stream || !participant.audioEnabled) {
      setIsSpeaking(false);
      return;
    }

    const detector = new AudioActivityDetector(stream, (speaking) => {
      setIsSpeaking(speaking);
    });

    return () => {
      detector.destroy();
    };
  }, [stream, participant.audioEnabled]);

  const initials = participant.name
    ? participant.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <div
      className={`relative w-full h-full min-h-[180px] bg-slate-900/90 rounded-2xl overflow-hidden border transition-all duration-300 flex items-center justify-center group ${
        isSpeaking
          ? 'border-emerald-500 ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-500/10'
          : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Video Stream */}
      {participant.videoEnabled && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        /* Avatar Fallback */
        <div className="flex flex-col items-center justify-center p-4">
          <div className="relative">
            {participant.photoURL ? (
              <img
                src={participant.photoURL}
                alt={participant.name}
                className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover ring-4 ring-slate-800"
              />
            ) : (
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center text-amber-400 font-bold text-2xl md:text-3xl ring-4 ring-slate-800/80 shadow-inner">
                {initials}
              </div>
            )}
            {isSpeaking && (
              <span className="absolute inset-0 rounded-full ring-4 ring-emerald-400/80 animate-ping pointer-events-none" />
            )}
          </div>
        </div>
      )}

      {/* Top badges: Hand Raise & Pin */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        <div className="flex items-center gap-2 pointer-events-auto">
          {participant.isHandRaised && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 font-bold text-xs shadow-lg animate-bounce">
              <Hand className="w-3.5 h-3.5 fill-current" />
              <span>Raised</span>
            </div>
          )}
          {participant.isHost && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[11px] font-semibold backdrop-blur-sm">
              <Crown className="w-3 h-3 fill-current" />
              <span>सभापति</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
          <button
            onClick={() => onTogglePin(participant.id)}
            className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white backdrop-blur-sm border border-slate-700/50 transition"
            title={isPinned ? 'Unpin' : 'Pin to main stage'}
          >
            {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </button>

          {isHostViewer && !isLocal && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white backdrop-blur-sm border border-slate-700/50 transition"
                title="Host Actions"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 text-xs text-slate-200 z-50">
                  {onMuteParticipant && (
                    <button
                      onClick={() => {
                        onMuteParticipant(participant.id);
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2 text-slate-300 hover:text-white"
                    >
                      <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                      Mute Audio
                    </button>
                  )}
                  {onKickParticipant && (
                    <button
                      onClick={() => {
                        onKickParticipant(participant.id);
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-rose-500/10 flex items-center gap-2 text-rose-400"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      Remove from Sabha
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Name & Mic status bar */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/70 backdrop-blur-md border border-slate-800/80 text-white text-xs font-medium max-w-[80%] truncate">
          <span className="truncate">{participant.name} {isLocal && '(You)'}</span>
        </div>

        <div
          className={`p-1.5 rounded-lg backdrop-blur-md border text-xs ${
            participant.audioEnabled
              ? isSpeaking
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-950/70 border-slate-800/80 text-slate-300'
              : 'bg-rose-500/20 border-rose-500/40 text-rose-400'
          }`}
        >
          {participant.audioEnabled ? (
            <Mic className="w-3.5 h-3.5" />
          ) : (
            <MicOff className="w-3.5 h-3.5" />
          )}
        </div>
      </div>
    </div>
  );
}
