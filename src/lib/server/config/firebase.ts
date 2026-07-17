import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const hasFirebaseConfig =
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY;

// Initialize the Admin app exactly once. getApps() from the modular API is the
// reliable way to detect an existing app across HMR reloads / repeated imports;
// the legacy `admin.apps` check could be undefined and caused duplicate
// initializeApp() calls to throw ("app named [DEFAULT] already exists").
if (hasFirebaseConfig && getApps().length === 0) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n");
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey,
    }),
  });
}

export { getAuth };
