export const isFirebaseClientConfigured = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID
);

export const hasFirebaseAdminServiceAccount = Boolean(
  process.env.FIREBASE_ADMIN_PROJECT_ID &&
  process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
  process.env.FIREBASE_ADMIN_PRIVATE_KEY
);

export const usesGoogleRuntimeIdentity = Boolean(
  process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.K_SERVICE
);

export const isFirebaseAdminConfigured = hasFirebaseAdminServiceAccount || usesGoogleRuntimeIdentity;

export const integrationMode = process.env.NEXT_PUBLIC_VVOS_DATA_MODE === "firebase"
  || process.env.VVOS_DATA_MODE === "firebase"
  ? "firebase"
  : "demo";
