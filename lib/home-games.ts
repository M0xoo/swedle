import { GAME_DISPLAY_TITLE } from "@/lib/game-titles";

export type HomeGamePersistId =
  | "lang"
  | "stars"
  | "ipo"
  | "complexity"
  | "timeline";

export type HomeGameEntry = {
  href: string;
  title: string;
  blurb: string;
  persistId: HomeGamePersistId;
};

export const HOME_GAMES: HomeGameEntry[] = [
  {
    href: "/lang",
    title: GAME_DISPLAY_TITLE.lang,
    blurb:
      "Guess the language from paradigm, platforms, year, and more — green means exact, orange means close.",
    persistId: "lang",
  },
  {
    href: "/stars",
    title: GAME_DISPLAY_TITLE.stars,
    blurb:
      "Five rounds in a row: the winner stays on the left, a new repo challenges from the right.",
    persistId: "stars",
  },
  {
    href: "/ipo",
    title: GAME_DISPLAY_TITLE.ipo,
    blurb:
      "Same chain mechanic — winner holds the left slot while a new company enters on the right.",
    persistId: "ipo",
  },
  {
    href: "/complexity",
    title: GAME_DISPLAY_TITLE.complexity,
    blurb:
      "Pick the tightest complexity bound — algorithms and data structures, no tricks.",
    persistId: "complexity",
  },
  {
    href: "/timeline",
    title: GAME_DISPLAY_TITLE.timeline,
    blurb:
      "Earlier event keeps the left; five rounds, new challenger on the right each time.",
    persistId: "timeline",
  },
];
