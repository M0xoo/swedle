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

/** GCP project id from typical Cloud Run / GCE / local gcloud env. */
function gcpProjectIdFromEnv(): string | undefined {
  const id =
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.GCLOUD_PROJECT?.trim();
  return id || undefined;
}

/** True on Cloud Run services (metadata server + runtime SA ADC). */
function isCloudRun(): boolean {
  return Boolean(process.env.K_SERVICE);
}

export function isFirebaseStatsEnabled(): boolean {
  if (parseServiceAccount()) return true;
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return true;
  if (process.env.FIREBASE_USE_ADC === "1") return true;
  // Cloud Run: ADC is always available; same GCP project as Firebase when linked.
  if (isCloudRun() && gcpProjectIdFromEnv()) return true;
  return false;
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
  // Cloud Run / GCE / local: ADC via metadata server or GOOGLE_APPLICATION_CREDENTIALS
  const gac = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const projectId = gcpProjectIdFromEnv();
  if (projectId) {
    initializeApp({ projectId });
  } else {
    initializeApp();
  }
  const adcLabel = isCloudRun()
    ? "ADC (Cloud Run service account)"
    : process.env.FIREBASE_USE_ADC === "1"
      ? "ADC (FIREBASE_USE_ADC=1)"
      : "ADC / default";
  statsLog("Firebase Admin initialized", {
    credential: gac
      ? `GOOGLE_APPLICATION_CREDENTIALS (${path.basename(gac)})`
      : adcLabel,
    projectId: projectId ?? "(from credentials / metadata)",
  });
}

export function getAdminFirestore() {
  if (!isFirebaseStatsEnabled()) {
    throw new Error("Firebase Admin is not configured");
  }
  ensureApp();
  return getFirestore();
}
