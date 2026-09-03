'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { FirebaseSetupModal } from './FirebaseSetupModal';
import { Video, Shield, LogIn, LogOut, Settings, User } from 'lucide-react';

export function Navbar() {
  const { user, signInWithGoogle, signOut, isFirebaseReady } = useAuth();
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <>
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              स
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-white">Sabha</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                  सभा
                </span>
              </div>
              <p className="text-[10px] text-slate-400 -mt-0.5 tracking-wider uppercase font-medium">
                Free Real-Time Assembly
              </p>
            </div>
          </Link>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Firebase Status Badge */}
            <button
              onClick={() => setIsSetupOpen(true)}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                isFirebaseReady
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
              }`}
              title="Firebase Settings"
            >
              <div
                className={`w-2 h-2 rounded-full animate-pulse ${
                  isFirebaseReady ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span>{isFirebaseReady ? 'Firebase Active' : 'Setup Firebase'}</span>
              <Settings className="w-3.5 h-3.5 ml-1 text-slate-400" />
            </button>

            {/* Auth section */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-800/60 border border-slate-700/60 transition"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName}
                      className="w-8 h-8 rounded-lg object-cover ring-1 ring-amber-500/50"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
                      {user.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-medium text-slate-200 hidden md:inline-block max-w-[120px] truncate">
                    {user.displayName}
                  </span>
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-xl py-2 z-50 text-slate-200 text-sm">
                    <div className="px-4 py-2 border-b border-slate-800">
                      <p className="font-semibold text-white truncate">{user.displayName}</p>
                      <p className="text-xs text-slate-400 truncate">{user.email || 'Guest User'}</p>
                    </div>
                    <button
                      onClick={() => {
                        setIsSetupOpen(true);
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-800 text-slate-300 flex items-center gap-2 transition"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      Firebase Configuration
                    </button>
                    <button
                      onClick={() => {
                        signOut();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-rose-500/10 text-rose-400 flex items-center gap-2 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs sm:text-sm font-medium transition shadow-sm hover:shadow"
              >
                <LogIn className="w-4 h-4 text-amber-400" />
                <span>Google Sign-In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <FirebaseSetupModal isOpen={isSetupOpen} onClose={() => setIsSetupOpen(false)} />
    </>
  );
}
