#!/usr/bin/env node
/**
 * Mux only: existing gameplay.webm + narration.wav → lang-short.mp4
 * (requires a full pipeline run first, or pass explicit paths).
 */
import { access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { mergeVideoAndWav } from "./ffmpeg-merge.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
dotenv.config({ path: join(root, ".env") });

function utcDateKey(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const argv = process.argv.slice(2);
  let videoWebm;
  let audioWav;
  let outMp4;

  if (argv.length === 3) {
    [videoWebm, audioWav, outMp4] = argv;
  } else if (argv.length === 0) {
    const dateKey = process.env.DATE_KEY?.trim() || utcDateKey();
    const outDir = join(root, "out", `lang-${dateKey}`);
    videoWebm = join(outDir, "gameplay.webm");
    audioWav = join(outDir, "narration.wav");
    outMp4 = join(outDir, "lang-short.mp4");
    console.log("DATE_KEY:", dateKey);
  } else {
    console.error(
      "Usage: node scripts/merge-lang-short.mjs [video.webm narration.wav out.mp4]",
    );
    console.error(
      "Or run with no args: uses out/lang-<DATE_KEY>/{gameplay.webm,narration.wav} → lang-short.mp4 (DATE_KEY env or today UTC).",
    );
    process.exit(1);
  }

  for (const label of [
    [videoWebm, "video"],
    [audioWav, "audio"],
  ]) {
    if (!(await exists(label[0]))) {
      throw new Error(`Missing ${label[1]}: ${label[0]}`);
    }
  }

  console.log("Video:", videoWebm);
  console.log("Audio:", audioWav);
  console.log("Out:  ", outMp4);
  await mergeVideoAndWav(videoWebm, audioWav, outMp4);
  console.log("Done:", outMp4);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
