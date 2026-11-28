import { initializeApp } from 'firebase/app'
import {
  getAuth,
  signOut as signOutFirebase,
  signInWithEmailAndPassword,
  type Auth,
  type UserCredential,
} from 'firebase/auth'

// Read from frontend/react/.env.local (Git-ignored), never committed. Without an API key the
// app runs without Firebase email sign-in; DealerOps password and Google sign-in still work.
const env = import.meta.env
const firebaseAuth: Auth | null = env.VITE_FIREBASE_API_KEY
  ? getAuth(initializeApp({
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.VITE_FIREBASE_APP_ID,
    }))
  : null

/**
 * Signs out of Firebase when email sign-in is configured. Does nothing when the API key is absent.
 */
export async function firebaseSignOut(): Promise<void> {
  if (firebaseAuth) await signOutFirebase(firebaseAuth)
}

/**
 * Email and password sign-in against Firebase. Rejects when Firebase is not configured.
 * Callers log the failure without the email or password.
 *
 * @param email Firebase account email
 * @param password Firebase account password
 * @returns the Firebase credential; `signInWithFirebase` exchanges its ID token
 */
export function firebaseSignIn(email: string, password: string): Promise<UserCredential> {
  if (!firebaseAuth) return Promise.reject(Object.assign(new Error('Firebase is not configured.'), { code: 'FIREBASE_UNCONFIGURED' }))
  return signInWithEmailAndPassword(firebaseAuth, email, password)
}
