"use client";

import { useState } from "react";
import { LayoutGroup, motion, AnimatePresence } from "framer-motion";
import { submitIpoPick } from "@/app/actions";
import type { IpoMode } from "@/lib/games/ipos";
import { ipoPrompt } from "@/lib/games/ipos";
import { bumpScore, readScore } from "@/lib/score";
import type { IpoEntry } from "@/lib/types";
import { GameEndScreen } from "@/components/GameEndScreen";
import { ScorePulse } from "@/components/ScorePulse";

type Round = { left: IpoEntry; right: IpoEntry; mode: IpoMode };

function cardClass(side: "left" | "right", highlight: "left" | "right" | null) {
  const win = highlight === side;
  const lose = highlight !== null && highlight !== side;
  return [
    "choice-surface w-full p-5 text-left disabled:opacity-40",
    win ? "choice-surface--correct" : "",
    lose ? "choice-surface--dim" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function IpoGame({
  dateKey,
  rounds,
}: {
  dateKey: string;
  rounds: Round[];
}) {
  const [i, setI] = useState(0);
  const [score, setScore] = useState(() => readScore(dateKey, "ipo"));
  const [last, setLast] = useState<boolean | null>(null);
  const [pulse, setPulse] = useState(0);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [highlight, setHighlight] = useState<"left" | "right" | null>(null);

  const r = rounds[i];
  const total = rounds.length;

  async function pick(side: "left" | "right") {
    if (!r || busy || done) return;
    setBusy(true);
    setLast(null);
    setHighlight(null);
    const res = await submitIpoPick(dateKey, i, side);
    const correct = res.ok && res.correct;
    setLast(correct);
    if (res.ok) setHighlight(res.winningSide);
    if (correct) {
      const s = bumpScore(dateKey, "ipo", 1);
      setScore(s);
      setPulse(1);
      window.setTimeout(() => setPulse(0), 700);
    } else {
      setPulse(-1);
      window.setTimeout(() => setPulse(0), 700);
    }
    window.setTimeout(() => {
      setHighlight(null);
      if (i + 1 >= total) setDone(true);
      else setI((x) => x + 1);
      setBusy(false);
    }, 720);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">
          Round {Math.min(i + 1, total)} / {total}
        </p>
        <p className="font-mono-ui text-sm text-[var(--fg)]">
          Points {score}
          <ScorePulse delta={pulse} show={pulse !== 0} />
        </p>
      </div>

      <p className="text-center text-xs text-[var(--muted2)]">
        Winner moves to the left; the next company enters on the right.
      </p>

      <AnimatePresence mode="wait">
        {!done && r ? (
          <LayoutGroup id={`ipo-${dateKey}`}>
            <motion.div key="play" layout className="space-y-4">
              <motion.p
                key={`${i}-${r.mode}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center text-sm text-[var(--muted)]"
              >
                {ipoPrompt(r.mode)}
              </motion.p>
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  type="button"
                  layout
                  layoutId={`ipo-co-${r.left.id}`}
                  disabled={busy}
                  onClick={() => pick("left")}
                  initial={i === 0 ? { opacity: 0, y: 12 } : false}
                  animate={{
                    opacity: 1,
                    y: 0,
                    x:
                      highlight === "right"
                        ? [0, -5, 5, -4, 4, 0]
                        : 0,
                  }}
                  transition={{
                    layout: { type: "spring", stiffness: 420, damping: 34 },
                    opacity: { duration: 0.25 },
                    x: { duration: 0.45 },
                  }}
                  className={cardClass("left", highlight)}
                >
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                    {i === 0 ? "Side A" : "Defending"}
                  </p>
                  <p className="mt-2 font-display text-lg font-medium text-[var(--fg)]">
                    {r.left.company}
                  </p>
                  <p className="font-mono-ui mt-1 text-xs text-[var(--muted2)]">
                    IPO {r.left.year}
                  </p>
                </motion.button>
                <motion.button
                  key={r.right.id}
                  type="button"
                  layout
                  layoutId={`ipo-co-${r.right.id}`}
                  disabled={busy}
                  onClick={() => pick("right")}
                  initial={
                    i === 0
                      ? { opacity: 0, y: 12 }
                      : { opacity: 0, x: 52, scale: 0.98 }
                  }
                  animate={{
                    opacity: 1,
                    x:
                      highlight === "left"
                        ? [0, 5, -5, 4, -4, 0]
                        : 0,
                    y: 0,
                    scale: 1,
                  }}
                  transition={{
                    layout: { type: "spring", stiffness: 420, damping: 34 },
                    opacity: { duration: 0.28 },
                    x: { type: "spring", stiffness: 380, damping: 30 },
                    scale: { duration: 0.25 },
                  }}
                  className={cardClass("right", highlight)}
                >
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                    Challenger
                  </p>
                  <p className="mt-2 font-display text-lg font-medium text-[var(--fg)]">
                    {r.right.company}
                  </p>
                  <p className="font-mono-ui mt-1 text-xs text-[var(--muted2)]">
                    IPO {r.right.year}
                  </p>
                </motion.button>
              </div>
            </motion.div>
          </LayoutGroup>
        ) : (
          <GameEndScreen
            key="fin"
            variant="ipo"
            title="IPO Showdown"
            noun="hits"
            score={score}
            total={total}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!done && last === true ? (
          <motion.p
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-sm font-medium text-[var(--good)]"
          >
            Nice
          </motion.p>
        ) : null}
        {!done && last === false ? (
          <motion.p
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-sm font-medium text-[var(--bad)]"
          >
            Miss
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
