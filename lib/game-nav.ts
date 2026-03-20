/** Same order as the hub (`app/page.tsx`). Next wraps from last → first. */
export type QuizEndVariant = "stars" | "ipo" | "complexity" | "timeline";

export function nextGameAfterQuiz(variant: QuizEndVariant): {
  href: string;
  title: string;
} {
  const m: Record<QuizEndVariant, { href: string; title: string }> = {
    stars: { href: "/ipo", title: "IPO Showdown" },
    ipo: { href: "/complexity", title: "Big‑O Blitz" },
    complexity: { href: "/timeline", title: "Chrono Commit" },
    timeline: { href: "/lang", title: "Langdle" },
  };
  return m[variant];
}

export const nextGameAfterLang = {
  href: "/stars",
  title: "Star Battle",
} as const;
