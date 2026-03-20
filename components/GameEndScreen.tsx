"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

function tierMessage(score: number, total: number): string {
  if (total <= 0) return "—";
  if (score === total) return "Flawless run.";
  const r = score / total;
  if (r >= 0.8) return "Sharp instincts.";
  if (r >= 0.6) return "Solid work.";
  if (r >= 0.4) return "Mixed signals.";
  if (score > 0) return "A few slipped through.";
  return "Tomorrow’s another seed.";
}

const perfectTagline: Record<string, string> = {
  stars: "You called every bracket right.",
  ipo: "Not a single miss on the tape.",
  timeline: "The whole timeline bent your way.",
  complexity: "Every bound — spot on.",
};

type Variant = "stars" | "ipo" | "timeline" | "complexity";

export function GameEndScreen({
  variant,
  score,
  total,
  title,
  noun,
  community,
}: {
  variant: Variant;
  title: string;
  /** Short noun for the summary line, e.g. "repos" */
  noun: string;
  score: number;
  total: number;
  /** Optional Firestore-backed community stats (solvers + distribution). */
  community?: ReactNode;
}) {
  const perfect = total > 0 && score === total;
  const blurb = perfect
    ? perfectTagline[variant] ?? tierMessage(score, total)
    : tierMessage(score, total);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      className="relative overflow-hidden rounded-md border border-[var(--line)] bg-[var(--bg-raised)] px-6 py-8 sm:px-8"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[color-mix(in_srgb,var(--accent)_55%,transparent)] to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-8 -left-4 h-24 w-40 rotate-12 border border-[var(--line)] opacity-40"
      />

      <div className="relative flex flex-col items-center text-center">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]"
        >
          {title}
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 22 }}
          className="font-display mt-4 text-2xl font-medium text-[var(--fg)] sm:text-3xl"
        >
          {perfect ? "Closed the book" : "Round set complete"}
        </motion.h2>

        <motion.div
          className="mt-6 flex gap-1.5"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: { staggerChildren: 0.07, delayChildren: 0.2 },
            },
          }}
        >
          {Array.from({ length: total }, (_, i) => (
            <motion.span
              key={i}
              variants={{
                hidden: { opacity: 0, scaleY: 0.25 },
                show: {
                  opacity: 1,
                  scaleY: 1,
                  transition: { type: "spring", stiffness: 500, damping: 24 },
                },
              }}
              style={{ transformOrigin: "bottom" }}
              className={`h-9 w-2.5 rounded-sm sm:h-10 sm:w-3 ${
                i < score
                  ? "bg-[color-mix(in_srgb,var(--good)_75%,var(--bg))] shadow-[0_0_12px_color-mix(in_srgb,var(--good)_25%,transparent)]"
                  : "bg-[color-mix(in_srgb,var(--fg)_8%,transparent)]"
              }`}
            />
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="font-mono-ui mt-5 text-sm text-[var(--muted)]"
        >
          <span className="text-[var(--good)]">{score}</span>
          <span className="text-[var(--muted2)]"> / </span>
          <span>{total}</span>
          <span className="text-[var(--muted2)]"> {noun}</span>
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mt-4 max-w-sm text-sm leading-relaxed text-[var(--muted)]"
        >
          {blurb}
        </motion.p>

        {community}

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.58 }}
          className="mt-6 border-t border-[var(--line)] pt-5 font-mono-ui text-[11px] leading-relaxed text-[var(--muted2)]"
        >
          New puzzles at UTC midnight ·{" "}
          <Link
            href="/"
            className="text-[var(--accent)] underline-offset-2 transition-colors hover:text-[var(--accent-bright)] hover:underline"
          >
            All games
          </Link>{" "}
          for the rest of today’s set
        </motion.p>
      </div>
    </motion.div>
  );
}
