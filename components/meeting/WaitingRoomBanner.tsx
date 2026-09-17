'use client';

import React, { useEffect, useRef } from 'react';
import { Users, Check, X, Bell } from 'lucide-react';
import { WaitingParticipant } from '@/lib/types';

interface WaitingRoomBannerProps {
  waitingList: WaitingParticipant[];
  onAdmit: (participantId: string) => void;
  onDeny: (participantId: string) => void;
  onAdmitAll: (participantIds: string[]) => void;
  onOpenParticipants: () => void;
}

export function WaitingRoomBanner({
  waitingList,
  onAdmit,
  onDeny,
  onAdmitAll,
  onOpenParticipants,
}: WaitingRoomBannerProps) {
  const prevCountRef = useRef(waitingList.length);

  // Play a gentle synth chime when someone enters the waiting room
  useEffect(() => {
    if (waitingList.length > prevCountRef.current) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
          osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5

          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.4);
          setTimeout(() => ctx.close().catch(() => {}), 500);
        }
      } catch {}
    }
    prevCountRef.current = waitingList.length;
  }, [waitingList.length]);

  if (waitingList.length === 0) return null;

  // Multiple people waiting
  if (waitingList.length > 1) {
    return (
      <div className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4 pointer-events-auto animate-in slide-in-from-top-4 duration-200">
        <div className="bg-slate-900/95 backdrop-blur-md border border-amber-500/40 rounded-2xl p-3 sm:p-4 shadow-2xl flex items-center justify-between gap-3 text-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex-shrink-0 animate-pulse">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-white truncate">
                  {waitingList.length} people are waiting
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                  Knocking
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {waitingList.map((p) => p.name).slice(0, 3).join(', ')}
                {waitingList.length > 3 ? ` and ${waitingList.length - 3} others` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onOpenParticipants}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
            >
              View
            </button>
            <button
              onClick={() => onAdmitAll(waitingList.map((p) => p.id))}
              className="px-3 sm:px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Admit All</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Single person waiting
  const single = waitingList[0];
  return (
    <div className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4 pointer-events-auto animate-in slide-in-from-top-4 duration-200">
      <div className="bg-slate-900/95 backdrop-blur-md border border-amber-500/40 rounded-2xl p-3 sm:p-4 shadow-2xl flex items-center justify-between gap-3 text-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
            {single.name ? single.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="min-w-0">
            <span className="block text-xs sm:text-sm font-bold text-white truncate">
              {single.name}
            </span>
            <span className="block text-[10px] text-amber-300/90 font-medium">
              Wants to join this Sabha
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onDeny(single.id)}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-600/20 hover:text-rose-400 hover:border-rose-500/30 text-slate-300 text-xs font-semibold border border-slate-700 transition cursor-pointer"
            title="Deny entry"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onAdmit(single.id)}
            className="px-3 sm:px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-600/30 flex items-center gap-1 cursor-pointer active:scale-95"
            title="Admit to meeting"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Admit</span>
          </button>
        </div>
      </div>
    </div>
  );
}
