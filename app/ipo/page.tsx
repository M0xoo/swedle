import { GameShell } from "@/components/GameShell";
import { IpoGame } from "@/components/IpoGame";
import { getUtcDateKey } from "@/lib/daily";
import { getDailyIpoQuiz } from "@/lib/games/ipos";

export default function IpoPage() {
  const dateKey = getUtcDateKey();
  const rounds = getDailyIpoQuiz(dateKey).map(({ left, right, mode }) => ({
    left,
    right,
    mode,
  }));

  return (
    <GameShell
      title="IPO Showdown"
      subtitle="Winner stays left, next company enters right. Valuation vs earlier IPO changes each round. Rough figures — not investment advice."
      dateKey={dateKey}
    >
      <IpoGame dateKey={dateKey} rounds={rounds} />
    </GameShell>
  );
}
