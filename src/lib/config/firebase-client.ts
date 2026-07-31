import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, browserLocalPersistence, setPersistence, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const isFirebaseConfigured = !!firebaseConfig.apiKey;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;
let facebookProvider: FacebookAuthProvider | null = null;
let initError: Error | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    // Use localStorage so the OAuth redirect state survives mobile storage
    // partitioning (sessionStorage gets wiped between the provider redirect).
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.error("[firebase-client] persistence init failed:", err);
    });
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: "select_account" });
    facebookProvider = new FacebookAuthProvider();
    facebookProvider.addScope("email");
  } catch (err) {
    initError = err instanceof Error ? err : new Error("Firebase initialization failed");
    console.error("[firebase-client] init failed:", initError);
    auth = null;
  }
}

// Lazily resolves the Auth instance. Throws when Firebase could not be
// initialized so callers surface a real error instead of crashing on null.
export function getFirebaseAuth(): Auth {
  if (auth) return auth;
  if (initError) throw initError;
  throw new Error("Firebase is not configured");
}

export { auth, googleProvider, facebookProvider, isFirebaseConfigured };
