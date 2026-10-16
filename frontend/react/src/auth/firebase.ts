import { initializeApp } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  getAuth,
  signOut as signOutFirebase,
  signInWithEmailAndPassword,
  updateProfile,
  type UserCredential,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyC60CS2NNLpslRXsMvThWS3E8NINVniqs8',
  authDomain: 'dealer-ops-c0851.firebaseapp.com',
  projectId: 'dealer-ops-c0851',
  storageBucket: 'dealer-ops-c0851.firebasestorage.app',
  messagingSenderId: '5817410828',
  appId: '1:5817410828:web:717e6daeb9a840aa399529',
}

const app = initializeApp(firebaseConfig)
export const firebaseAuth = getAuth(app)

export function firebaseSignOut(): Promise<void> {
  return signOutFirebase(firebaseAuth)
}

export function firebaseSignIn(email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(firebaseAuth, email, password)
}

export async function firebaseRegister(
  email: string,
  password: string,
  displayName: string,
): Promise<UserCredential> {
  const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password)
  await updateProfile(credential.user, { displayName })
  return credential
}
