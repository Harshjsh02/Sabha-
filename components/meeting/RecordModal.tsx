'use client';

import React, { useState } from 'react';
import { X, Mic, Users, Monitor, CircleDot, Info } from 'lucide-react';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartRecording: (options: { includeMic: boolean; includeParticipants: boolean }) => void;
  isMicAvailable: boolean;
}

export function RecordModal({
  isOpen,
  onClose,
  onStartRecording,
  isMicAvailable,
}: RecordModalProps) {
  const [includeMic, setIncludeMic] = useState(true);
  const [includeParticipants, setIncludeParticipants] = useState(true);

  if (!isOpen) return null;

  const handleStart = () => {
    onStartRecording({
      includeMic,
      includeParticipants,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <CircleDot className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Record Sabha Meeting</h3>
              <p className="text-xs text-slate-400">Save recording directly to your device</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options Body */}
        <div className="p-5 space-y-4">
          {/* Screen Video (Always on) */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
                <Monitor className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Screen & Display Video</p>
                <p className="text-xs text-slate-400">Full screen, window, or specific browser tab</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              Active
            </span>
          </div>

          {/* Option: Include Microphone (Your Voice) */}
          <label className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-slate-700 transition">
            <div className="flex items-center gap-3 pr-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                includeMic ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-400'
              }`}>
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Record My Voice (Microphone)</p>
                <p className="text-xs text-slate-400">
                  Mixes your microphone audio so your speech is clearly captured
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={includeMic}
              onChange={(e) => setIncludeMic(e.target.checked)}
              className="w-5 h-5 rounded text-amber-500 focus:ring-amber-400 bg-slate-800 border-slate-700 cursor-pointer accent-amber-500"
            />
          </label>

          {/* Option: Include Other Participants */}
          <label className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-slate-700 transition">
            <div className="flex items-center gap-3 pr-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                includeParticipants ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
              }`}>
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Record Sabha Participants</p>
                <p className="text-xs text-slate-400">Captures voices of other members speaking in this room</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={includeParticipants}
              onChange={(e) => setIncludeParticipants(e.target.checked)}
              className="w-5 h-5 rounded text-amber-500 focus:ring-amber-400 bg-slate-800 border-slate-700 cursor-pointer accent-amber-500"
            />
          </label>

          {/* Browser System Audio Tip */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200/90 leading-relaxed">
              <strong className="text-amber-300">Tip:</strong> When the browser screen picker dialog opens, make sure to check <span className="underline decoration-amber-400 font-semibold">&ldquo;Also share system audio&rdquo;</span> to include tab or computer audio.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-600/30 flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <CircleDot className="w-4 h-4" />
            <span>Start Recording</span>
          </button>
        </div>
      </div>
    </div>
  );
}
