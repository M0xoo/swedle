"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function NextGameButton({
  href,
  gameTitle,
  className = "",
}: {
  href: string;
  gameTitle: string;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.42, type: "spring", stiffness: 380, damping: 28 }}
      className={`w-full max-w-xs ${className}`.trim()}
    >
      <Link
        href={href}
        className="font-mono-ui flex w-full items-center justify-center gap-2 rounded-md border border-[color-mix(in_srgb,var(--accent)_48%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_11%,var(--bg-raised))] px-5 py-3 text-sm font-medium text-[var(--accent-bright)] transition-[border-color,background-color,transform] hover:border-[color-mix(in_srgb,var(--accent-bright)_55%,var(--line))] hover:bg-[color-mix(in_srgb,var(--accent)_18%,var(--bg-raised))] active:scale-[0.99]"
      >
        Next game
        <span className="text-[var(--muted2)]">·</span>
        <span>{gameTitle}</span>
        <span aria-hidden className="text-[var(--accent)]">
          →
        </span>
      </Link>
    </motion.div>
  );
}
