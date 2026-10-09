import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  updateProfile,
  browserLocalPersistence,
  setPersistence,
} from "firebase/auth";

/** Strip optional quotes from .env values */
function env(key, fallback) {
  const raw = import.meta.env[key];
  if (raw == null || raw === "") return fallback;
  return String(raw).replace(/^["']|["']$/g, "");
}

const firebaseConfig = {
  apiKey: env("VITE_FIREBASE_API_KEY", "AIzaSyAo-1RhXlXMPBjXfugfPNsbr_WWQuHOnQU"),
  authDomain: env("VITE_FIREBASE_AUTH_DOMAIN", "lifelink-5fc7a.firebaseapp.com"),
  projectId: env("VITE_FIREBASE_PROJECT_ID", "lifelink-5fc7a"),
  storageBucket: env("VITE_FIREBASE_STORAGE_BUCKET", "lifelink-5fc7a.firebasestorage.app"),
  messagingSenderId: env("VITE_FIREBASE_MESSAGING_SENDER_ID", "1079446467685"),
  appId: env("VITE_FIREBASE_APP_ID", "1:1079446467685:web:9959665cb8f04c1dfe028c"),
  measurementId: env("VITE_FIREBASE_MEASUREMENT_ID", "G-RFP3FR3RKT"),
};

if (!firebaseConfig.apiKey || !firebaseConfig.authDomain) {
  console.error(
    "[LifeLink] Firebase config is incomplete. Check .env.local and restart the dev server."
  );
}

import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn("[LifeLink] Auth persistence:", err);
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export const loginWithEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

export const registerWithEmail = (email, password) =>
  createUserWithEmailAndPassword(auth, email, password);

export const logout = () => signOut(auth);

export const updateUserProfile = (user, displayName) =>
  updateProfile(user, { displayName });

/** Save user profile details directly into Firebase Firestore Database */
export async function saveUserProfileToFirestore(uid, data) {
  if (!uid) return;
  try {
    const userRef = doc(db, "users", uid);
    await setDoc(
      userRef,
      {
        ...data,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error("[LifeLink] Error saving to Firebase Firestore:", err);
  }
}

/** Fetch user profile details directly from Firebase Firestore Database */
export async function getUserProfileFromFirestore(uid) {
  if (!uid) return null;
  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error("[LifeLink] Error fetching from Firebase Firestore:", err);
    return null;
  }
}

export function getAuthErrorMessage(error) {
  const code = error?.code ?? "";
  const messages = {
    "auth/popup-closed-by-user": "Google sign-in was cancelled. Please try again.",
    "auth/popup-blocked":
      "Popup blocked. Use the redirect sign-in or allow popups for this site.",
    "auth/cancelled-popup-request": "Sign-in already in progress. Please wait.",
    "auth/unauthorized-domain":
      "Domain not authorized. In Firebase → Authentication → Settings → Authorized domains, add: localhost",
    "auth/operation-not-allowed":
      "Google sign-in is disabled in Firebase. Enable it under Authentication → Sign-in method.",
    "auth/account-exists-with-different-credential":
      "This email is registered with a different sign-in method. Use email/password instead.",
    "auth/network-request-failed": "Network error. Check your internet connection.",
    "auth/invalid-api-key":
      "Invalid Firebase API key. Restart the dev server after updating .env.local.",
    "auth/invalid-credential": "Sign-in failed. Please try again.",
  };
  return messages[code] || error?.message || "Sign-in failed. Please try again.";
}

const POPUP_FALLBACK_CODES = new Set([
  "auth/popup-blocked",
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
]);

/**
 * Tries Google popup first; falls back to full-page redirect (works when popups fail).
 * Returns { user, method: 'popup' } | { method: 'redirect' } | throws.
 */
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { user: result.user, method: "popup" };
  } catch (error) {
    if (POPUP_FALLBACK_CODES.has(error.code)) {
      await signInWithRedirect(auth, googleProvider);
      return { user: null, method: "redirect" };
    }
    throw error;
  }
}

/** Prefer redirect only — most reliable on localhost */
export async function loginWithGoogleRedirect() {
  await signInWithRedirect(auth, googleProvider);
  return { user: null, method: "redirect" };
}

export async function resolveGoogleRedirect() {
  return getRedirectResult(auth);
}
