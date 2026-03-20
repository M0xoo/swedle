import type { Metadata } from "next";
import { GameShell } from "@/components/GameShell";
import { LangGame } from "@/components/LangGame";
import { LANGUAGES } from "@/lib/data";
import { getUtcDateKey } from "@/lib/daily";
import { GAME_DISPLAY_TITLE } from "@/lib/game-titles";

export const metadata: Metadata = {
  title: GAME_DISPLAY_TITLE.lang,
  description:
    "Guess the secret programming language in six tries using paradigm, open source, execution model, platforms, and year — Wordle-style green, orange, and gray clues. New language every UTC day.",
  alternates: { canonical: "/lang" },
  openGraph: {
    title: `${GAME_DISPLAY_TITLE.lang} | SWEDLE`,
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
      title={GAME_DISPLAY_TITLE.lang}
      subtitle="Guess today’s programming language in six tries. Each guess scores five traits — green is an exact match, orange is in the right neighborhood, gray is a miss."
      dateKey={dateKey}
    >
      <LangGame dateKey={dateKey} languages={options} />
    </GameShell>
  );
}
