# SWEDLE

Daily mini-games for software engineers. A new puzzle set every **UTC calendar day**—no accounts; progress and scores live in the browser (`localStorage`).

## Games

| Game | What you do |
|------|----------------|
| **Langdle** | Guess the programming language in six tries. Five clues per guess (paradigm, open source, execution model, platforms, year) with Wordle-style feedback—green exact, orange close, gray miss; year hints with ↑ / ↓. Share grid via **Copy text** or **Post on X** ([react-share](https://github.com/nygardk/react-share)). |
| **Star Battle** | Five rounds in a **chain**: the factual winner stays on the **left**, a new repo challenges from the right. Pick who has more GitHub stars (fixed snapshot data). |
| **IPO Showdown** | Same chain mechanic for companies—higher opening valuation or earlier IPO per round (rough figures, not live data). |
| **Big‑O Blitz** | Five multiple-choice complexity questions. |
| **Chrono Commit** | Which tech event happened first—winner stays left, new event on the right. |

Quiz games (everything except Langdle) show a richer **end screen** when you finish the run. **Progress** (current round, Langdle guess rows, finished state) is restored after refresh for the same UTC day.

## Tech stack

- **Next.js 16** (App Router), **React 19**, **TypeScript**
- **Tailwind CSS v4**
- **Framer Motion** (transitions / comparisons)
- **react-share** (`XShareButton` for X.com intent URLs)

Server actions validate picks where answers must stay server-side; daily puzzles are **deterministic** from the date string + seeded PRNG (`lib/seed.ts`).

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build   # production build
npm run start   # run production server
npm run lint    # ESLint
```

## Project layout

```
app/           # Routes: /, /lang, /stars, /ipo, /complexity, /timeline
components/    # UI (games, GameShell, GameEndScreen, LangShareButton, …)
data/          # JSON datasets (languages, repos, IPOs, timeline, complexity)
hooks/         # usePersistedQuiz
lib/           # seed, daily UTC key, game logic, scores, persistence
```

`app/layout.tsx` sets `dynamic = "force-dynamic"` so “today” is resolved per request (UTC).

## Data disclaimer

Repo star counts, IPO ballpark numbers, and timeline years are **curated snapshots** for fair, repeatable dailies—not live market or GitHub data.

## Deploy

Any Node host that supports Next.js works (e.g. [Vercel](https://vercel.com/docs/frameworks/nextjs)). Set nothing special unless you add env-based config later.
