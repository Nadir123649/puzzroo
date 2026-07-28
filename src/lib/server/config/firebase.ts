let cachedAuth: any = null;

function validateFirebaseEnv(): void {
  const missing: string[] = [];
  if (!process.env.FIREBASE_PROJECT_ID) missing.push('FIREBASE_PROJECT_ID');
  if (!process.env.FIREBASE_CLIENT_EMAIL) missing.push('FIREBASE_CLIENT_EMAIL');
  if (!process.env.FIREBASE_PRIVATE_KEY) missing.push('FIREBASE_PRIVATE_KEY');
  if (missing.length > 0) {
    throw new Error(
      `Firebase Admin SDK cannot initialise — missing env vars: ${missing.join(', ')}`
    );
  }
}

export async function getFirebaseAuth() {
  if (cachedAuth) return cachedAuth;

  validateFirebaseEnv();

  const { getApps, initializeApp, cert } = await import("firebase-admin/app");
  const { getAuth } = await import("firebase-admin/auth");

  if (getApps().length === 0) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY!
      .replace(/^["']|["']$/g, "")
      .replace(/\\n/g, "\n");
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey,
      }),
    });
  }

  cachedAuth = getAuth();
  return cachedAuth;
}

export function assertFirebaseConfigured(): void {
  validateFirebaseEnv();
}
