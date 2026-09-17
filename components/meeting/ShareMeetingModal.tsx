'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Share2, MessageCircle, Link, Shield, Users } from 'lucide-react';

interface ShareMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  hostName?: string;
}

export function ShareMeetingModal({
  isOpen,
  onClose,
  roomId,
  hostName,
}: ShareMeetingModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  // Clean URL without query parameters like ?host=true
  const cleanMeetingUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/room/${roomId}`
    : `https://sabha-cdh.vercel.app/room/${roomId}`;

  const invitationMessage = `Namaste! Join our Sabha (सभा) video meeting 🎙️📹\n\nMeeting Code: ${roomId}\nLink: ${cleanMeetingUrl}\n\nHosted via Sabha - 100% Free Zoom Alternative for CodersHigh.`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(cleanMeetingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const encodedText = encodeURIComponent(invitationMessage);
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Sabha Meeting (${roomId})`,
          text: invitationMessage,
          url: cleanMeetingUrl,
        });
      } catch (err) {
        // User cancelled share or failed
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl text-slate-100 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shadow-inner">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Share Sabha Meeting</h2>
            <p className="text-xs text-slate-400">Invite participants with clean, verified links</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Direct Meeting Link (Clean URL) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Link className="w-3.5 h-3.5 text-amber-400" />
              <span>Participant Join Link</span>
            </label>
            <div className="flex items-center gap-2 p-1.5 bg-slate-950 border border-slate-800 rounded-2xl">
              <input
                type="text"
                readOnly
                value={cleanMeetingUrl}
                className="bg-transparent border-none text-xs text-slate-200 px-3 py-1.5 w-full focus:outline-none font-mono select-all truncate"
              />
              <button
                onClick={handleCopyLink}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition flex-shrink-0 active:scale-95 shadow-md shadow-amber-500/20"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-[10px] text-emerald-400/80 mt-1 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span>Clean URL — Host credentials are securely protected.</span>
            </p>
          </div>

          {/* Meeting Code */}
          <div className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl">
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Meeting Room Code</p>
              <p className="font-mono text-base font-bold text-amber-400 tracking-wider mt-0.5">
                {roomId}
              </p>
            </div>
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>

          {/* Quick Sharing Options */}
          <div className="pt-2 grid grid-cols-2 gap-3">
            {/* WhatsApp Share */}
            <button
              onClick={handleShareWhatsApp}
              className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/20 active:scale-95 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>WhatsApp</span>
            </button>

            {/* Native Share / Other Apps */}
            <button
              onClick={handleNativeShare}
              className="w-full py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs border border-slate-700 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-amber-400" />
              <span>More Apps...</span>
            </button>
          </div>

          {/* Host Info Note */}
          {hostName && (
            <div className="text-center pt-2">
              <p className="text-[11px] text-slate-400">
                Created by host <span className="text-slate-200 font-semibold">{hostName}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
