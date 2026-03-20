import type { FeedbackTone } from "@/lib/types";
import type { LangGuessResult } from "@/lib/games/language";

const TILE: Record<FeedbackTone, string> = {
  green: "🟩",
  orange: "🟨",
  gray: "⬜",
};

/** One row: 5 tiles; year tile appends ↑ / ↓ when not exact (matches in-game hint). */
export function langGuessToShareRow(r: LangGuessResult): string {
  const { cells, yearHint } = r;
  let year = TILE[cells.year];
  if (cells.year !== "green") {
    if (yearHint === "up") year += "↑";
    else if (yearHint === "down") year += "↓";
  }
  return (
    TILE[cells.paradigm] +
    TILE[cells.openSource] +
    TILE[cells.execution] +
    TILE[cells.platforms] +
    year
  );
}

export function buildLangShareMessage(
  dateKey: string,
  rowsChronological: LangGuessResult[],
  origin?: string,
): string {
  const n = rowsChronological.length;
  const lines = rowsChronological.map(langGuessToShareRow);
  const url =
    origin && origin.length > 0
      ? `${origin.replace(/\/$/, "")}/lang`
      : "";
  const head = `SWEDLE · Langdle ${dateKey} ${n}/6`;
  const body = lines.join("\n");
  const tail = url ? `\n\n${url}` : "";
  return `${head}\n\n${body}${tail}`;
}
