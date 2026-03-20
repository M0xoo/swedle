"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { submitLanguageGuess } from "@/app/actions";
import { FeedbackCell } from "@/components/FeedbackCell";
import { DailyCommunityStats } from "@/components/DailyCommunityStats";
import { LangShareButton } from "@/components/LangShareButton";
import { PersistHint } from "@/components/PersistHint";
import type { LangGuessResult } from "@/lib/games/language";
import {
  labelExecution,
  labelPlatforms,
} from "@/lib/games/language";
import { loadLangProgress, saveLangProgress } from "@/lib/game-persist";
import type { Language } from "@/lib/types";

const PARADIGM_LABEL: Record<string, string> = {
  oop: "Mostly OOP",
  functional: "Mostly functional",
  procedural: "Mostly procedural",
  multi: "Multi-paradigm",
  declarative: "Declarative",
};

function paradigmText(l: Language) {
  return PARADIGM_LABEL[l.paradigm] ?? l.paradigm;
}

export function LangGame({
  dateKey,
  languages,
}: {
  dateKey: string;
  languages: Pick<Language, "id" | "name">[];
}) {
  const sorted = useMemo(
    () => [...languages].sort((a, b) => a.name.localeCompare(b.name)),
    [languages],
  );
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<LangGuessResult[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    const saved = loadLangProgress(dateKey);
    if (saved && saved.length > 0) setRows(saved);
    setHydrated(true);
  }, [dateKey]);

  useEffect(() => {
    if (!hydrated) return;
    saveLangProgress(dateKey, rows);
  }, [dateKey, rows, hydrated]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted.slice(0, 8);
    return sorted.filter(
      (l) =>
        l.name.toLowerCase().includes(q) || l.id.toLowerCase().includes(q),
    ).slice(0, 12);
  }, [query, sorted]);

  const solved = rows.some((r) => r.solved);
  const exhausted = rows.length >= 6;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

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
        const res = await submitLanguageGuess(dateKey, id);
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
      <div className="panel p-4">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
          Guess a language
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
            placeholder="Search (e.g. Rust, Erlang)…"
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
                <li className="px-4 py-3 text-sm text-[var(--muted)]">No match</li>
              ) : null}
            </ul>
          ) : null}
        </div>
        {error ? (
          <p className="mt-2 text-sm text-[var(--bad)]">{error}</p>
        ) : null}
        <p className="mt-3 text-xs text-[var(--muted2)]">
          {solved
            ? "Solved — come back tomorrow."
            : exhausted
              ? "Out of guesses."
              : `${6 - rows.length} guesses left`}
        </p>
        {solved && rows.length > 0 ? (
          <div className="mt-5 border-t border-[var(--line)] pt-5">
            <LangShareButton dateKey={dateKey} rowsNewestFirst={rows} />
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
          Clues
        </p>
        <p className="text-[10px] leading-relaxed text-[var(--muted2)]">
          Green = exact · Orange = close / partial · Gray = miss · Year arrows:
          ↑ later · ↓ earlier
        </p>
        <AnimatePresence initial={false}>
          {rows.map((r) => (
            <motion.div
              key={r.guess.id}
              layout
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              <p className="font-medium text-xs text-[var(--muted)]">
                {r.guess.name}
              </p>
              <div className="grid min-w-0 grid-cols-5 gap-1.5 sm:gap-2">
                <FeedbackCell
                  tone={r.cells.paradigm}
                  label="Paradigm"
                  value={paradigmText(r.guess)}
                  revealed
                />
                <FeedbackCell
                  tone={r.cells.openSource}
                  label="Open source"
                  value={r.guess.openSource ? "Yes" : "No"}
                  revealed
                />
                <FeedbackCell
                  tone={r.cells.execution}
                  label="Execution"
                  value={labelExecution(r.guess.execution)}
                  revealed
                />
                <FeedbackCell
                  tone={r.cells.platforms}
                  label="Platforms"
                  value={labelPlatforms(r.guess.platforms)}
                  revealed
                />
                <FeedbackCell
                  tone={r.cells.year}
                  label="Year"
                  value={String(r.guess.year)}
                  hint={r.yearHint ?? undefined}
                  revealed
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {solved || exhausted ? (
        <div className="flex justify-center">
          <DailyCommunityStats
            dateKey={dateKey}
            game="lang"
            kind="lang"
            userScore={solved && rows.length > 0 ? rows.length : 0}
          />
        </div>
      ) : null}
    </div>
  );
}
