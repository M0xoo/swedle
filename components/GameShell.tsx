import Link from "next/link";
import type { ReactNode } from "react";

export function GameShell({
  title,
  subtitle,
  dateKey,
  children,
}: {
  title: string;
  subtitle?: string;
  dateKey: string;
  children: ReactNode;
}) {
  return (
    <div className="relative mx-auto flex min-h-full w-full max-w-2xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-4 border-b border-[var(--line)] pb-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="text-sm font-medium tracking-wide text-[var(--muted)] transition-colors hover:text-[var(--accent-bright)]"
          >
            ← SWEDLE
          </Link>
          <time
            dateTime={dateKey}
            className="font-mono-ui border border-[var(--line)] bg-[var(--bg-raised)] px-2.5 py-1 text-[11px] tracking-wide text-[var(--muted)]"
          >
            {dateKey} UTC
          </time>
        </div>
        <div>
          <h1 className="font-display text-[1.65rem] font-medium leading-tight tracking-tight text-[var(--fg)] sm:text-[2rem]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2.5 max-w-prose text-sm leading-relaxed text-[var(--muted)]">
              {subtitle}
            </p>
          ) : null}
        </div>
      </header>
      {children}
    </div>
  );
}
