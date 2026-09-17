'use client';

import React, { useState } from 'react';
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
  Loader2,
} from 'lucide-react';

interface MeetingControlsProps {
  isHost: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isTogglingAudio?: boolean;
  isTogglingVideo?: boolean;
  screenSharing: boolean;
  isHandRaised: boolean;
  isRecording: boolean;
  participantCount: number;
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
  audioEnabled,
  videoEnabled,
  isTogglingAudio = false,
  isTogglingVideo = false,
  screenSharing,
  isHandRaised,
  isRecording,
  participantCount,
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

  const emojis = ['👍', '❤️', '👏', '😂', '🎉', '🚀'];

  return (
    <div className="h-16 sm:h-20 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 px-2 sm:px-4 flex items-center justify-between z-30 select-none pb-safe">
      {/* Left section: Audio & Video */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Microphone Toggle */}
        <button
          onClick={onToggleAudio}
          disabled={isTogglingAudio}
          className={`flex flex-col items-center justify-center w-11 h-11 sm:w-14 sm:h-14 rounded-xl transition ${
            isTogglingAudio
              ? 'bg-slate-800/60 opacity-80 cursor-wait'
              : audioEnabled
              ? 'text-slate-200 hover:bg-slate-800/80'
              : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
          }`}
          title={
            isTogglingAudio
              ? 'Switching audio...'
              : audioEnabled
              ? 'Mute Microphone'
              : 'Unmute Microphone'
          }
        >
          {isTogglingAudio ? (
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 sm:mb-1 animate-spin text-amber-400" />
          ) : audioEnabled ? (
            <Mic className="w-4 h-4 sm:w-5 sm:h-5 sm:mb-1" />
          ) : (
            <MicOff className="w-4 h-4 sm:w-5 sm:h-5 sm:mb-1" />
          )}
          <span className="text-[9px] sm:text-[10px] font-medium hidden xs:inline">
            {isTogglingAudio
              ? audioEnabled
                ? 'Muting...'
                : 'Unmuting...'
              : audioEnabled
              ? 'Mute'
              : 'Unmute'}
          </span>
        </button>

        {/* Video Toggle */}
        <button
          onClick={onToggleVideo}
          disabled={isTogglingVideo}
          className={`flex flex-col items-center justify-center w-11 h-11 sm:w-14 sm:h-14 rounded-xl transition ${
            isTogglingVideo
              ? 'bg-slate-800/60 opacity-80 cursor-wait'
              : videoEnabled
              ? 'text-slate-200 hover:bg-slate-800/80'
              : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
          }`}
          title={
            isTogglingVideo
              ? 'Switching camera...'
              : videoEnabled
              ? 'Stop Video'
              : 'Start Video'
          }
        >
          {isTogglingVideo ? (
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 sm:mb-1 animate-spin text-amber-400" />
          ) : videoEnabled ? (
            <Video className="w-4 h-4 sm:w-5 sm:h-5 sm:mb-1" />
          ) : (
            <VideoOff className="w-4 h-4 sm:w-5 sm:h-5 sm:mb-1" />
          )}
          <span className="text-[9px] sm:text-[10px] font-medium hidden xs:inline">
            {isTogglingVideo
              ? videoEnabled
                ? 'Stopping...'
                : 'Starting...'
              : videoEnabled
              ? 'Stop'
              : 'Start'}
          </span>
        </button>
      </div>

      {/* Center section: Main Zoom controls */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Host Security Settings */}
        {isHost && (
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
          <span className="absolute top-1 right-1 px-1.5 py-0.2 bg-slate-800 border border-slate-700 text-amber-400 text-[9px] font-bold rounded-full">
            {participantCount}
          </span>
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
        <div className="relative">
          <button
            onClick={() => setShowReactionsMenu(!showReactionsMenu)}
            className="flex flex-col items-center justify-center w-11 h-11 sm:w-14 sm:h-14 rounded-xl text-slate-200 hover:bg-slate-800/80 transition"
            title="Reactions & Hand Raise"
          >
            <Smile className="w-4 h-4 sm:w-5 sm:h-5 sm:mb-1 text-amber-400" />
            <span className="text-[9px] sm:text-[10px] font-medium hidden sm:inline">React</span>
          </button>

          {showReactionsMenu && (
            <div className="absolute bottom-16 right-0 sm:left-1/2 sm:-translate-x-1/2 mb-2 p-3 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onSendReaction(emoji);
                      setShowReactionsMenu(false);
                    }}
                    className="text-2xl p-2 rounded-xl hover:bg-slate-800 hover:scale-125 transition-transform active:scale-95"
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
                className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition ${
                  isHandRaised
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <Hand className="w-4 h-4" />
                <span>{isHandRaised ? 'Lower Hand' : 'Raise Hand ✋'}</span>
              </button>
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
