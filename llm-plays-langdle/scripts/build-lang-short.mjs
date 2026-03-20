#!/usr/bin/env node
/**
 * Pipeline (in order):
 *   1) Play game — LLM in Node, write llm-trace.json
 *   2) Record audios — narration JSON + TTS + segment WAVs + narration-raw.wav
 *   3) Playwright — timed replay → gameplay.webm
 *   4) Final video — prepend load silence + mux → narration.wav + lang-short.mp4
 *
 * --skip-audio  → skip step 2 only (reuse narration-raw.wav + playback-steps.json; must match this run’s beat count)
 * --skip-video  → skip steps 3–4 (no WebM, no MP4, no prepend)
 * both          → step 1 only
 *
 * Flags: --skip-audio | --no-audio  --skip-video | --no-video  -h | --help
 * Env: SKIP_AUDIO=1  SKIP_VIDEO=1
 */
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import {
  buildExpectedNarrationSpec,
  generateNarrationSegments,
  textToSpeechWav,
} from "./gemini-audio.mjs";
import {
  concatWavFiles,
  ffprobeDurationSeconds,
  mergeVideoAndWav,
  prependSilenceToWav,
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

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function readJson(p) {
  return JSON.parse(await readFile(p, "utf8"));
}

function requirePath(ok, path, hint) {
  if (!ok) throw new Error(`Missing ${hint}: ${path}`);
}

/**
 * Load timing from a prior full run; phases must match this game’s expected beats
 * (same number of guesses / win row as buildExpectedNarrationSpec(play)).
 */
async function loadCachedPlaybackSteps(outDir, play) {
  const spec = buildExpectedNarrationSpec(play);
  const stepsPath = join(outDir, "playback-steps.json");
  requirePath(await fileExists(stepsPath), stepsPath, "playback-steps.json");
  const steps = await readJson(stepsPath);
  if (!Array.isArray(steps) || steps.length !== spec.length) {
    throw new Error(
      `--skip-audio: need playback-steps.json with ${spec.length} steps for this game (got ${steps?.length ?? 0}). Run once without --skip-audio after the same puzzle outcome, or regenerate audio.`,
    );
  }
  for (let i = 0; i < spec.length; i++) {
    if (steps[i].phase !== spec[i].phase) {
      throw new Error(
        `--skip-audio: playback-steps.json[${i}].phase is "${steps[i].phase}", expected "${spec[i].phase}"`,
      );
    }
  }
  return steps;
}

function printHelp() {
  console.log(`Usage: node scripts/build-lang-short.mjs [options]

Pipeline:
  1) Play game (LLM) → llm-trace.json
  2) Record audios → narration JSON, TTS, segment WAVs, narration-raw.wav
  3) Playwright → gameplay.webm
  4) Prepend + mux → narration.wav, lang-short.mp4

Options:
  --skip-audio, --no-audio   Skip step 2 only. Reuses narration-raw.wav + playback-steps.json;
                             beat count and phases must match this run (same puzzle shape).
  --skip-video, --no-video   Skip steps 3–4 (no Playwright, no WebM, no prepend, no MP4).
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
  if (skipAudio) console.log("— skip-audio: skipping step 2 (TTS / narration-raw build)");
  if (skipVideo) console.log("— skip-video: skipping steps 3–4 (Playwright + mux)");

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

  if (!skipAudio) {
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
  } else {
    console.log("\n2) Record audios — skipped (reusing cached files)");
    requirePath(await fileExists(narrRaw), narrRaw, "narration-raw.wav");
    playbackSteps = await loadCachedPlaybackSteps(outDir, play);
  }

  if (skipVideo) {
    console.log(
      "\n3–4) Playwright + final video — skipped.\nDone (--skip-video).",
    );
    return;
  }

  console.log("\n3) Playwright recording…");
  const rec = await recordLangGameplay({
    baseUrl,
    guesses: play.guesses,
    outVideo: rawWebm,
    playbackSteps,
  });
  const setupMs = rec.setupMs;
  await writeFile(
    recordMetaPath,
    JSON.stringify({ setupMs }, null, 2),
    "utf8",
  );
  console.log("   setupMs (prepended silence):", setupMs);

  console.log("\n4) Prepend silence + mux MP4…");
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
