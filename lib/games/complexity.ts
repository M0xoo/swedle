import { COMPLEXITY } from "@/lib/data";
import type { ComplexityEntry } from "@/lib/types";
import { createRng, pickMany } from "@/lib/seed";

export function getDailyComplexity(dateKey: string): ComplexityEntry[] {
  const rng = createRng(dateKey, "big-o");
  return pickMany(rng, COMPLEXITY, 5);
}
