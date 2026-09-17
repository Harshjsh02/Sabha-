'use client';

import React, { useEffect } from 'react';
import { PhoneOff, LogOut, Users, X, AlertTriangle } from 'lucide-react';

interface LeaveMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  isHost: boolean;
  onLeaveMeeting: () => void;
  onEndMeetingForAll: () => void;
}

export function LeaveMeetingModal({
  isOpen,
  onClose,
  isHost,
  onLeaveMeeting,
  onEndMeetingForAll,
}: LeaveMeetingModalProps) {
  // Listen for Escape key to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close icon */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          title="Cancel"
        >
          <X className="w-5 h-5" />
        </button>

        {isHost ? (
          /* Host Options: End for All vs Leave */
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-rose-500/15 text-rose-400 border border-rose-500/30 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">End or Leave Sabha?</h2>
                <p className="text-xs text-slate-400">You are the host of this assembly</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              If you leave without ending the meeting, other participants can remain and continue talking. Or you can end the Sabha for everyone.
            </p>

            <div className="space-y-2.5">
              {/* End Sabha for All */}
              <button
                onClick={() => {
                  onEndMeetingForAll();
                  onClose();
                }}
                className="w-full p-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm transition shadow-lg shadow-rose-600/25 flex items-center justify-between group cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="p-2 bg-white/10 rounded-lg group-hover:scale-110 transition-transform">
                    <PhoneOff className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <span className="block text-sm font-semibold">End Sabha for All</span>
                    <span className="block text-[11px] text-rose-100/80 font-normal">
                      Disconnect all participants & close room
                    </span>
                  </div>
                </div>
                <Users className="w-4 h-4 text-rose-200" />
              </button>

              {/* Leave Meeting Only */}
              <button
                onClick={() => {
                  onLeaveMeeting();
                  onClose();
                }}
                className="w-full p-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-200 font-semibold text-sm transition flex items-center justify-between group cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="p-2 bg-slate-700/50 rounded-lg group-hover:scale-110 transition-transform">
                    <LogOut className="w-4 h-4 text-slate-300" />
                  </div>
                  <div>
                    <span className="block text-sm font-semibold">Leave Sabha</span>
                    <span className="block text-[11px] text-slate-400 font-normal">
                      Leave by yourself; others remain connected
                    </span>
                  </div>
                </div>
              </button>

              {/* Cancel */}
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 font-medium text-xs transition cursor-pointer mt-1"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* Attendee Options: Leave vs Cancel */
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-rose-500/15 text-rose-400 border border-rose-500/30 rounded-2xl">
                <PhoneOff className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Leave Sabha?</h2>
                <p className="text-xs text-slate-400">Exit current meeting</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Are you sure you want to leave this Sabha? You can rejoin anytime using the meeting link or ID.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition cursor-pointer"
              >
                Stay in Meeting
              </button>
              <button
                onClick={() => {
                  onLeaveMeeting();
                  onClose();
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <LogOut className="w-4 h-4" />
                <span>Leave Sabha</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
