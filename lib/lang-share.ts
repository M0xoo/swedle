import type { FeedbackTone } from "@/lib/types";
import type { LangGuessResult } from "@/lib/games/language";

/** Order of clue columns (matches UI left → right). */
export const LANG_SHARE_CELL_KEYS = [
  "paradigm",
  "openSource",
  "execution",
  "platforms",
  "year",
] as const satisfies readonly (keyof LangGuessResult["cells"])[];

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
  return LANG_SHARE_CELL_KEYS.map((k) => TILE[cells[k]]).join("");
}

/** Grid + header only (URL is passed separately for X / intent APIs). */
export function buildLangXShareText(
  dateKey: string,
  rowsChronological: LangGuessResult[],
): string {
  const n = rowsChronological.length;
  const lines = rowsChronological.map(langGuessToShareRow);
  const head = `SWEDLE · Langdle ${dateKey} ${n}/6`;
  return `${head}\n\n${lines.join("\n")}`;
}

/**
 * `title` for X intent: same as {@link buildLangXShareText} plus trailing newlines
 * so the compose UI puts the intent `url` (and hashtag) on a new line after the grid.
 */
export function buildLangXShareIntentTitle(
  dateKey: string,
  rowsChronological: LangGuessResult[],
): string {
  return `${buildLangXShareText(dateKey, rowsChronological)}\n\n`;
}

export function buildLangShareMessage(
  dateKey: string,
  rowsChronological: LangGuessResult[],
  origin?: string,
): string {
  const core = buildLangXShareText(dateKey, rowsChronological);
  const url =
    origin && origin.length > 0
      ? `${origin.replace(/\/$/, "")}/lang`
      : "";
  const tail = url ? `\n\n${url}` : "";
  return `${core}${tail}`;
}
