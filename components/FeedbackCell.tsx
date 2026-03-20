"use client";

import { motion } from "framer-motion";
import type { FeedbackTone } from "@/lib/types";

const cellClass: Record<FeedbackTone, string> = {
  green: "cell-hit",
  orange: "cell-near",
  gray: "cell-miss",
};

export function FeedbackCell({
  tone,
  label,
  value,
  revealed,
  hint,
}: {
  tone: FeedbackTone;
  label: string;
  value: string;
  revealed: boolean;
  hint?: "up" | "down";
}) {
  const c = cellClass[tone];
  return (
    <motion.div
      layout
      initial={false}
      animate={
        revealed
          ? tone === "green"
            ? {
                scale: [1, 1.02, 1],
                filter: ["brightness(1)", "brightness(1.08)", "brightness(1)"],
              }
            : tone === "orange"
              ? { x: [0, -2, 2, -1, 1, 0] }
              : { x: [0, -4, 4, -3, 3, 0] }
          : {}
      }
      transition={{ duration: tone === "green" ? 0.42 : 0.48 }}
      className={`flex min-h-[3.75rem] min-w-0 flex-col justify-center rounded-md px-2 py-1.5 sm:min-h-[4.25rem] sm:px-2.5 sm:py-2 ${c}`}
    >
      <span className="text-[9px] font-medium uppercase tracking-[0.12em] text-[var(--muted)] sm:text-[10px]">
        {label}
      </span>
      <span
        className={`mt-0.5 flex min-w-0 items-center gap-0.5 text-xs font-medium leading-tight sm:text-sm sm:leading-snug ${hint ? "flex-nowrap whitespace-nowrap" : "flex-wrap break-words"}`}
      >
        {value}
        {hint === "up" ? (
          <span className="select-none opacity-90" aria-label="Later year">
            ↑
          </span>
        ) : null}
        {hint === "down" ? (
          <span className="select-none opacity-90" aria-label="Earlier year">
            ↓
          </span>
        ) : null}
      </span>
    </motion.div>
  );
}
