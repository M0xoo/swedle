import type { Metadata } from "next";
import { GameShell } from "@/components/GameShell";
import { LangGame } from "@/components/LangGame";
import { LANGUAGES } from "@/lib/data";
import { getUtcDateKey } from "@/lib/daily";

export const metadata: Metadata = {
  title: "Langdle",
  description:
    "Guess the secret programming language in six tries using paradigm, open source, execution model, platforms, and year — Wordle-style green, orange, and gray clues. New language every UTC day.",
  alternates: { canonical: "/lang" },
  openGraph: {
    title: "Langdle | SWEDLE",
    description:
      "Daily programming language guessing game with five clues per guess.",
    url: "/lang",
  },
};

export default function LangPage() {
  const dateKey = getUtcDateKey();
  const options = LANGUAGES.map((l) => ({ id: l.id, name: l.name }));

  return (
    <GameShell
      title="Langdle"
      subtitle="Guess today’s language in six tries. Each guess scores five traits — green is an exact match, orange is in the right neighborhood, gray is a miss."
      dateKey={dateKey}
    >
      <LangGame dateKey={dateKey} languages={options} />
    </GameShell>
  );
}
