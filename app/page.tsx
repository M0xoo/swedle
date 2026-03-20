import type { Metadata } from "next";
import { DailyPuzzleDate } from "@/components/DailyPuzzleDate";
import { HomeGameTiles } from "@/components/HomeGameTiles";
import { HubTotal } from "@/components/HubTotal";
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
            One fresh set each UTC day. No logins — scores stay in your
            browser.
          </p>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
            <DailyPuzzleDate dateKey={dateKey} variant="home" />
            <span className="text-[var(--muted2)]">Quiz points</span>
            <HubTotal dateKey={dateKey} />
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2">
          <HomeGameTiles dateKey={dateKey} games={HOME_GAMES} />
        </section>

        <footer className="border-t border-[var(--line)] pt-8 text-xs leading-relaxed text-[var(--muted2)]">
          Static data and daily seeds — star counts and IPO figures are
          snapshots for fair play, not live market data.
        </footer>
      </main>
    </div>
  );
}
