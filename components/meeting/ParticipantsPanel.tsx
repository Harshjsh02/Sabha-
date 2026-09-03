'use client';

import React from 'react';
import { Participant } from '@/lib/types';
import {
  X,
  Users,
  Crown,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Hand,
  VolumeX,
  UserX,
  Lock,
  Unlock,
} from 'lucide-react';

interface ParticipantsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  participants: Participant[];
  currentUserId: string;
  isHost: boolean;
  isLocked: boolean;
  onMuteAll: () => void;
  onMuteParticipant: (id: string) => void;
  onKickParticipant: (id: string) => void;
  onToggleLock: () => void;
}

export function ParticipantsPanel({
  isOpen,
  onClose,
  participants,
  currentUserId,
  isHost,
  isLocked,
  onMuteAll,
  onMuteParticipant,
  onKickParticipant,
  onToggleLock,
}: ParticipantsPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="w-80 md:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full z-40 text-slate-100 shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-sm">
            Participants ({participants.length})
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Host Quick Admin Bar */}
      {isHost && (
        <div className="p-3 bg-slate-950/40 border-b border-slate-800 flex items-center gap-2">
          <button
            onClick={onMuteAll}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold border border-slate-700 transition"
          >
            <VolumeX className="w-3.5 h-3.5" />
            <span>Mute All</span>
          </button>

          <button
            onClick={onToggleLock}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold border transition ${
              isLocked
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            <span>{isLocked ? 'Locked' : 'Lock Room'}</span>
          </button>
        </div>
      )}

      {/* Participant Roster */}
      <div className="flex-1 p-3 overflow-y-auto space-y-1 divide-y divide-slate-800/40">
        {participants.map((p) => {
          const isMe = p.id === currentUserId;
          const initials = p.name
            ? p.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()
            : 'U';

          return (
            <div
              key={p.id}
              className="py-2.5 px-2 rounded-xl hover:bg-slate-800/50 flex items-center justify-between group transition"
            >
              {/* Left: Avatar & Name */}
              <div className="flex items-center gap-3 min-w-0 pr-2">
                {p.photoURL ? (
                  <img
                    src={p.photoURL}
                    alt={p.name}
                    className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-700"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-amber-400 text-xs font-bold flex items-center justify-center ring-1 ring-slate-700">
                    {initials}
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-200 truncate">
                      {p.name} {isMe && '(You)'}
                    </span>
                    {p.isHost && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30">
                        <Crown className="w-2.5 h-2.5" /> Host
                      </span>
                    )}
                  </div>
                  {p.isHandRaised && (
                    <div className="flex items-center gap-1 text-[10px] text-amber-400 font-medium">
                      <Hand className="w-3 h-3" /> Hand raised
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Audio/Video status & Host Controls */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div
                  className={`p-1 rounded ${
                    p.audioEnabled ? 'text-slate-400' : 'text-rose-400 bg-rose-500/10'
                  }`}
                  title={p.audioEnabled ? 'Mic Active' : 'Mic Muted'}
                >
                  {p.audioEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                </div>

                <div
                  className={`p-1 rounded ${
                    p.videoEnabled ? 'text-slate-400' : 'text-slate-600'
                  }`}
                  title={p.videoEnabled ? 'Camera On' : 'Camera Off'}
                >
                  {p.videoEnabled ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                </div>

                {isHost && !isMe && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-1 border-l border-slate-800">
                    <button
                      onClick={() => onMuteParticipant(p.id)}
                      className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-amber-400 transition"
                      title="Mute Participant"
                    >
                      <VolumeX className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onKickParticipant(p.id)}
                      className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                      title="Remove from Sabha"
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
