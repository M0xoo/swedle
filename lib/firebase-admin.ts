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

/**
 * True when the process likely runs on GCP with a metadata server / runtime SA
 * (Cloud Run service, Cloud Run job, etc.).
 */
function isLikelyGcpAdcRuntime(): boolean {
  return Boolean(
    process.env.K_SERVICE ||
      process.env.K_REVISION ||
      process.env.CLOUD_RUN_JOB,
  );
}

export function isFirebaseStatsEnabled(): boolean {
  if (parseServiceAccount()) return true;
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return true;
  if (process.env.FIREBASE_USE_ADC === "1") return true;
  // Explicit: ADC + project id on any host (e.g. custom Docker on GCP).
  if (process.env.FIREBASE_STATS_ENABLED === "1" && gcpProjectIdFromEnv()) {
    return true;
  }
  if (isLikelyGcpAdcRuntime() && gcpProjectIdFromEnv()) return true;
  return false;
}

/** Why stats are off (for logs + a safe client hint). */
export type FirebaseStatsGate =
  | { ok: true }
  | { ok: false; reason: "missing_project" | "disabled" };

export function getFirebaseStatsGate(): FirebaseStatsGate {
  if (isFirebaseStatsEnabled()) return { ok: true };
  if (isLikelyGcpAdcRuntime() && !gcpProjectIdFromEnv()) {
    return { ok: false, reason: "missing_project" };
  }
  return { ok: false, reason: "disabled" };
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
  const gac = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const projectId = gcpProjectIdFromEnv();
  if (projectId) {
    initializeApp({ projectId });
  } else {
    initializeApp();
  }
  const adcLabel = isLikelyGcpAdcRuntime()
    ? "ADC (GCP runtime service account)"
    : process.env.FIREBASE_USE_ADC === "1"
      ? "ADC (FIREBASE_USE_ADC=1)"
      : process.env.FIREBASE_STATS_ENABLED === "1"
        ? "ADC (FIREBASE_STATS_ENABLED=1)"
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
