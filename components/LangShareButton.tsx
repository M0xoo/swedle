"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XShareButton } from "react-share";
import {
  buildLangShareMessage,
  buildLangXShareText,
  LANG_SHARE_CELL_KEYS,
  langGuessToShareRow,
} from "@/lib/lang-share";
import type { LangGuessResult } from "@/lib/games/language";
import type { FeedbackTone } from "@/lib/types";

function toneClass(t: FeedbackTone): string {
  if (t === "green") return "cell-hit";
  if (t === "orange") return "cell-near";
  return "cell-miss";
}

function ShareRowVisual({ r, index }: { r: LangGuessResult; index: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-4 shrink-0 text-right font-mono-ui text-[10px] tabular-nums text-[var(--muted2)]">
        {index + 1}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-1">
        {LANG_SHARE_CELL_KEYS.map((key) => (
          <span
            key={key}
            title={key}
            className={`h-7 w-[1.125rem] shrink-0 rounded-[3px] sm:h-8 sm:w-5 ${toneClass(r.cells[key])}`}
          />
        ))}
        {r.yearHint === "up" ? (
          <span
            className="ml-0.5 shrink-0 text-sm font-semibold leading-none text-[var(--near)]"
            aria-label="Year: later"
          >
            ↑
          </span>
        ) : null}
        {r.yearHint === "down" ? (
          <span
            className="ml-0.5 shrink-0 text-sm font-semibold leading-none text-[var(--near)]"
            aria-label="Year: earlier"
          >
            ↓
          </span>
        ) : null}
      </div>
    </div>
  );
}

const btnShared =
  "inline-flex min-h-[2.75rem] w-full min-w-0 flex-row items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium";

const xBtnClass = `${btnShared} border border-[var(--line-strong)] bg-[var(--fg)] text-[var(--bg)] transition-[opacity,transform,box-shadow] hover:opacity-[0.92] hover:shadow-sm active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40`;

const copyBtnClass = `${btnShared} border border-[var(--line)] bg-[var(--bg-raised)] text-[var(--fg)] transition-[border-color,background-color] hover:border-[color-mix(in_srgb,var(--good)_40%,var(--line))] hover:bg-[color-mix(in_srgb,var(--good)_8%,var(--bg-raised))]`;

export function LangShareButton({
  dateKey,
  rowsNewestFirst,
}: {
  dateKey: string;
  rowsNewestFirst: LangGuessResult[];
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "err">("idle");
  const [pageUrl, setPageUrl] = useState("");

  const chronological = useMemo(
    () => [...rowsNewestFirst].reverse(),
    [rowsNewestFirst],
  );

  const xTitle = useMemo(
    () => buildLangXShareText(dateKey, chronological),
    [chronological, dateKey],
  );

  const headerLine = useMemo(() => {
    const n = chronological.length;
    return `SWEDLE · Langdle ${dateKey} · ${n}/6`;
  }, [chronological.length, dateKey]);

  useEffect(() => {
    setPageUrl(`${window.location.origin}/lang`);
  }, []);

  const copyText = useCallback(async () => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const text = buildLangShareMessage(dateKey, chronological, origin);

    if (navigator.share) {
      try {
        await navigator.share({ text, title: "SWEDLE Langdle" });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("err");
      window.setTimeout(() => setStatus("idle"), 2500);
    }
  }, [chronological, dateKey]);

  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-[var(--muted2)]">
          Share
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:gap-3">
          {pageUrl ? (
            <>
              <XShareButton
                resetButtonStyle={false}
                url={pageUrl}
                title={xTitle}
                hashtags={["SWEDLE"]}
                related={[]}
                className={xBtnClass}
                aria-label="Post result on X"
              >
                <svg
                  aria-hidden
                  className="h-4 w-4 shrink-0"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span className="whitespace-nowrap">Post on X</span>
              </XShareButton>
              <button type="button" onClick={copyText} className={copyBtnClass}>
                <span className="whitespace-nowrap">Copy text</span>
              </button>
            </>
          ) : (
            <>
              <div
                className="min-h-[2.75rem] animate-pulse rounded-md bg-[color-mix(in_srgb,var(--fg)_10%,transparent)]"
                aria-hidden
              />
              <div
                className="min-h-[2.75rem] animate-pulse rounded-md bg-[color-mix(in_srgb,var(--fg)_6%,transparent)]"
                aria-hidden
              />
            </>
          )}
        </div>
      </div>

      <div className="panel p-4">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-[var(--muted2)]">
          Your clues
        </p>
        <p className="mt-1 text-xs text-[var(--muted)]">{headerLine}</p>
        <div className="mt-4 space-y-3">
          {chronological.map((r, i) => (
            <ShareRowVisual key={`${r.guess.id}-${i}`} r={r} index={i} />
          ))}
        </div>
        <div className="mt-4 border-t border-[var(--line)] pt-3">
          <p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-[var(--muted2)]">
            Emoji (same as X / clipboard)
          </p>
          <div className="space-y-1 font-mono-ui text-[12px] leading-6 tracking-wide text-[var(--muted)]">
            {chronological.map((r, i) => (
              <div key={`emoji-${r.guess.id}-${i}`}>{langGuessToShareRow(r)}</div>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {status === "copied" ? (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center text-xs text-[var(--good)]"
          >
            Copied to clipboard
          </motion.p>
        ) : null}
        {status === "err" ? (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center text-xs text-[var(--bad)]"
          >
            Could not copy — try the emoji lines above
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
