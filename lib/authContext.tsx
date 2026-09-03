'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, loginWithGoogle, logoutUser, isFirebaseConfigured } from './firebase';
import { UserProfile } from './types';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: (displayName: string) => void;
  signOut: () => Promise<void>;
  isFirebaseReady: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInAsGuest: () => {},
  signOut: async () => {},
  isFirebaseReady: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);

  useEffect(() => {
    const ready = isFirebaseConfigured();
    setIsFirebaseReady(ready);

    // Check localStorage for saved guest session
    const savedGuest = localStorage.getItem('sabha_guest_user');
    if (savedGuest) {
      try {
        const guestData = JSON.parse(savedGuest);
        setUser(guestData);
        setLoading(false);
      } catch {}
    }

    if (ready && auth) {
      const unsub = onAuthStateChanged(auth, (firebaseUser: User | null) => {
        if (firebaseUser) {
          const profile: UserProfile = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'Sabha Participant',
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            isAnonymous: firebaseUser.isAnonymous,
          };
          setUser(profile);
          localStorage.removeItem('sabha_guest_user');
        } else {
          // If no firebase user, fall back to guest if present
          if (!localStorage.getItem('sabha_guest_user')) {
            setUser(null);
          }
        }
        setLoading(false);
      });

      return () => unsub();
    } else {
      setLoading(false);
    }
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      throw err;
    }
  };

  const handleGuestSignIn = (displayName: string) => {
    const guestUser: UserProfile = {
      uid: 'guest_' + Math.random().toString(36).substring(2, 9),
      displayName: displayName.trim() || 'Guest',
      email: null,
      photoURL: null,
      isAnonymous: true,
    };
    setUser(guestUser);
    localStorage.setItem('sabha_guest_user', JSON.stringify(guestUser));
  };

  const handleSignOut = async () => {
    localStorage.removeItem('sabha_guest_user');
    setUser(null);
    if (auth) {
      await logoutUser();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle: handleGoogleSignIn,
        signInAsGuest: handleGuestSignIn,
        signOut: handleSignOut,
        isFirebaseReady,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
