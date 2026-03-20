import { GAME_DISPLAY_TITLE } from "@/lib/game-titles";

/** Same order as the hub (`app/page.tsx`). Next wraps from last → first. */
export type QuizEndVariant = "stars" | "ipo" | "complexity" | "timeline";

export function nextGameAfterQuiz(variant: QuizEndVariant): {
  href: string;
  title: string;
} {
  const m: Record<QuizEndVariant, { href: string; title: string }> = {
    stars: { href: "/ipo", title: GAME_DISPLAY_TITLE.ipo },
    ipo: { href: "/complexity", title: GAME_DISPLAY_TITLE.complexity },
    complexity: { href: "/timeline", title: GAME_DISPLAY_TITLE.timeline },
    timeline: { href: "/lang", title: GAME_DISPLAY_TITLE.lang },
  };
  return m[variant];
}

export const nextGameAfterLang = {
  href: "/stars",
  title: GAME_DISPLAY_TITLE.stars,
} as const;
