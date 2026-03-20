import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase-admin";
import type { StatsGame } from "@/lib/stats/types";
import { maxBucketIndex } from "@/lib/stats/types";
import { statsLog } from "@/lib/stats/stats-log";

function docId(dateKey: string, game: StatsGame) {
  return `${dateKey}_${game}`;
}

export function readDailyStatsDoc(dateKey: string, game: StatsGame) {
  const db = getAdminFirestore();
  const ref = db.collection("dailyStats").doc(docId(dateKey, game));
  return ref.get();
}

export async function incrementDailyStats(
  dateKey: string,
  game: StatsGame,
  bucketIndex: number,
) {
  const maxB = maxBucketIndex(game);
  if (bucketIndex < 0 || bucketIndex > maxB) {
    throw new Error("Invalid bucket");
  }
  const db = getAdminFirestore();
  const ref = db.collection("dailyStats").doc(docId(dateKey, game));
  const field = `c${bucketIndex}`;
  const id = docId(dateKey, game);
  statsLog("Firestore write", {
    collection: "dailyStats",
    docId: id,
    incrementSolvers: 1,
    incrementBucket: field,
  });
  await ref.set(
    {
      solvers: FieldValue.increment(1),
      [field]: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  statsLog("Firestore write OK", { docId: id });
}

function statNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : 0;
  }
  return 0;
}

export function bucketsFromSnapshot(
  game: StatsGame,
  data: Record<string, unknown> | undefined,
): { solvers: number; buckets: number[] } {
  const maxB = maxBucketIndex(game);
  const buckets: number[] = [];
  for (let i = 0; i <= maxB; i++) {
    buckets.push(statNumber(data?.[`c${i}`]));
  }
  const solvers = statNumber(data?.solvers);
  return { solvers, buckets };
}
