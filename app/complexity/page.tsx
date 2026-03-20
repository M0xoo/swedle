import type { Metadata } from "next";
import { GameShell } from "@/components/GameShell";
import { ComplexityGame } from "@/components/ComplexityGame";
import { getUtcDateKey } from "@/lib/daily";
import { getDailyComplexity } from "@/lib/games/complexity";
import { GAME_DISPLAY_TITLE } from "@/lib/game-titles";

export const metadata: Metadata = {
  title: GAME_DISPLAY_TITLE.complexity,
  description:
    "Five daily multiple-choice questions on time and space complexity — algorithms and data structures.",
  alternates: { canonical: "/complexity" },
  openGraph: {
    title: `${GAME_DISPLAY_TITLE.complexity} | SWEDLE`,
    url: "/complexity",
  },
};

export default function ComplexityPage() {
  const dateKey = getUtcDateKey();
  const questions = getDailyComplexity(dateKey).map((q) => ({
    prompt: q.prompt,
    choices: q.choices,
  }));

  return (
    <GameShell
      title={GAME_DISPLAY_TITLE.complexity}
      subtitle="Five multiple-choice bounds — worst case unless the prompt says otherwise."
      dateKey={dateKey}
    >
      <ComplexityGame dateKey={dateKey} questions={questions} />
    </GameShell>
  );
}
