import type { Metadata } from "next";
import Link from "next/link";
import { HubTotal } from "@/components/HubTotal";
import { getUtcDateKey } from "@/lib/daily";
import { SITE_DESCRIPTION } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: "SWEDLE — daily games for software engineers" },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

const games = [
  {
    href: "/lang",
    title: "Langdle",
    blurb: "Guess the language from paradigm, platforms, year, and more — green means exact, orange means close.",
  },
  {
    href: "/stars",
    title: "Star Battle",
    blurb: "Five rounds in a row: the winner stays on the left, a new repo challenges from the right.",
  },
  {
    href: "/ipo",
    title: "IPO Showdown",
    blurb: "Same chain mechanic — winner holds the left slot while a new company enters on the right.",
  },
  {
    href: "/complexity",
    title: "Big‑O Blitz",
    blurb: "Pick the tightest complexity bound — algorithms and data structures, no tricks.",
  },
  {
    href: "/timeline",
    title: "Chrono Commit",
    blurb: "Earlier event keeps the left; five rounds, new challenger on the right each time.",
  },
] as const;

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
            <time
              dateTime={dateKey}
              className="font-mono-ui border border-[var(--line)] bg-[var(--bg-raised)] px-2.5 py-1 text-xs text-[var(--muted)]"
            >
              {dateKey}
            </time>
            <span className="text-[var(--muted2)]">Quiz points</span>
            <HubTotal dateKey={dateKey} />
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2">
          {games.map((g) => (
            <Link key={g.href} href={g.href} className="game-tile group block">
              <h2 className="font-display text-lg font-medium text-[var(--fg)] group-hover:text-[var(--accent-bright)]">
                {g.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                {g.blurb}
              </p>
              <span className="mt-4 inline-block text-xs font-medium tracking-wide text-[var(--accent)]">
                Open →
              </span>
            </Link>
          ))}
        </section>

        <footer className="border-t border-[var(--line)] pt-8 text-xs leading-relaxed text-[var(--muted2)]">
          Static data and daily seeds — star counts and IPO figures are
          snapshots for fair play, not live market data.
        </footer>
      </main>
    </div>
  );
}
