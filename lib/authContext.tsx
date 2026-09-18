'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, getRedirectResult } from 'firebase/auth';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { auth, db, loginWithGoogle, logoutUser, isFirebaseConfigured } from './firebase';
import { UserProfile } from './types';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  isFirebaseReady: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  isFirebaseReady: false,
});

async function logUserIpAndSession(firebaseUser: User) {
  try {
    const res = await fetch('/api/auth/record-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const ip = data.ip || '127.0.0.1';
      const userAgent = data.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown');

      // Update Firestore with IP address
      if (isFirebaseConfigured() && db) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        await setDoc(
          userRef,
          {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            lastLoginIp: ip,
            lastLoginAt: Date.now(),
            userAgent,
          },
          { merge: true }
        );

        // Append to audit log collection
        const loginLogsCol = collection(db, 'user_logins');
        await addDoc(loginLogsCol, {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          ip,
          userAgent,
          timestamp: Date.now(),
        });
      }
    }
  } catch (err) {
    console.warn('Failed to record user login IP:', err);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);

  useEffect(() => {
    const ready = isFirebaseConfigured();
    setIsFirebaseReady(ready);

    // Clear any previous legacy guest sessions
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sabha_guest_user');
    }

    if (ready && auth) {
      // Check for redirect result on Safari or mobile browsers
      getRedirectResult(auth)
        .then((cred) => {
          if (cred?.user) {
            const profile: UserProfile = {
              uid: cred.user.uid,
              displayName: cred.user.displayName || 'Sabha Member',
              email: cred.user.email,
              photoURL: cred.user.photoURL,
              isAnonymous: false,
            };
            setUser(profile);
            logUserIpAndSession(cred.user);
          }
        })
        .catch((err) => {
          console.warn('Redirect auth result check notice:', err);
        });

      const unsub = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
        if (firebaseUser) {
          const profile: UserProfile = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'Sabha Member',
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            isAnonymous: false,
          };
          setUser(profile);

          // Record IP and session in background
          logUserIpAndSession(firebaseUser);
        } else {
          setUser(null);
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

  const handleSignOut = async () => {
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
