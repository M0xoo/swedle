"use client";

import { motion, AnimatePresence } from "framer-motion";

export function ScorePulse({
  delta,
  show,
}: {
  delta: number;
  show: boolean;
}) {
  return (
    <AnimatePresence>
      {show ? (
        <motion.span
          key={delta}
          initial={{ opacity: 0, y: 8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6 }}
          className={`ml-2 inline-block font-mono-ui text-sm ${
            delta > 0 ? "text-[var(--good)]" : "text-[var(--bad)]"
          }`}
        >
          {delta > 0 ? `+${delta}` : delta}
        </motion.span>
      ) : null}
    </AnimatePresence>
  );
}
