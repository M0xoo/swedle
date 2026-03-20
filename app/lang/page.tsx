import { GameShell } from "@/components/GameShell";
import { LangGame } from "@/components/LangGame";
import { LANGUAGES } from "@/lib/data";
import { getUtcDateKey } from "@/lib/daily";

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
