import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase/config";

export async function loginWithEmail(email: string, password: string) {
  return await signInWithEmailAndPassword(auth, email, password);
}

// Firebase popup authentication only. Backend sync happens separately in authApi.ts.
export async function loginWithGoogle() {
  return await signInWithPopup(auth, googleProvider);
}

export async function logoutUser() {
  await signOut(auth);
}

export function observeAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function getFirebaseToken(): Promise<string | null> {
  const user = auth.currentUser;

  if (!user) return null;

  return await user.getIdToken(true);
}
