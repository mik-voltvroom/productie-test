import { applicationDefault, cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";
import { hasFirebaseAdminServiceAccount, isFirebaseAdminConfigured } from "@/lib/config";

let adminApp: App | null = null;
if (isFirebaseAdminConfigured) {
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  adminApp = getApps()[0] ?? initializeApp({
    credential: hasFirebaseAdminServiceAccount
      ? cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey,
        })
      : applicationDefault(),
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

export const adminAuth: Auth | null = adminApp ? getAuth(adminApp) : null;
export const adminDb: Firestore | null = adminApp ? getFirestore(adminApp) : null;
export const adminStorage: Storage | null = adminApp ? getStorage(adminApp) : null;
