#!/usr/bin/env node
/**
 * LLM plays Langdle → per-beat TTS (known durations) → Playwright sleeps match each clip
 * → concat WAV + leading silence (page load) → mux MP4
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import {
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

async function main() {
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

  console.log("Date (UTC):", dateKey);
  console.log("BASE_URL:", baseUrl);

  console.log("LLM plays Langdle in Node…");
  const play = await runLlmLangPlay(dateKey);
  await writeFile(
    join(outDir, "llm-trace.json"),
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
    "Replay:",
    play.guesses.map((g) => g.name).join(" → "),
    play.won ? "✓" : "(exhausted)",
  );

  const playForNarr = {
    dateKey: play.dateKey,
    turns: play.turns,
    won: play.won,
    secretName: play.secret.name,
    secret: play.secret,
  };

  console.log("Narration segments (JSON)…");
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

  console.log(`TTS ${segments.length} clips + ffprobe…`);
  const wavAbsPaths = [];
  const durationRows = [];
  const playbackSteps = [];

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
    console.log(`  ${fname}  ${sec.toFixed(2)}s  ${seg.phase}${seg.turn != null ? ` #${seg.turn}` : ""}`);
  }

  await writeFile(
    join(outDir, "segment-durations.json"),
    JSON.stringify(durationRows, null, 2),
    "utf8",
  );

  await concatWavFiles(wavAbsPaths, narrRaw);
  const rawTotal = await ffprobeDurationSeconds(narrRaw);
  console.log("narration-raw.wav total:", rawTotal.toFixed(2), "s");

  console.log("Recording (Playwright steps = clip lengths)…");
  const { setupMs } = await recordLangGameplay({
    baseUrl,
    guesses: play.guesses,
    outVideo: rawWebm,
    playbackSteps,
  });
  console.log("setupMs (prepended silence):", setupMs);

  await prependSilenceToWav(setupMs / 1000, narrRaw, narrWav);
  const narrTotal = await ffprobeDurationSeconds(narrWav);
  console.log("narration.wav (with lead silence):", narrTotal.toFixed(2), "s");

  console.log("Muxing…");
  await mergeVideoAndWav(rawWebm, narrWav, finalMp4);
  console.log("Done:", finalMp4);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
