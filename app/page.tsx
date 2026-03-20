import type { Metadata } from "next";
import { DailyPuzzleDate } from "@/components/DailyPuzzleDate";
import { HomeGameTiles } from "@/components/HomeGameTiles";
import { getUtcDateKey } from "@/lib/daily";
import { HOME_GAMES } from "@/lib/home-games";
import { SITE_DESCRIPTION } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: "SWEDLE — daily games for software engineers" },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

export default function Home() {
  const dateKey = getUtcDateKey();

  return (
    <div className="bg-grain relative min-h-full">
      <main className="relative z-[1] mx-auto flex min-h-full w-full max-w-3xl flex-col gap-14 px-4 py-16 sm:px-6 sm:py-24">
        <header className="space-y-5">
          <p className="font-mono-ui text-[11px] uppercase tracking-[0.22em] text-[var(--accent)]">
            Daily puzzles
          </p>
          <h1 className="font-display text-[clamp(2.5rem,8vw,3.75rem)] font-medium leading-[0.95] tracking-tight text-[var(--fg)]">
            SWEDLE
          </h1>
          <p className="max-w-md text-[1.05rem] leading-relaxed text-[var(--muted)]">
            SWEDLE is a daily puzzle hub for software engineers: six mini-games
            spanning programming languages, a code-snippet reveal, open-source
            star brackets, IPO trivia, Big‑O complexity, and tech-history
            timelines. Everyone gets the same daily set; it turns over at UTC
            midnight. No sign-up—your progress stays in the browser.
          </p>
          <div className="text-sm">
            <DailyPuzzleDate dateKey={dateKey} variant="home" />
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2">
          <HomeGameTiles dateKey={dateKey} games={HOME_GAMES} />
        </section>
      </main>
    </div>
  );
}
