import type { Metadata } from "next";
import { GameShell } from "@/components/GameShell";
import { StarsGame } from "@/components/StarsGame";
import { getUtcDateKey } from "@/lib/daily";
import { getDailyStarBattle } from "@/lib/games/stars";
import { GAME_DISPLAY_TITLE } from "@/lib/game-titles";

export const metadata: Metadata = {
  title: GAME_DISPLAY_TITLE.stars,
  description:
    "Daily bracket: pick which famous open-source repo has more GitHub stars. The winner stays on the left for five rounds.",
  alternates: { canonical: "/stars" },
  openGraph: {
    title: `${GAME_DISPLAY_TITLE.stars} | SWEDLE`,
    url: "/stars",
  },
};

export default function StarsPage() {
  const dateKey = getUtcDateKey();
  const rounds = getDailyStarBattle(dateKey).map(({ left, right }) => ({
    left,
    right,
  }));

  return (
    <GameShell
      title={GAME_DISPLAY_TITLE.stars}
      subtitle="Five rounds in one chain: each round’s winner stays on the left and faces a new repo on the right. Star counts are a fixed snapshot for everyone today."
      dateKey={dateKey}
    >
      <StarsGame dateKey={dateKey} rounds={rounds} />
    </GameShell>
  );
}
