/**
 * ffprobe duration + mux video (webm) + WAV → H.264/AAC MP4, pad to same length.
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function binPath(pkg, fallback) {
  try {
    const p = require(pkg);
    if (typeof p === "string" && p.length > 0) return p;
    if (p && typeof p.path === "string" && p.path.length > 0) return p.path;
    if (p && typeof p.default === "string" && p.default.length > 0)
      return p.default;
    return fallback;
  } catch {
    return fallback;
  }
}

const FFPROBE_BIN =
  process.env.FFPROBE_PATH || binPath("ffprobe-static", "ffprobe");
const FFMPEG_BIN =
  process.env.FFMPEG_PATH || binPath("ffmpeg-static", "ffmpeg");

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0) resolve(out.trim());
      else reject(new Error(`${cmd} ${args.join(" ")} → ${code}\n${err}`));
    });
  });
}

export async function ffprobeDurationSeconds(file) {
  const out = await run(FFPROBE_BIN, [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    file,
  ]);
  const n = parseFloat(out, 10);
  if (!Number.isFinite(n)) throw new Error(`Bad duration for ${file}: "${out}"`);
  return n;
}

/**
 * Pad video with cloned last frame and/or pad audio with silence so both match targetDur.
 */
/** Concatenate PCM WAVs (same sample rate/channels) with stream copy. */
export async function concatWavFiles(absPaths, outWav) {
  if (absPaths.length === 0) throw new Error("concatWavFiles: no inputs");
  const { writeFile, unlink } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const listPath = join(tmpdir(), `swedle-concat-${Date.now()}.txt`);
  const body = absPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
  await writeFile(listPath, body, "utf8");
  try {
    await run(FFMPEG_BIN, [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listPath,
      "-c:a",
      "pcm_s16le",
      "-ar",
      "24000",
      "-ac",
      "1",
      outWav,
    ]);
  } finally {
    await unlink(listPath).catch(() => {});
  }
}

/** Prepend silence so video time 0 (incl. page load) aligns with audio time 0. */
export async function prependSilenceToWav(leadSec, inputWav, outWav) {
  if (leadSec <= 0.001) {
    await run(FFMPEG_BIN, ["-y", "-i", inputWav, "-c", "copy", outWav]);
    return;
  }
  await run(FFMPEG_BIN, [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "anullsrc=r=24000:cl=mono",
    "-i",
    inputWav,
    "-filter_complex",
    `[0:a]atrim=start=0:duration=${leadSec},asetpts=PTS-STARTPTS[a0];[1:a]aresample=24000,aformat=sample_fmts=s16:channel_layouts=mono,asetpts=PTS-STARTPTS[a1];[a0][a1]concat=n=2:v=0:a=1[a]`,
    "-map",
    "[a]",
    "-c:a",
    "pcm_s16le",
    "-ar",
    "24000",
    "-ac",
    "1",
    outWav,
  ]);
}

/** WebM screen capture → H.264 MP4, no audio (for --skip-audio runs). */
export async function webmToMp4VideoOnly(videoWebm, outMp4) {
  await run(FFMPEG_BIN, [
    "-y",
    "-i",
    videoWebm,
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    "-an",
    "-movflags",
    "+faststart",
    outMp4,
  ]);
}

export async function mergeVideoAndWav(videoWebm, audioWav, outMp4) {
  const vDur = await ffprobeDurationSeconds(videoWebm);
  const aDur = await ffprobeDurationSeconds(audioWav);
  const slack = 0.35;
  const target = Math.max(vDur, aDur) + slack;
  const padV = Math.max(0, target - vDur);
  const padA = Math.max(0, target - aDur);

  // Resample to 48 kHz for AAC; use s16 (not fltp) before the encoder to avoid edge-case
  // hiss on some ffmpeg/AAC builds.
  const fc = [
    `[0:v]tpad=stop_mode=clone:stop_duration=${padV},format=yuv420p[v]`,
    `[1:a]apad=pad_dur=${padA},aresample=48000,aformat=sample_fmts=s16:channel_layouts=mono[a]`,
  ].join(";");

  await run(FFMPEG_BIN, [
    "-y",
    "-i",
    videoWebm,
    "-i",
    audioWav,
    "-filter_complex",
    fc,
    "-map",
    "[v]",
    "-map",
    "[a]",
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "23",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-ar",
    "48000",
    "-movflags",
    "+faststart",
    "-t",
    String(target),
    outMp4,
  ]);
}
