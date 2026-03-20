"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getRevealAnswer, submitRevealGuess } from "@/app/actions";
import { DailyCommunityStats } from "@/components/DailyCommunityStats";
import { LangSolveCelebration } from "@/components/LangSolveCelebration";
import { NextGameButton } from "@/components/NextGameButton";
import { PersistHint } from "@/components/PersistHint";
import { nextGameAfterReveal } from "@/lib/game-nav";
import { loadRevealProgress, saveRevealProgress } from "@/lib/game-persist";
import {
  REVEAL_MAX_GUESSES,
  visibleSnippet,
  type SnippetGuessResult,
} from "@/lib/games/reveal";
import type { Language } from "@/lib/types";

export function RevealGame({
  dateKey,
  code,
  languages,
}: {
  dateKey: string;
  code: string;
  languages: Pick<Language, "id" | "name">[];
}) {
  const sorted = useMemo(
    () => [...languages].sort((a, b) => a.name.localeCompare(b.name)),
    [languages],
  );
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<SnippetGuessResult[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<{ id: string; name: string } | null>(
    null,
  );

  useLayoutEffect(() => {
    setAnswer(null);
    const saved = loadRevealProgress(dateKey);
    if (saved && saved.length > 0) setRows(saved);
    setHydrated(true);
  }, [dateKey]);

  useEffect(() => {
    if (!hydrated) return;
    saveRevealProgress(dateKey, rows);
  }, [dateKey, rows, hydrated]);

  const solved = rows.some((r) => r.solved);
  const exhausted = rows.length >= REVEAL_MAX_GUESSES;
  const solvedRow = useMemo(
    () => rows.find((r) => r.solved) ?? null,
    [rows],
  );

  const shown = useMemo(
    () => visibleSnippet(code, rows.length, solved),
    [code, rows.length, solved],
  );
  const truncated = shown.length < code.length;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!exhausted || solved || answer) return;
    let cancelled = false;
    void getRevealAnswer(dateKey).then((a) => {
      if (!cancelled) setAnswer(a);
    });
    return () => {
      cancelled = true;
    };
  }, [answer, dateKey, exhausted, solved]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted.slice(0, 8);
    return sorted
      .filter(
        (l) =>
          l.name.toLowerCase().includes(q) || l.id.toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [query, sorted]);

  const pick = useCallback(
    async (id: string) => {
      if (busy || solved || exhausted) return;
      if (rows.some((r) => r.guess.id === id)) {
        setError("Already guessed");
        return;
      }
      setBusy(true);
      setError(null);
      setOpen(false);
      setQuery("");
      try {
        const res = await submitRevealGuess(dateKey, id);
        if (!res) {
          setError("Unknown language");
          return;
        }
        setRows((prev) => [res, ...prev]);
      } finally {
        setBusy(false);
      }
    },
    [busy, dateKey, exhausted, rows, solved],
  );

  if (!hydrated) {
    return (
      <div className="flex flex-col gap-6">
        <PersistHint />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="panel overflow-hidden p-4">
        {exhausted && !solved ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--bad)_35%,var(--line))] bg-[color-mix(in_srgb,var(--bad)_8%,var(--bg))] px-4 py-5 ring-1 ring-[color-mix(in_srgb,var(--bad)_18%,transparent)] sm:px-5 sm:py-6"
          >
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-[var(--bad)]">
              Out of guesses
            </p>
            <p className="font-mono-ui mt-2 text-[11px] text-[var(--muted)]">
              The language was
            </p>
            <h2 className="font-display mt-1 text-[1.75rem] font-medium leading-tight tracking-tight text-[var(--fg)] sm:text-[2.1rem]">
              {answer?.name ?? "…"}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
              Here&apos;s the complete snippet. A new one replaces it at UTC
              midnight.
            </p>
            <pre className="mt-4 max-h-[min(22rem,50vh)] overflow-auto rounded-md border border-[var(--line)] bg-[color-mix(in_srgb,var(--fg)_3.5%,var(--bg))] p-4 text-left text-[11px] leading-relaxed text-[var(--fg)] sm:text-xs">
              <code className="font-mono-ui whitespace-pre">{code}</code>
            </pre>
          </motion.div>
        ) : (
          <>
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
              Today&apos;s snippet
            </p>
            <motion.pre
              layout
              className="mt-3 max-h-[min(24rem,55vh)] overflow-auto rounded-md border border-[var(--line)] bg-[color-mix(in_srgb,var(--fg)_3.5%,var(--bg))] p-4 text-left text-[11px] leading-relaxed text-[var(--fg)] sm:text-xs"
            >
              <code className="font-mono-ui whitespace-pre">{shown}</code>
              {truncated ? (
                <span
                  className="font-mono-ui text-[var(--muted2)]"
                  aria-hidden
                >{` \u00b7\u00b7\u00b7`}</span>
              ) : null}
            </motion.pre>
            {!solved && !exhausted ? (
              <p className="mt-3 text-xs text-[var(--muted2)]">
                Each wrong guess reveals more of the source.{" "}
                <span className="text-[var(--muted)]">
                  {REVEAL_MAX_GUESSES - rows.length} guesses left.
                </span>
              </p>
            ) : null}
          </>
        )}
      </div>

      {exhausted && !solved ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="flex flex-col items-center gap-6"
        >
          <DailyCommunityStats
            dateKey={dateKey}
            game="reveal"
            kind="lang"
            userScore={0}
          />
          <NextGameButton
            href={nextGameAfterReveal.href}
            gameTitle={nextGameAfterReveal.title}
          />
        </motion.div>
      ) : null}

      {(solved || !exhausted) && (
      <div className="panel p-4">
        {solved && solvedRow ? (
          <div>
            <LangSolveCelebration
              label={
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                  Language behind the code
                </p>
              }
              title={
                <h2 className="font-display mt-3 text-[2rem] font-medium leading-[1.1] tracking-tight text-[var(--fg)] drop-shadow-[0_0_28px_color-mix(in_srgb,var(--good)_35%,transparent)] sm:text-4xl sm:leading-[1.08]">
                  {solvedRow.guess.name}
                </h2>
              }
              body={
                <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
                  Nailed it — the full snippet was hiding in plain sight. New
                  puzzle when UTC midnight hits.
                </p>
              }
            />
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.4 }}
              className="mt-6 flex flex-col items-center gap-6 border-t border-[var(--line)] pt-6"
            >
              <DailyCommunityStats
                dateKey={dateKey}
                game="reveal"
                kind="lang"
                userScore={rows.length}
              />
              <NextGameButton
                href={nextGameAfterReveal.href}
                gameTitle={nextGameAfterReveal.title}
              />
            </motion.div>
          </div>
        ) : (
          <>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
              Guess the language
            </p>
            <div className="relative mt-3" ref={wrapRef}>
              <input
                value={query}
                disabled={solved || exhausted}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                placeholder="Search (e.g. Rust, Elixir)…"
                className="w-full rounded-md border border-[var(--line)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--fg)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--muted2)] focus:border-[color-mix(in_srgb,var(--accent)_55%,var(--line))] focus:shadow-[0_0_0_2px_color-mix(in_srgb,var(--accent)_12%,transparent)] disabled:opacity-50"
              />
              {open && !solved && !exhausted ? (
                <ul className="absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-md border border-[var(--line)] bg-[var(--bg-raised)] py-1 shadow-lg shadow-black/40">
                  {filtered.map((l) => (
                    <li key={l.id}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pick(l.id)}
                        className="flex w-full px-4 py-2.5 text-left text-sm text-[var(--fg)] hover:bg-[color-mix(in_srgb,var(--fg)_6%,transparent)]"
                      >
                        {l.name}
                      </button>
                    </li>
                  ))}
                  {filtered.length === 0 ? (
                    <li className="px-4 py-3 text-sm text-[var(--muted)]">
                      No match
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </div>
            {error ? (
              <p className="mt-2 text-sm text-[var(--bad)]">{error}</p>
            ) : null}
          </>
        )}
      </div>
      )}

      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
          Guesses
        </p>
        <AnimatePresence initial={false}>
          {rows.map((r) => (
            <motion.div
              key={`${r.guess.id}-${r.solved}`}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={
                r.solved
                  ? "rounded-lg bg-[color-mix(in_srgb,var(--good)_8%,transparent)] p-3 ring-1 ring-[var(--good-border)]"
                  : "rounded-md border border-[var(--line)] bg-[color-mix(in_srgb,var(--fg)_2%,transparent)] px-3 py-2"
              }
            >
              <p className="text-sm font-medium text-[var(--fg)]">
                {r.guess.name}
                {r.solved ? (
                  <span className="ml-2 font-mono-ui text-[10px] uppercase tracking-wider text-[var(--good)]">
                    Correct
                  </span>
                ) : (
                  <span className="ml-2 font-mono-ui text-[10px] uppercase tracking-wider text-[var(--muted2)]">
                    Miss
                  </span>
                )}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
