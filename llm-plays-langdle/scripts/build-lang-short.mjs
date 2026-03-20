#!/usr/bin/env node
/**
 * Pipeline (in order):
 *   1) Play game — LLM in Node, write llm-trace.json
 *   2) Record audios — narration JSON + TTS + segment WAVs + narration-raw.wav
 *   3) Playwright — timed replay → gameplay.webm (or fast replay when --skip-audio)
 *   4) Final video — prepend + mux with narration → lang-short.mp4 (or video-only MP4 when --skip-audio)
 *
 * --skip-audio  → skip step 2–4 audio: fast Playwright (no TTS-timed sleeps), gameplay.webm → MP4 (no sound)
 * --skip-video  → skip steps 3–4 after step 2
 * both          → step 1 only
 *
 * Flags: --skip-audio | --no-audio  --skip-video | --no-video  -h | --help
 * Env: SKIP_AUDIO=1  SKIP_VIDEO=1
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { generateNarrationSegments, textToSpeechWav } from "./gemini-audio.mjs";
import {
  concatWavFiles,
  ffprobeDurationSeconds,
  mergeVideoAndWav,
  prependSilenceToWav,
  webmToMp4VideoOnly,
} from "./ffmpeg-merge.mjs";
import { runLlmLangPlay } from "./llm-lang-play.mjs";
import { recordLangGameplay } from "./record-lang-gameplay.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
dotenv.config({ path: join(root, ".env") });

function utcDateKey(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function truthyEnv(v) {
  const s = String(v ?? "").toLowerCase().trim();
  return s === "1" || s === "true" || s === "yes";
}

function parseFlags(argv) {
  let skipAudio = truthyEnv(process.env.SKIP_AUDIO);
  let skipVideo = truthyEnv(process.env.SKIP_VIDEO);
  for (const a of argv) {
    if (a === "--skip-audio" || a === "--no-audio") skipAudio = true;
    if (a === "--skip-video" || a === "--no-video") skipVideo = true;
    if (a === "-h" || a === "--help") return { help: true, skipAudio, skipVideo };
  }
  return { help: false, skipAudio, skipVideo };
}

function printHelp() {
  console.log(`Usage: node scripts/build-lang-short.mjs [options]

Pipeline:
  1) Play game (LLM) → llm-trace.json
  2) Record audios → narration + TTS + narration-raw.wav
  3) Playwright → gameplay.webm (timed to TTS, or fast back-to-back guesses if --skip-audio)
  4) narration.wav + mux → lang-short.mp4 (or video-only MP4 if --skip-audio)

Options:
  --skip-audio, --no-audio   Skip narration/TTS/WAV entirely. Playwright replays guesses immediately
                             (no intro/react/outro waits). Output: gameplay.webm + silent lang-short.mp4.
  --skip-video, --no-video   After step 2 (or 1 if also skip-audio), stop — no WebM/MP4.
  -h, --help

Both skips: only step 1 (game + trace).

Env: SKIP_AUDIO=1  SKIP_VIDEO=1
`);
}

async function main() {
  const { help, skipAudio, skipVideo } = parseFlags(process.argv.slice(2));
  if (help) {
    printHelp();
    process.exit(0);
  }

  const baseUrl = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(
    /\/$/,
    "",
  );
  const dateKey = process.env.DATE_KEY?.trim() || utcDateKey();

  const outDir = join(root, "out", `lang-${dateKey}`);
  const audioDir = join(outDir, "segments");
  await mkdir(audioDir, { recursive: true });
  const rawWebm = join(outDir, "gameplay.webm");
  const narrRaw = join(outDir, "narration-raw.wav");
  const narrWav = join(outDir, "narration.wav");
  const finalMp4 = join(outDir, "lang-short.mp4");
  const tracePath = join(outDir, "llm-trace.json");
  const recordMetaPath = join(outDir, "record-meta.json");

  console.log("Date (UTC):", dateKey);
  console.log("BASE_URL:", baseUrl);
  if (skipAudio) console.log("— skip-audio: no TTS; fast Playwright; video-only MP4");
  if (skipVideo) console.log("— skip-video: no WebM / MP4");

  console.log("\n1) Play game (LLM in Node)…");
  const play = await runLlmLangPlay(dateKey);
  await writeFile(
    tracePath,
    JSON.stringify(
      {
        dateKey: play.dateKey,
        won: play.won,
        secretId: play.secret.id,
        secretName: play.secret.name,
        turns: play.turns,
        replayOrder: play.guesses.map((g) => ({ id: g.id, name: g.name })),
        gameModel: play.modelUsed,
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(
    "   Guesses:",
    play.guesses.map((g) => g.name).join(" → "),
    play.won ? "✓" : "(exhausted)",
  );

  if (skipAudio && skipVideo) {
    console.log(
      "\n— skip-audio + skip-video: done after step 1 (llm-trace.json written).",
    );
    return;
  }

  const playForNarr = {
    dateKey: play.dateKey,
    turns: play.turns,
    won: play.won,
    secretName: play.secret.name,
    secret: play.secret,
  };

  let playbackSteps;

  if (skipAudio) {
    console.log("\n2) Record audios — skipped (no WAV / narration)");
  } else {
    console.log("\n2) Record audios (narration + TTS + concat)…");
    const segments = await generateNarrationSegments(playForNarr);
    await writeFile(
      join(outDir, "narration-segments.json"),
      JSON.stringify(segments, null, 2),
      "utf8",
    );
    await writeFile(
      join(outDir, "script.txt"),
      segments.map((s) => `## ${s.id} (${s.phase})\n${s.text}\n`).join("\n"),
      "utf8",
    );

    console.log(`   TTS ${segments.length} clips + ffprobe…`);
    const wavAbsPaths = [];
    const durationRows = [];
    playbackSteps = [];

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const safeId = String(seg.id).replace(/[^\w-]+/g, "-");
      const fname = `${String(i).padStart(3, "0")}-${safeId}.wav`;
      const wavPath = join(audioDir, fname);
      await textToSpeechWav(seg.text, wavPath, seg.phase);
      const sec = await ffprobeDurationSeconds(wavPath);
      wavAbsPaths.push(resolve(wavPath));
      durationRows.push({
        id: seg.id,
        phase: seg.phase,
        turn: seg.turn,
        durationSec: sec,
      });
      const step = { phase: seg.phase, durationMs: sec * 1000 };
      if (seg.phase === "guess") {
        if (seg.turn == null || !Number.isFinite(seg.turn)) {
          throw new Error(`Segment ${seg.id}: guess phase needs numeric turn`);
        }
        step.guessIndex = seg.turn - 1;
      }
      playbackSteps.push(step);
      console.log(
        `   ${fname}  ${sec.toFixed(2)}s  ${seg.phase}${seg.turn != null ? ` #${seg.turn}` : ""}`,
      );
    }

    await writeFile(
      join(outDir, "segment-durations.json"),
      JSON.stringify(durationRows, null, 2),
      "utf8",
    );
    await writeFile(
      join(outDir, "playback-steps.json"),
      JSON.stringify(playbackSteps, null, 2),
      "utf8",
    );

    await concatWavFiles(wavAbsPaths, narrRaw);
    const rawTotal = await ffprobeDurationSeconds(narrRaw);
    console.log("   narration-raw.wav total:", rawTotal.toFixed(2), "s");
  }

  if (skipVideo) {
    console.log(
      "\n3–4) Playwright + export — skipped.\nDone (--skip-video).",
    );
    return;
  }

  console.log("\n3) Playwright recording…");
  const rec = await recordLangGameplay({
    baseUrl,
    guesses: play.guesses,
    outVideo: rawWebm,
    ...(skipAudio
      ? { fastReplay: true }
      : { playbackSteps }),
  });
  const setupMs = rec.setupMs;
  await writeFile(
    recordMetaPath,
    JSON.stringify(
      { setupMs, fastReplay: Boolean(skipAudio) },
      null,
      2,
    ),
    "utf8",
  );
  console.log("   setupMs:", setupMs, skipAudio ? "(fast replay)" : "");

  if (skipAudio) {
    console.log("\n4) Encode MP4 (video only, no audio)…");
    await webmToMp4VideoOnly(rawWebm, finalMp4);
    console.log("Done:", finalMp4);
    return;
  }

  console.log("\n4) Prepend silence + mux with narration…");
  await prependSilenceToWav(setupMs / 1000, narrRaw, narrWav);
  const narrTotal = await ffprobeDurationSeconds(narrWav);
  console.log("   narration.wav:", narrTotal.toFixed(2), "s");
  await mergeVideoAndWav(rawWebm, narrWav, finalMp4);
  console.log("Done:", finalMp4);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
