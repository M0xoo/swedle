# LLM plays Langdle (video pipeline)

Generates a **vertical MP4** of **Langdle**: a **Gemini model plays the real game in Node** (green/orange/gray feedback each turn), then **Playwright replays** the same guesses with **waits driven by ffprobe’d TTS clips** (intro → each round: “guess” + “react”, except **no react after the winning guess** → outro). Tracked in git; put secrets in `.env` (ignored globally) and outputs under `out/` (ignored here).

## Requirements

1. **SWEDLE running** — e.g. from repo root: `npm run dev` (default URL `http://127.0.0.1:3000`). Restart dev after pulling so LangGame includes `data-testid="lang-search-input"` (the recorder also falls back to the search placeholder).  
   **HMR WebSocket “handshake” / `ERR_INVALID_HTTP_RESPONSE` in the recorder terminal** is common with `next dev` + headless Chromium; it does not break Langdle. For a quiet run, use production mode: `npm run build && npx next start -p 3000` and the same `BASE_URL`.
2. **Gemini API key** — [Google AI Studio](https://aistudio.google.com/apikey): used for (a) **playing** Langdle in a text loop, (b) **writing** the narration, (c) **TTS**.
3. **Chromium** — `npm install` runs `npx playwright install chromium`.

FFmpeg/ffprobe: bundled via `ffmpeg-static` / `ffprobe-static`. Override with `FFMPEG_PATH` / `FFPROBE_PATH` if you want system binaries.

## Setup

```bash
cd llm-plays-langdle
npm install
cp .env.example .env
# Set GEMINI_API_KEY in .env
```

## One-command Langdle short

With the app reachable:

```bash
npm run record:lang
```

**Skip flags** (always **play the game** first; then optional steps):

| Order | Step | `--skip-audio` | `--skip-video` |
|-------|------|----------------|----------------|
| 1 | LLM play → `llm-trace.json` | runs | runs |
| 2 | Narration + TTS → `narration-raw.wav` | **skipped** (reuse `narration-raw.wav` + `playback-steps.json`; must match this run’s beat count) | runs |
| 3 | Playwright → `gameplay.webm` | runs | **skipped** |
| 4 | Prepend + mux → `narration.wav`, `lang-short.mp4` | runs | **skipped** |

**Both** skips: only step **1** (trace written, then exit). To mux existing `gameplay.webm` + `narration.wav` only, use **`merge:lang`** below.

Env mirrors flags: `SKIP_AUDIO=1`, `SKIP_VIDEO=1`.

```bash
npm run record:lang -- --skip-audio
npm run record:lang -- --skip-video
npm run record:lang -- --skip-audio --skip-video
```

A **full** run writes `playback-steps.json` and `record-meta.json`; reuse them when using `--skip-audio` (same puzzle / same number of narration beats as the cached audio).

**Mux only** (reuse `gameplay.webm` + `narration.wav` after changing merge settings):

```bash
DATE_KEY=2026-03-20 npm run merge:lang
# or explicit paths:
node scripts/merge-lang-short.mjs path/to/gameplay.webm path/to/narration.wav path/to/out.mp4
```

### Pipeline

1. **`llm-lang-play.mjs`** — Same daily secret as production (`data/languages.json` + date seed). Gemini gets rules + full id/name directory; each turn it returns `{"guessId":"..."}`; we run **`evaluateLanguageGuess`** locally and send back green/orange/gray (+ year ↑/↓). Repeat until solve or 6 guesses.
2. **`out/.../llm-trace.json`** — Turn-by-turn log + replay order (debug / B-roll).
3. **`gemini-audio.mjs`** — Flash returns **segment JSON**: intro → each round **guess** + **react** (react omitted if that round solved the puzzle) → outro. Each line is **TTS’d to its own WAV**; **ffprobe** gives exact seconds per beat. Voice **`Charon`** by default (`GEMINI_TTS_VOICE`).
4. **`record-lang-gameplay.mjs`** — **intro / react / outro** = hold UI for that clip’s duration. **guess** = hold for the **full** guess-audio duration (voice finishes “let’s try…”), **then** Playwright submits; **react** holds on the new clues; after a correct final guess the next beat is **outro** (board already shows the win).
5. **`ffmpeg-merge.mjs`** — Concat segment WAVs → `narration-raw.wav`, prepend **silence** equal to browser load time so audio lines up with the recording start, then mux MP4.

### Environment (optional)

| Variable | Default | Meaning |
|----------|---------|---------|
| `GEMINI_API_KEY` | — | Required. |
| `BASE_URL` | `http://127.0.0.1:3000` | SWEDLE origin (no trailing slash). |
| `DATE_KEY` | Today UTC `YYYY-MM-DD` | Must match the puzzle the **server** uses for `/lang`. |
| `GEMINI_GAME_MODEL` | (auto fallback) | Preferred model for the **play** loop. |
| `GEMINI_TTS_VOICE` | `Charon` | TTS preset voice name. |

### Outputs (`out/lang-<DATE_KEY>/`)

| File | Purpose |
|------|---------|
| `llm-trace.json` | LLM play + replay ids. |
| `narration-segments.json` | Intro / guess / react / outro lines. |
| `segments/*.wav` | One TTS file per beat (durations in `segment-durations.json`). |
| `narration-raw.wav` | Concatenated clips (no load padding). |
| `script.txt` | Same text as segments, for editing. |
| `narration.wav` | Clips + leading silence (aligned to video timeline). |
| `gameplay.webm` | Raw Playwright capture (1080×1920). |
| `lang-short.mp4` | H.264 + AAC for Shorts / TikTok / Reels. |

## Other script

- **`npm run tts:sample`** — Quick TTS smoke test → `out/sample.wav` (uses `GEMINI_TTS_VOICE` or Charon).

## Limits

- **Langdle only** for now.
- One Flash call for segment JSON, then **one TTS call per clip** (intro + 2×guesses + outro); TTS model names may change.
- `DATE_KEY` must match server UTC day or feedback won’t match the site.
