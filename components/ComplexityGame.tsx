"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { submitComplexityAnswer } from "@/app/actions";
import { bumpScore, readScore } from "@/lib/score";
import { DailyCommunityStats } from "@/components/DailyCommunityStats";
import { GameEndScreen } from "@/components/GameEndScreen";
import { PersistHint } from "@/components/PersistHint";
import { ScorePulse } from "@/components/ScorePulse";
import { usePersistedQuiz } from "@/hooks/usePersistedQuiz";
import { GAME_DISPLAY_TITLE } from "@/lib/game-titles";

type Q = { prompt: string; choices: [string, string, string] };

export function ComplexityGame({
  dateKey,
  questions,
}: {
  dateKey: string;
  questions: Q[];
}) {
  const total = questions.length;
  const { i, setI, done, setDone, ready } = usePersistedQuiz(
    dateKey,
    "complexity",
    total,
  );
  const [score, setScore] = useState(() => readScore(dateKey, "complexity"));
  const [last, setLast] = useState<boolean | null>(null);
  const [pulse, setPulse] = useState(0);
  const [busy, setBusy] = useState(false);

  const q = questions[i];

  async function pick(idx: 0 | 1 | 2) {
    if (!q || busy || done) return;
    setBusy(true);
    setLast(null);
    const res = await submitComplexityAnswer(dateKey, i, idx);
    const correct = res.ok && res.correct;
    setLast(correct);
    if (correct) {
      const s = bumpScore(dateKey, "complexity", 1);
      setScore(s);
      setPulse(1);
      window.setTimeout(() => setPulse(0), 700);
    } else {
      setPulse(-1);
      window.setTimeout(() => setPulse(0), 700);
    }
    window.setTimeout(() => {
      if (i + 1 >= total) setDone(true);
      else setI((x) => x + 1);
      setBusy(false);
    }, 520);
  }

  if (!ready) {
    return (
      <div className="flex flex-col gap-6">
        <PersistHint />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">
          Question {Math.min(i + 1, total)} / {total}
        </p>
        <p className="font-mono-ui text-sm text-[var(--fg)]">
          Points {score}
          <ScorePulse delta={pulse} show={pulse !== 0} />
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!done && q ? (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <p className="text-base leading-relaxed text-[var(--fg)]">
              {q.prompt}
            </p>
            <div className="flex flex-col gap-2">
              {q.choices.map((c, idx) => (
                <button
                  key={c}
                  type="button"
                  disabled={busy}
                  onClick={() => pick(idx as 0 | 1 | 2)}
                  className="choice-surface font-mono-ui px-4 py-3 text-left text-sm text-[var(--accent-bright)] transition-colors disabled:opacity-40"
                >
                  {c}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <GameEndScreen
            key="fin"
            variant="complexity"
            title={GAME_DISPLAY_TITLE.complexity}
            noun="hits"
            score={score}
            total={total}
            community={
              <DailyCommunityStats
                dateKey={dateKey}
                game="complexity"
                kind="quiz"
                userScore={score}
              />
            }
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
            Exact bound
          </motion.p>
        ) : null}
        {!done && last === false ? (
          <motion.p
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-sm font-medium text-[var(--bad)]"
          >
            Off
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
