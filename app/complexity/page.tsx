import type { Metadata } from "next";
import { GameShell } from "@/components/GameShell";
import { ComplexityGame } from "@/components/ComplexityGame";
import { getUtcDateKey } from "@/lib/daily";
import { getDailyComplexity } from "@/lib/games/complexity";

export const metadata: Metadata = {
  title: "Big‑O Blitz",
  description:
    "Five daily multiple-choice questions on time and space complexity — algorithms and data structures.",
  alternates: { canonical: "/complexity" },
  openGraph: {
    title: "Big‑O Blitz | SWEDLE",
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
      title="Big‑O Blitz"
      subtitle="Five multiple-choice bounds — worst case unless the prompt says otherwise."
      dateKey={dateKey}
    >
      <ComplexityGame dateKey={dateKey} questions={questions} />
    </GameShell>
  );
}
