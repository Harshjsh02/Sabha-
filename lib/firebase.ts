import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

export interface FirebaseConfigOptions {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export function getActiveFirebaseConfig(): FirebaseConfigOptions | null {
  // 1. Check process.env first
  const envConfig: FirebaseConfigOptions = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
  };

  if (envConfig.apiKey && envConfig.projectId) {
    return envConfig;
  }

  // 2. Check localStorage (allows user to paste config directly in web UI)
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('sabha_firebase_config');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.apiKey && parsed.projectId) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  return null;
}

export function saveLocalFirebaseConfig(config: FirebaseConfigOptions) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('sabha_firebase_config', JSON.stringify(config));
    window.location.reload();
  }
}

export function clearLocalFirebaseConfig() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('sabha_firebase_config');
    window.location.reload();
  }
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const currentConfig = getActiveFirebaseConfig();

if (currentConfig) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(currentConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

export { app, auth, db, googleProvider };

export const isFirebaseConfigured = (): boolean => {
  return app !== null && db !== null;
};

export async function loginWithGoogle() {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized. Please provide Firebase credentials.');
  }
  return await signInWithPopup(auth, googleProvider);
}

export async function logoutUser() {
  if (!auth) return;
  return await signOut(auth);
}
