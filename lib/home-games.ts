import { GAME_DISPLAY_TITLE } from "@/lib/game-titles";

export type HomeGamePersistId =
  | "lang"
  | "reveal"
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
    href: "/reveal",
    title: GAME_DISPLAY_TITLE.reveal,
    blurb:
      "A code snippet hides in the shadows — wrong guesses pull back the curtain until you name the language.",
    persistId: "reveal",
  },
  {
    href: "/stars",
    title: GAME_DISPLAY_TITLE.stars,
    blurb:
      "Famous open-source projects and GitHub star counts — pick the repo with more stars in five daily matchups (fixed snapshot for everyone).",
    persistId: "stars",
  },
  {
    href: "/ipo",
    title: GAME_DISPLAY_TITLE.ipo,
    blurb:
      "Tech company IPOs — compare opening valuations and who listed earlier in five head-to-heads using rough, static figures (not live markets).",
    persistId: "ipo",
  },
  {
    href: "/complexity",
    title: GAME_DISPLAY_TITLE.complexity,
    blurb:
      "Time and space complexity for real algorithms and data structures — five multiple-choice picks for the tightest Big‑O bound.",
    persistId: "complexity",
  },
  {
    href: "/timeline",
    title: GAME_DISPLAY_TITLE.timeline,
    blurb:
      "Moments from computing history — releases, launches, and milestones. Decide which happened first across five daily comparisons.",
    persistId: "timeline",
  },
];
