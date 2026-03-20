import { TIMELINE } from "@/lib/data";
import { createRng, pickMany } from "@/lib/seed";

export type TimelineEvent = {
  id: string;
  label: string;
  year: number;
};

export type TimelineRound = {
  left: TimelineEvent;
  right: TimelineEvent;
  winner: TimelineEvent;
};

function allEvents(): TimelineEvent[] {
  return TIMELINE.flatMap((t) => [
    { id: `${t.id}-L`, label: t.left, year: t.leftYear },
    { id: `${t.id}-R`, label: t.right, year: t.rightYear },
  ]);
}

function eventWinner(a: TimelineEvent, b: TimelineEvent): TimelineEvent {
  if (a.year !== b.year) return a.year < b.year ? a : b;
  return a.id < b.id ? a : b;
}

export function buildTimelineRounds(seq: TimelineEvent[]): TimelineRound[] {
  if (seq.length < 6) return [];
  const rounds: TimelineRound[] = [];
  let champ = seq[0]!;
  for (let i = 0; i < 5; i++) {
    const left = i === 0 ? seq[0]! : champ;
    const right = seq[i + 1]!;
    const winner = eventWinner(left, right);
    rounds.push({ left, right, winner });
    champ = winner;
  }
  return rounds;
}

export function getDailyTimeline(dateKey: string): TimelineRound[] {
  const rng = createRng(dateKey, "timeline");
  const pool = allEvents();
  const seq = pickMany(rng, pool, 6);
  return buildTimelineRounds(seq);
}
