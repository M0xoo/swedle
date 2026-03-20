"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { buildLangShareMessage, langGuessToShareRow } from "@/lib/lang-share";
import type { LangGuessResult } from "@/lib/games/language";

export function LangShareButton({
  dateKey,
  rowsNewestFirst,
}: {
  dateKey: string;
  rowsNewestFirst: LangGuessResult[];
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "err">("idle");

  const chronological = [...rowsNewestFirst].reverse();

  const share = useCallback(async () => {
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
    <div className="space-y-3">
      <button
        type="button"
        onClick={share}
        className="w-full rounded-md border border-[color-mix(in_srgb,var(--good)_35%,var(--line))] bg-[color-mix(in_srgb,var(--good)_10%,var(--bg-raised))] px-4 py-3 text-sm font-medium text-[var(--fg)] transition-colors hover:bg-[color-mix(in_srgb,var(--good)_16%,var(--bg-raised))]"
      >
        Share result
      </button>
      <div className="panel font-mono-ui p-3 text-[13px] leading-relaxed text-[var(--muted)]">
        {chronological.map((r, i) => (
          <div key={`${r.guess.id}-${i}`} className="tracking-wide">
            {langGuessToShareRow(r)}
          </div>
        ))}
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
            Could not copy — try again or copy the grid above
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
