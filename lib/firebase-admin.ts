import path from "node:path";
import {
  cert,
  getApps,
  initializeApp,
  type ServiceAccount,
} from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { statsLog } from "@/lib/stats/stats-log";

function parseServiceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw?.trim()) return null;
  try {
    return JSON.parse(raw) as ServiceAccount;
  } catch {
    return null;
  }
}

export function isFirebaseStatsEnabled(): boolean {
  return (
    Boolean(parseServiceAccount()) ||
    Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS) ||
    process.env.FIREBASE_USE_ADC === "1"
  );
}

function ensureApp() {
  if (getApps().length > 0) return;
  const sa = parseServiceAccount();
  if (sa) {
    initializeApp({ credential: cert(sa) });
    const saPid =
      sa.projectId ??
      (sa as { project_id?: string }).project_id ??
      "(unknown)";
    statsLog("Firebase Admin initialized", {
      credential: "FIREBASE_SERVICE_ACCOUNT_KEY",
      projectId: saPid,
    });
    return;
  }
  // Cloud Run / GCP: ADC (optionally set FIREBASE_PROJECT_ID or rely on GCLOUD_PROJECT)
  const gac = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const projectId =
    process.env.FIREBASE_PROJECT_ID ?? process.env.GCLOUD_PROJECT;
  if (projectId) {
    initializeApp({ projectId });
  } else {
    initializeApp();
  }
  statsLog("Firebase Admin initialized", {
    credential: gac
      ? `GOOGLE_APPLICATION_CREDENTIALS (${path.basename(gac)})`
      : process.env.FIREBASE_USE_ADC === "1"
        ? "ADC (FIREBASE_USE_ADC=1)"
        : "ADC / default",
    projectId: projectId ?? "(from credentials)",
  });
}

export function getAdminFirestore() {
  if (!isFirebaseStatsEnabled()) {
    throw new Error("Firebase Admin is not configured");
  }
  ensureApp();
  return getFirestore();
}
