import type { Metadata } from "next";
import { GameShell } from "@/components/GameShell";
import { RevealGame } from "@/components/RevealGame";
import { LANGUAGES } from "@/lib/data";
import { getUtcDateKey } from "@/lib/daily";
import { GAME_DISPLAY_TITLE } from "@/lib/game-titles";
import { getDailyRevealSnippet } from "@/lib/games/reveal";

export const metadata: Metadata = {
  title: GAME_DISPLAY_TITLE.reveal,
  description:
    "Daily code snippet — guess the programming language. Wrong tries reveal more of the source. Six guesses, new puzzle every UTC day.",
  alternates: { canonical: "/reveal" },
  openGraph: {
    title: `${GAME_DISPLAY_TITLE.reveal} | SWEDLE`,
    description:
      "Guess the language from a growing code snippet — six tries, new puzzle daily.",
    url: "/reveal",
  },
};

export default function RevealPage() {
  const dateKey = getUtcDateKey();
  const snippet = getDailyRevealSnippet(dateKey);
  const options = LANGUAGES.map((l) => ({ id: l.id, name: l.name }));

  return (
    <GameShell
      title={GAME_DISPLAY_TITLE.reveal}
      subtitle="A snippet is masked at first. Each wrong language unlocks more lines until you spot it — or run out of guesses."
      dateKey={dateKey}
    >
      <RevealGame dateKey={dateKey} code={snippet.code} languages={options} />
    </GameShell>
  );
}
