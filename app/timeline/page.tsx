import { GameShell } from "@/components/GameShell";
import { TimelineGame } from "@/components/TimelineGame";
import { getUtcDateKey } from "@/lib/daily";
import { getDailyTimeline } from "@/lib/games/timeline";

export default function TimelinePage() {
  const dateKey = getUtcDateKey();
  const rows = getDailyTimeline(dateKey).map((t) => ({
    left: t.left,
    right: t.right,
  }));

  return (
    <GameShell
      title="Chrono Commit"
      subtitle="The earlier event keeps the left slot; a new challenger appears on the right each round."
      dateKey={dateKey}
    >
      <TimelineGame dateKey={dateKey} rows={rows} />
    </GameShell>
  );
}
