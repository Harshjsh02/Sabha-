'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  Users,
  MessageSquare,
  Smile,
  Shield,
  Hand,
  PhoneOff,
  PenTool,
  CircleDot,
} from 'lucide-react';

interface MeetingControlsProps {
  isHost: boolean;
  isCoHost?: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isTogglingAudio?: boolean;
  isTogglingVideo?: boolean;
  screenSharing: boolean;
  isHandRaised: boolean;
  isRecording: boolean;
  participantCount: number;
  waitingCount?: number;
  unreadChatCount: number;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleHandRaise: () => void;
  onToggleRecording: () => void;
  onToggleParticipantsPanel: () => void;
  onToggleChatPanel: () => void;
  isWhiteboardOpen: boolean;
  onToggleWhiteboard: () => void;
  onOpenSecurityModal: () => void;
  onSendReaction: (emoji: string) => void;
  onLeaveMeeting: () => void;
}

export function MeetingControls({
  isHost,
  isCoHost = false,
  audioEnabled,
  videoEnabled,
  isTogglingAudio = false,
  isTogglingVideo = false,
  screenSharing,
  isHandRaised,
  isRecording,
  participantCount,
  waitingCount = 0,
  unreadChatCount,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleHandRaise,
  onToggleRecording,
  onToggleParticipantsPanel,
  onToggleChatPanel,
  isWhiteboardOpen,
  onToggleWhiteboard,
  onOpenSecurityModal,
  onSendReaction,
  onLeaveMeeting,
}: MeetingControlsProps) {
  const [showReactionsMenu, setShowReactionsMenu] = useState(false);
  const reactionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (reactionsRef.current && !reactionsRef.current.contains(e.target as Node)) {
        setShowReactionsMenu(false);
      }
    }
    if (showReactionsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showReactionsMenu]);

  const emojis = ['👍', '❤️', '👏', '😂', '🎉', '🚀'];

  return (
    <div className="h-16 sm:h-20 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 px-2 sm:px-4 flex items-center justify-between z-30 select-none pb-safe">
      {/* Left section: Audio & Video */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Microphone Toggle */}
        <button
          onClick={onToggleAudio}
          className={`flex flex-col items-center justify-center w-11 h-11 sm:w-14 sm:h-14 rounded-xl transition cursor-pointer ${
            audioEnabled
              ? 'text-slate-200 hover:bg-slate-800/80 active:scale-95'
              : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 active:scale-95'
          }`}
          title={audioEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
        >
          {audioEnabled ? (
            <Mic className="w-4 h-4 sm:w-5 sm:h-5 sm:mb-1" />
          ) : (
            <MicOff className="w-4 h-4 sm:w-5 sm:h-5 sm:mb-1" />
          )}
          <span className="text-[9px] sm:text-[10px] font-medium hidden xs:inline">
            {audioEnabled ? 'Mute' : 'Unmute'}
          </span>
        </button>

        {/* Video Toggle */}
        <button
          onClick={onToggleVideo}
          className={`flex flex-col items-center justify-center w-11 h-11 sm:w-14 sm:h-14 rounded-xl transition cursor-pointer ${
            videoEnabled
              ? 'text-slate-200 hover:bg-slate-800/80 active:scale-95'
              : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 active:scale-95'
          }`}
          title={videoEnabled ? 'Stop Video' : 'Start Video'}
        >
          {videoEnabled ? (
            <Video className="w-4 h-4 sm:w-5 sm:h-5 sm:mb-1" />
          ) : (
            <VideoOff className="w-4 h-4 sm:w-5 sm:h-5 sm:mb-1" />
          )}
          <span className="text-[9px] sm:text-[10px] font-medium hidden xs:inline">
            {videoEnabled ? 'Stop' : 'Start'}
          </span>
        </button>
      </div>

      {/* Center section: Main Zoom controls */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Host/Co-Host Security Settings */}
        {(isHost || isCoHost) && (
          <button
            onClick={onOpenSecurityModal}
            className="flex flex-col items-center justify-center w-11 h-11 sm:w-14 sm:h-14 rounded-xl text-slate-200 hover:bg-slate-800/80 transition"
            title="Sabha Security & Admin Settings"
          >
            <Shield className="w-4 h-4 sm:w-5 sm:h-5 sm:mb-1 text-amber-400" />
            <span className="text-[9px] sm:text-[10px] font-medium hidden sm:inline">Security</span>
          </button>
        )}

        {/* Participants Roster */}
        <button
          onClick={onToggleParticipantsPanel}
          className="relative flex flex-col items-center justify-center w-11 h-11 sm:w-14 sm:h-14 rounded-xl text-slate-200 hover:bg-slate-800/80 transition"
          title="Participants List"
        >
          <Users className="w-4 h-4 sm:w-5 sm:h-5 sm:mb-1" />
          <span className="text-[9px] sm:text-[10px] font-medium hidden sm:inline">People</span>
          {waitingCount > 0 ? (
            <span className="absolute top-0.5 right-0.5 px-1.5 py-0.2 bg-amber-500 text-slate-950 text-[9px] font-black rounded-full flex items-center gap-0.5 shadow-md shadow-amber-500/30 animate-pulse">
              <span>{participantCount}</span>
              <span className="bg-slate-950 text-amber-400 text-[8px] px-1 rounded-full">+{waitingCount}</span>
            </span>
          ) : (
            <span className="absolute top-1 right-1 px-1.5 py-0.2 bg-slate-800 border border-slate-700 text-amber-400 text-[9px] font-bold rounded-full">
              {participantCount}
            </span>
          )}
        </button>

        {/* In-Meeting Chat */}
        <button
          onClick={onToggleChatPanel}
          className="relative flex flex-col items-center justify-center w-11 h-11 sm:w-14 sm:h-14 rounded-xl text-slate-200 hover:bg-slate-800/80 transition"
          title="Meeting Chat"
        >
          <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 sm:mb-1" />
          <span className="text-[9px] sm:text-[10px] font-medium hidden sm:inline">Chat</span>
          {unreadChatCount > 0 && (
            <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-amber-500 text-slate-950 text-[9px] font-extrabold rounded-full flex items-center justify-center animate-pulse">
              {unreadChatCount}
            </span>
          )}
        </button>

        {/* Share Screen */}
        <button
          onClick={onToggleScreenShare}
          className={`flex flex-col items-center justify-center w-11 h-11 sm:w-14 sm:h-14 rounded-xl transition cursor-pointer ${
            screenSharing
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : 'text-slate-200 hover:bg-slate-800/80'
          }`}
          title={screenSharing ? 'Stop Screen Share' : 'Share Screen'}
        >
          <ScreenShare className="w-4 h-4 sm:w-5 sm:h-5 sm:mb-1 text-emerald-400" />
          <span className="text-[9px] sm:text-[10px] font-medium hidden xs:inline">{screenSharing ? 'Sharing' : 'Share'}</span>
        </button>

        {/* Whiteboard */}
        <button
          onClick={onToggleWhiteboard}
          className={`flex flex-col items-center justify-center w-11 h-11 sm:w-14 sm:h-14 rounded-xl transition cursor-pointer ${
            isWhiteboardOpen
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-md'
              : 'text-slate-200 hover:bg-slate-800/80'
          }`}
          title={isWhiteboardOpen ? 'Close Whiteboard' : 'Open Whiteboard'}
        >
          <PenTool className="w-4 h-4 sm:w-5 sm:h-5 sm:mb-1 text-sky-400" />
          <span className="text-[9px] sm:text-[10px] font-medium hidden sm:inline">
            {isWhiteboardOpen ? 'Close' : 'Board'}
          </span>
        </button>

        {/* Local Recording */}
        <button
          onClick={onToggleRecording}
          className={`flex flex-col items-center justify-center w-11 h-11 sm:w-14 sm:h-14 rounded-xl transition cursor-pointer ${
            isRecording
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse shadow-md shadow-rose-500/20'
              : 'text-slate-200 hover:bg-slate-800/80'
          }`}
          title={isRecording ? 'Stop Recording' : 'Record Screen & Audio'}
        >
          <CircleDot className="w-4 h-4 sm:w-5 sm:h-5 sm:mb-1 text-rose-500" />
          <span className="text-[9px] sm:text-[10px] font-medium hidden xs:inline">{isRecording ? 'Stop Rec' : 'Record'}</span>
        </button>

        {/* Reactions & Hand Raise Popover */}
        <div className="relative" ref={reactionsRef}>
          <button
            onClick={() => setShowReactionsMenu(!showReactionsMenu)}
            className={`flex flex-col items-center justify-center w-11 h-11 sm:w-14 sm:h-14 rounded-xl transition cursor-pointer ${
              showReactionsMenu ? 'bg-slate-800 text-amber-400' : 'text-slate-200 hover:bg-slate-800/80'
            }`}
            title="Reactions & Hand Raise"
          >
            <Smile className="w-4 h-4 sm:w-5 sm:h-5 sm:mb-1 text-amber-400" />
            <span className="text-[9px] sm:text-[10px] font-medium hidden sm:inline">React</span>
          </button>

          {showReactionsMenu && (
            <div className="absolute bottom-full mb-3 right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 w-72 sm:w-80 min-w-[280px] p-3 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/80 z-50 flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-150 select-none">
              <div className="flex items-center justify-between gap-1 px-1">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onSendReaction(emoji);
                      setShowReactionsMenu(false);
                    }}
                    className="text-2xl p-1.5 rounded-xl hover:bg-slate-800 hover:scale-125 transition-transform active:scale-90 cursor-pointer flex-shrink-0"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  onToggleHandRaise();
                  setShowReactionsMenu(false);
                }}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition shadow-sm cursor-pointer whitespace-nowrap ${
                  isHandRaised
                    ? 'bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <Hand className="w-4 h-4 flex-shrink-0" />
                <span>{isHandRaised ? 'Lower Hand' : 'Raise Hand ✋'}</span>
              </button>
              {/* Downward pointer arrow */}
              <div className="absolute -bottom-1.5 right-5 sm:left-1/2 sm:-translate-x-1/2 w-3 h-3 bg-slate-900 border-b border-r border-slate-700 rotate-45 pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {/* Right section: End / Leave Meeting */}
      <div className="flex items-center">
        <button
          onClick={onLeaveMeeting}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition shadow-lg shadow-rose-600/20 active:scale-95 cursor-pointer"
          title={isHost ? 'End or Leave Sabha' : 'Leave Sabha'}
        >
          <PhoneOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>{isHost ? 'End' : 'Leave'}</span>
        </button>
      </div>
    </div>
  );
}
