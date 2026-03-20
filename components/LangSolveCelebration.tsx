"use client";

import { useMemo, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

const SPECK_COUNT = 18;

const gradientShell =
  "relative overflow-visible rounded-lg bg-gradient-to-b from-[color-mix(in_srgb,var(--good)_22%,transparent)] via-[color-mix(in_srgb,var(--accent)_10%,transparent)] to-[color-mix(in_srgb,var(--fg)_2.5%,var(--bg))] px-5 py-6 ring-1 ring-[color-mix(in_srgb,var(--good)_22%,var(--line))] sm:px-7 sm:py-8";

export function LangSolveCelebration({
  label,
  title,
  body,
}: {
  label: ReactNode;
  title: ReactNode;
  body: ReactNode;
}) {
  const reduce = useReducedMotion();
  const specks = useMemo(
    () =>
      Array.from({ length: SPECK_COUNT }, (_, i) => ({
        id: i,
        angle: (i / SPECK_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.4,
        dist: 36 + Math.random() * 58,
        delay: i * 0.026,
        size: 2.5 + Math.random() * 3,
        warm: i % 3 !== 0,
      })),
    [],
  );

  if (reduce) {
    return (
      <div className={gradientShell}>
        {label}
        {title}
        {body}
      </div>
    );
  }

  return (
    <motion.div
      className={gradientShell}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0.97, 1] }}
      transition={{ duration: 0.75, times: [0, 0.35, 0.55, 1] }}
    >
      <motion.div
        className="pointer-events-none absolute left-1/2 top-[4.25rem] h-px w-px -translate-x-1/2 overflow-visible sm:top-[5rem]"
        aria-hidden
      >
        {specks.map((s) => (
          <motion.span
            key={s.id}
            className={`absolute top-0 rounded-full ${
              s.warm ? "bg-[var(--accent-bright)]" : "bg-[var(--good)]"
            }`}
            style={{
              width: s.size,
              height: s.size,
              left: -s.size / 2,
              top: -s.size / 2,
              boxShadow: "0 0 12px color-mix(in srgb, var(--good) 45%, transparent)",
            }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
            animate={{
              x: Math.cos(s.angle) * s.dist,
              y: Math.sin(s.angle) * s.dist,
              opacity: [0, 1, 0],
              scale: [0, 1.2, 0.35],
            }}
            transition={{
              duration: 0.78,
              delay: s.delay,
              ease: [0.2, 0.9, 0.2, 1],
            }}
          />
        ))}
      </motion.div>

      <div className="relative z-[1]">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          {label}
        </motion.div>
        <motion.div
          initial={{ scale: 0.82, opacity: 0, filter: "blur(12px)" }}
          animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            mass: 0.75,
          }}
        >
          {title}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {body}
        </motion.div>
      </div>
    </motion.div>
  );
}
