'use client';

import React from 'react';
import { RoomSettings } from '@/lib/types';
import { X, Shield, Lock, Unlock, Monitor, MessageSquare, Mic, AlertTriangle } from 'lucide-react';

interface HostControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomSettings: RoomSettings;
  onUpdateSettings: (updates: Partial<RoomSettings>) => void;
  onEndMeetingForAll: () => void;
}

export function HostControlModal({
  isOpen,
  onClose,
  roomSettings,
  onUpdateSettings,
  onEndMeetingForAll,
}: HostControlModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Host & Security Controls</h2>
            <p className="text-xs text-slate-400">Manage Sabha permissions and access</p>
          </div>
        </div>

        <div className="space-y-4 text-sm">
          {/* Lock Sabha */}
          <div className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-3">
              {roomSettings.isLocked ? (
                <Lock className="w-5 h-5 text-rose-400" />
              ) : (
                <Unlock className="w-5 h-5 text-emerald-400" />
              )}
              <div>
                <p className="font-semibold text-xs text-white">Lock Sabha Assembly</p>
                <p className="text-[11px] text-slate-400">
                  {roomSettings.isLocked
                    ? 'No new participants can join this meeting'
                    : 'Open for invited members to join'}
                </p>
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ isLocked: !roomSettings.isLocked })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                roomSettings.isLocked
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              {roomSettings.isLocked ? 'Unlock' : 'Lock'}
            </button>
          </div>

          {/* Participant permissions section */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Allow Participants To:
            </p>
            <div className="bg-slate-950/40 border border-slate-800 rounded-xl divide-y divide-slate-800/60">
              {/* Screen share */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2.5 text-xs text-slate-200">
                  <Monitor className="w-4 h-4 text-slate-400" />
                  <span>Share Screen</span>
                </div>
                <input
                  type="checkbox"
                  checked={roomSettings.allowScreenShare}
                  onChange={(e) => onUpdateSettings({ allowScreenShare: e.target.checked })}
                  className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Chat */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2.5 text-xs text-slate-200">
                  <MessageSquare className="w-4 h-4 text-slate-400" />
                  <span>Send Chat Messages</span>
                </div>
                <input
                  type="checkbox"
                  checked={roomSettings.allowChat}
                  onChange={(e) => onUpdateSettings({ allowChat: e.target.checked })}
                  className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Unmute themselves */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2.5 text-xs text-slate-200">
                  <Mic className="w-4 h-4 text-slate-400" />
                  <span>Unmute Themselves</span>
                </div>
                <input
                  type="checkbox"
                  checked={roomSettings.allowUnmute}
                  onChange={(e) => onUpdateSettings({ allowUnmute: e.target.checked })}
                  className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* End Sabha for all */}
          <div className="pt-2">
            <button
              onClick={() => {
                if (confirm('Are you sure you want to end this Sabha for all participants?')) {
                  onEndMeetingForAll();
                }
              }}
              className="w-full py-2.5 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/30 font-semibold text-xs transition flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>End Sabha for Everyone</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
