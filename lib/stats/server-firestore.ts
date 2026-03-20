import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase-admin";
import type { StatsGame } from "@/lib/stats/types";
import { maxBucketIndex } from "@/lib/stats/types";

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
  await ref.set(
    {
      solvers: FieldValue.increment(1),
      [field]: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export function bucketsFromSnapshot(
  game: StatsGame,
  data: Record<string, unknown> | undefined,
): { solvers: number; buckets: number[] } {
  const maxB = maxBucketIndex(game);
  const buckets: number[] = [];
  for (let i = 0; i <= maxB; i++) {
    const v = data?.[`c${i}`];
    buckets.push(typeof v === "number" && Number.isFinite(v) ? v : 0);
  }
  const solversRaw = data?.solvers;
  const solvers =
    typeof solversRaw === "number" && Number.isFinite(solversRaw)
      ? solversRaw
      : 0;
  return { solvers, buckets };
}
