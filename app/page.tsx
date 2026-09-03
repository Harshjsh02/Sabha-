'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import {
  Video,
  Plus,
  Users,
  Shield,
  ScreenShare,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  Zap,
  Lock,
  PenTool,
  CircleDot,
  Smile,
  HelpCircle,
} from 'lucide-react';
import { FirebaseSetupModal } from '@/components/FirebaseSetupModal';

export default function HomePage() {
  const router = useRouter();
  const { user, signInWithGoogle, isFirebaseReady } = useAuth();
  const [joinCode, setJoinCode] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [showCapacityModal, setShowCapacityModal] = useState(false);

  // Generate random 9-digit meeting code
  const generateMeetingCode = () => {
    const part1 = Math.floor(100 + Math.random() * 900);
    const part2 = Math.floor(100 + Math.random() * 900);
    const part3 = Math.floor(100 + Math.random() * 900);
    return `sabha-${part1}-${part2}`;
  };

  const handleStartMeeting = () => {
    const newRoomId = generateMeetingCode();
    router.push(`/room/${newRoomId}?host=true`);
  };

  const handleJoinMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    // Handle full URL or raw code
    let cleanedCode = joinCode.trim();
    if (cleanedCode.includes('/room/')) {
      cleanedCode = cleanedCode.split('/room/')[1].split('?')[0];
    }

    router.push(`/room/${cleanedCode}`);
  };

  const handleCreateLink = () => {
    const code = generateMeetingCode();
    const link = `${window.location.origin}/room/${code}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950">
      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 flex-1 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-6 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>सभा (Sabha) - 100% Free Zoom Alternative</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
            Next-Gen Video Meetings,{' '}
            <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent">
              Zero Cloud Costs.
            </span>
          </h1>

          <p className="mt-5 text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
            High-performance WebRTC peer-to-peer video conferencing with Zoom-parity admin controls,
            screen sharing, live chat, interactive whiteboard, and browser recording. Built for free
            Vercel hosting and Firebase.
          </p>

          <div className="mt-4 flex items-center justify-center gap-4 text-xs">
            <button
              onClick={() => setShowCapacityModal(true)}
              className="text-amber-400 hover:text-amber-300 underline flex items-center gap-1 font-medium"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              How many people can Sabha handle for free?
            </button>
          </div>
        </div>

        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto w-full mb-16">
          {/* Card 1: Start Instant Meeting */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-xl hover:border-amber-500/40 transition group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Video className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">New Sabha Meeting</h2>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Launch an instant meeting room. You will be assigned as the Host (सभापति) with full
                administrative controls (Mute All, Kick, Lock Room).
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleStartMeeting}
                className="w-full py-3.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition transform active:scale-98"
              >
                <Plus className="w-5 h-5" />
                <span>Start Sabha Now</span>
              </button>

              <button
                onClick={handleCreateLink}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-medium text-xs flex items-center justify-center gap-2 transition"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                <span>{copiedLink ? 'Meeting Link Copied!' : 'Create Meeting Link for Later'}</span>
              </button>
            </div>
          </div>

          {/* Card 2: Join Meeting with Code */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-xl hover:border-slate-700 transition">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center mb-6">
                <Users className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Join a Sabha</h2>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Enter the meeting code or URL shared by the host to preview your webcam and mic in the
                Green Room before entering.
              </p>
            </div>

            <form onSubmit={handleJoinMeeting} className="space-y-3">
              <input
                type="text"
                placeholder="e.g. sabha-849-219 or invite link"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
              />

              <button
                type="submit"
                disabled={!joinCode.trim()}
                className="w-full py-3.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-semibold text-sm border border-slate-700 flex items-center justify-center gap-2 transition"
              >
                <span>Join Sabha</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Feature Grid (Zoom Parity) */}
        <div className="border-t border-slate-800/80 pt-12">
          <div className="text-center mb-8">
            <h3 className="text-lg font-bold text-white tracking-tight">
              Complete Zoom Feature Suite — Built In
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Everything you need for productive collaboration with $0 server costs
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4">
              <div className="p-2 w-fit rounded-lg bg-amber-500/10 text-amber-400 mb-3">
                <Shield className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-xs text-white mb-1">Host Admin Controls</h4>
              <p className="text-[11px] text-slate-400 leading-normal">
                Mute all microphones, kick unruly users, and lock the room securely.
              </p>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4">
              <div className="p-2 w-fit rounded-lg bg-emerald-500/10 text-emerald-400 mb-3">
                <ScreenShare className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-xs text-white mb-1">HD Screen Sharing</h4>
              <p className="text-[11px] text-slate-400 leading-normal">
                Share application windows, full screen, or browser tabs with system audio.
              </p>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4">
              <div className="p-2 w-fit rounded-lg bg-sky-500/10 text-sky-400 mb-3">
                <PenTool className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-xs text-white mb-1">Live Whiteboard</h4>
              <p className="text-[11px] text-slate-400 leading-normal">
                Draw, sketch diagrams, write notes, and export whiteboard captures as PNG.
              </p>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4">
              <div className="p-2 w-fit rounded-lg bg-rose-500/10 text-rose-400 mb-3">
                <CircleDot className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-xs text-white mb-1">Local Recording</h4>
              <p className="text-[11px] text-slate-400 leading-normal">
                Record your meeting directly inside your browser without paying for cloud storage.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 bg-slate-950 py-6">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">Sabha (सभा)</span>
            <span>•</span>
            <span>Hosted on Vercel</span>
            <span>•</span>
            <span>Database on Firebase</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowCapacityModal(true)}
              className="text-amber-400 hover:underline"
            >
              Capacity Guide
            </button>
            <button
              onClick={() => setIsSetupModalOpen(true)}
              className="hover:text-slate-300 transition"
            >
              Firebase Settings
            </button>
          </div>
        </div>
      </footer>

      {/* Firebase Setup Modal */}
      <FirebaseSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
      />

      {/* Capacity & Scalability Info Modal */}
      {showCapacityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl p-6 sm:p-8 shadow-2xl text-slate-100 relative">
            <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              How Many People Can Sabha Handle for Free?
            </h3>

            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <p>
                Sabha operates on a <strong>Pure Peer-to-Peer WebRTC Mesh Topology</strong>. Media
                (audio & video) is transmitted directly between participants' browsers using Google's
                free public STUN servers, while room state and signaling are handled by Firebase
                Firestore.
              </p>

              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-white text-sm">Optimal Experience: 4 to 6 People</p>
                    <p className="text-slate-400 mt-0.5">
                      Full HD 720p/1080p video, low latency, and crystal clear audio on typical laptops and broadband.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-white text-sm">Playable Limit: 8 to 10 People</p>
                    <p className="text-slate-400 mt-0.5">
                      Smooth group discussion when inactive participants keep cameras off or in audio-centric mode.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-sky-400 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-white text-sm">Total Meetings Across the App: Thousands / Day</p>
                    <p className="text-slate-400 mt-0.5">
                      Firebase Spark gives 50,000 free document reads/day and 20,000 writes/day, and Vercel offers 100 GB bandwidth/month at $0.00 cost!
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-slate-400 italic">
                *Note: Commercial Zoom routes calls through massive server farms (SFUs) that cost
                thousands of dollars monthly. By utilizing WebRTC P2P mesh, Sabha guarantees 100% free
                usage forever without credit card requirements!
              </p>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowCapacityModal(false)}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
              >
                Got It, Thanks!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
