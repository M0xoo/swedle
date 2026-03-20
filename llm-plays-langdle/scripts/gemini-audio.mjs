/**
 * Gemini: narration script (Flash) + TTS (preview TTS model) → WAV
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import wav from "wav";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
dotenv.config({ path: join(root, ".env") });

const TEXT_MODELS = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash"];
const TTS_MODEL = "gemini-2.5-flash-preview-tts";
/** Male-presenting preset voices (Gemini TTS): Charon, Fenrir, Puck, … */
const VOICE =
  process.env.GEMINI_TTS_VOICE?.trim() || "Charon";

function saveWaveFile(filename, pcmData, channels = 1, rate = 24000, sampleWidth = 2) {
  return new Promise((resolve, reject) => {
    const writer = new wav.FileWriter(filename, {
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });
    writer.on("finish", resolve);
    writer.on("error", reject);
    writer.write(pcmData);
    writer.end();
  });
}

function isRiffWav(buf) {
  return (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WAVE"
  );
}

/**
 * Gemini TTS often returns a **complete WAV** (RIFF) in inlineData. Writing that
 * through `wav.FileWriter` prepends a second header and treats bytes as PCM → static / “white noise”,
 * especially obvious after AAC in MP4.
 */
export async function writeGeminiTtsBytesToWavPath(
  outPath,
  audioBuffer,
  mimeType = "",
) {
  const mime = String(mimeType || "").toLowerCase();
  const alreadyWav =
    mime.includes("wav") || mime.includes("wave") || isRiffWav(audioBuffer);
  await mkdir(dirname(outPath), { recursive: true });
  if (alreadyWav) {
    await writeFile(outPath, audioBuffer);
    return;
  }
  await saveWaveFile(outPath, audioBuffer);
}

function pickGeminiAudioInline(response) {
  const parts = response.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  for (const p of parts) {
    const id = p.inlineData;
    if (id?.data) return id;
  }
  return null;
}

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "Missing GEMINI_API_KEY. Copy llm-plays-langdle/.env.example to .env and set your key.",
    );
  }
  return new GoogleGenAI({ apiKey });
}

const CFAMILY = new Set(["C", "C++", "C#"]);

/** Whether narration already disambiguates C vs C++ vs C# (for TTS). */
function narrationClearlyNamesLanguage(text, canonicalName) {
  const t = text;
  if (canonicalName === "C++") {
    return /\bc\s*\+\s*\+/i.test(t) || /\bc\s*plus\s*plus\b/i.test(t);
  }
  if (canonicalName === "C#") {
    return /c\s*#/i.test(t) || /\bc\s*sharp\b/i.test(t) || /c-sharp/i.test(t);
  }
  if (canonicalName === "C") {
    if (/\bc\s*\+\s*\+/i.test(t) || /\bc\s*plus\s*plus\b/i.test(t)) return false;
    if (/c\s*#/i.test(t) || /\bc\s*sharp\b/i.test(t) || /c-sharp/i.test(t))
      return false;
    return (
      /\bplain\s+c\b/i.test(t) ||
      /\bclassic\s+c\b/i.test(t) ||
      /\bthe\s+letter\s+c\b/i.test(t) ||
      /\bansi\s+c\b/i.test(t)
    );
  }
  return t.toLowerCase().includes(String(canonicalName).toLowerCase());
}

function prefixForCfFamilyNarration(canonicalName, phase) {
  if (canonicalName === "C") {
    return phase === "guess"
      ? "Plain classic C — not C plus plus, not C sharp. "
      : "For plain C — not C plus plus, not C sharp — ";
  }
  if (canonicalName === "C++") {
    return phase === "guess"
      ? "C plus plus — not plain C, not C sharp. "
      : "For C plus plus — ";
  }
  if (canonicalName === "C#") {
    return phase === "guess"
      ? "C sharp — not plain C, not C plus plus. "
      : "For C sharp — ";
  }
  return "";
}

/**
 * Fix LLM narration that blurs C / C++ / C# in guess + react clips (and outro secret).
 */
function applyCfFamilyNarrationGuards(segments, play) {
  const secretName = play.secretName ?? play.secret?.name ?? "";

  for (const seg of segments) {
    if (seg.phase === "guess" || seg.phase === "react") {
      const turn = seg.turn;
      if (turn == null || !play.turns[turn - 1]) continue;
      const name = play.turns[turn - 1].guessName;
      if (!CFAMILY.has(name)) continue;
      if (!narrationClearlyNamesLanguage(seg.text, name)) {
        seg.text = (prefixForCfFamilyNarration(name, seg.phase) + seg.text.trim()).trim();
      }
    }
    if (seg.phase === "outro" && secretName && CFAMILY.has(secretName)) {
      if (!narrationClearlyNamesLanguage(seg.text, secretName)) {
        const p =
          secretName === "C"
            ? "The answer was plain classic C — not C plus plus, not C sharp. "
            : secretName === "C++"
              ? "The answer was C plus plus — not plain C, not C sharp. "
              : "The answer was C sharp — not plain C, not C plus plus. ";
        seg.text = (p + seg.text.trim()).trim();
      }
    }
  }
  return segments;
}

function extractJsonObject(text) {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1] : trimmed;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Intro + per-turn guess + optional react + outro. No "react" after the winning guess
 * (solved turn) — voiceover goes straight to outro while the board shows the win.
 */
export function buildExpectedNarrationSpec(play) {
  const spec = [{ phase: "intro", turn: null }];
  for (const t of play.turns) {
    spec.push({ phase: "guess", turn: t.turn });
    if (!t.solved) spec.push({ phase: "react", turn: t.turn });
  }
  spec.push({ phase: "outro", turn: null });
  return spec;
}

/**
 * Template fallback if JSON generation fails (still one TTS file per beat).
 */
export function templateNarrationSegments(play) {
  const secretName = play.secretName ?? play.secret?.name ?? "the answer";
  const segs = [];
  segs.push({
    id: "00-intro",
    phase: "intro",
    turn: null,
    text: `Hey — let's play today's Langdle on SWEDLE.`,
  });
  for (const t of play.turns) {
    const gText =
      t.guessName === "C"
        ? "I'm locking in plain classic C — not C plus plus, not C sharp."
        : t.guessName === "C++"
          ? "I'm locking in C plus plus."
          : t.guessName === "C#"
            ? "I'm locking in C sharp."
            : `I'm locking in ${t.guessName}.`;
    segs.push({
      id: `${String(t.turn).padStart(2, "0")}-guess`,
      phase: "guess",
      turn: t.turn,
      text: gText,
    });
    if (!t.solved) {
      const y =
        t.yearHint === "up"
          ? " Secret year is later than my guess."
          : t.yearHint === "down"
            ? " Secret year is earlier than my guess."
            : "";
      const rHead =
        t.guessName === "C"
          ? "For plain C — not C plus plus, not C sharp — "
          : t.guessName === "C++"
            ? "For C plus plus — "
            : t.guessName === "C#"
              ? "For C sharp — "
              : `Results for ${t.guessName}: `;
      segs.push({
        id: `${String(t.turn).padStart(2, "0")}-react`,
        phase: "react",
        turn: t.turn,
        text: `${rHead}paradigm ${t.cells.paradigm}, open source ${t.cells.openSource}, execution ${t.cells.execution}, platforms ${t.cells.platforms}, year ${t.cells.year}.${y}`,
      });
    }
  }
  const outWin =
    secretName === "C"
      ? "Nailed it on SWEDLE. The answer was plain classic C — not C plus plus, not C sharp."
      : secretName === "C++"
        ? "Nailed it on SWEDLE. The answer was C plus plus."
        : secretName === "C#"
          ? "Nailed it on SWEDLE. The answer was C sharp."
          : `Nailed it on SWEDLE. The answer was ${secretName}.`;
  const outLose =
    secretName === "C"
      ? "Out of guesses. The language was plain classic C — not C plus plus, not C sharp."
      : secretName === "C++"
        ? "Out of guesses. The language was C plus plus."
        : secretName === "C#"
          ? "Out of guesses. The language was C sharp."
          : `Out of guesses. The language was ${secretName}.`;
  segs.push({
    id: "99-outro",
    phase: "outro",
    turn: null,
    text: play.won ? outWin : outLose,
  });
  return segs;
}

/**
 * Structured segments for per-clip TTS + exact Playwright timing (intro → guess + optional react per round → outro; no react after a solved turn).
 * @param {{ dateKey: string, turns: object[], won: boolean, secretName: string, secret: { name: string } }} play
 * @returns {Promise<Array<{ id: string, phase: string, turn: number|null, text: string }>>}
 */
export async function generateNarrationSegments(play) {
  const n = play.turns.length;
  const turnsBlock = JSON.stringify(play.turns, null, 2);
  const spec = buildExpectedNarrationSpec(play);
  const expected = spec.length;
  const orderHint = spec
    .map((s, i) => {
      const t =
        s.turn == null ? "" : ` turn=${s.turn}`;
      return `${i}:${s.phase}${t}`;
    })
    .join(", ");

  const prompt = `You write voiceover for a vertical tech Short. An AI played **Langdle** on **SWEDLE** (Wordle for programming languages: green exact, orange partial, gray miss; year hints up/down).

Return ONLY valid JSON (no markdown fences). Shape:
{"segments":[{"id":"00-intro","phase":"intro","turn":null,"text":"..."},...]}

STRICT structure:
1. First segment: phase "intro", turn null. **Very short:** a quick greeting, then **let's play today's Langdle** (on SWEDLE). One or two brief sentences total — no puzzle rules, no date, no filler. Upbeat male creator.
2. For each round k = 1..${n} in the data below (each object has \`solved\`):
   - phase "guess", turn k: first person, **about to try** that language. **If guessName is "C"**: you MUST say **plain C** or **classic C** and explicitly say it is **not C plus plus** and **not C sharp**. **If "C++"**: say **C plus plus** (words) or **C++** in text. **If "C#"**: say **C sharp** (words) or **C#**. Never say only "C" when you mean C++ or C#. Never vague "C family". 1–2 sentences.
   - phase "react", turn k: **ONLY if that round has \`"solved": false\`.** Same **guessName** disambiguation in the first phrase, then clue colors. Do NOT reveal the secret answer here. 2–5 sentences.
   - If that round has \`"solved": true\`, **omit react entirely** — do not narrate the clue row; the win is celebrated in outro only.
3. Last segment: phase "outro", turn null. Win or loss. If the secret is **C**, **C++**, or **C#**, use the same spoken disambiguation as above when naming the answer. Secret display name: ${play.secretName}. 2–4 sentences.

Exact segment order (length ${expected}): ${orderHint}
Total segments MUST be ${expected}. ids must be unique (e.g. 00-intro, 01-guess, 01-react, …, 99-outro).

Rounds data:
${turnsBlock}

Won: ${play.won}`;

  const ai = getClient();
  let raw = "";
  let lastErr = null;
  for (const model of TEXT_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ parts: [{ text: prompt }] }],
      });
      raw =
        response.candidates?.[0]?.content?.parts
          ?.map((p) => p.text)
          .filter(Boolean)
          .join("\n")
          ?.trim() ?? "";
      if (raw) {
        console.log("Narration segments model:", model);
        break;
      }
      lastErr = new Error(`Empty text from ${model}`);
    } catch (e) {
      lastErr = e;
    }
  }
  if (!raw) {
    console.warn("Falling back to template segments:", lastErr?.message ?? lastErr);
    return templateNarrationSegments(play);
  }

  const parsed = extractJsonObject(raw);
  const list = parsed?.segments;
  if (!Array.isArray(list) || list.length < 3) {
    console.warn("Bad segments JSON; using template.");
    return templateNarrationSegments(play);
  }

  const cleaned = list.map((s, i) => ({
    id: String(s.id ?? `seg-${i}`).replace(/[^\w-]/g, ""),
    phase: String(s.phase ?? "").toLowerCase(),
    turn:
      s.turn === undefined || s.turn === null || s.turn === ""
        ? null
        : Number(s.turn),
    text: String(s.text ?? "")
      .replace(/\*/g, "")
      .trim(),
  }));

  if (cleaned.length !== expected) {
    console.warn(
      `Expected ${expected} segments, got ${cleaned.length}; using template.`,
    );
    return templateNarrationSegments(play);
  }

  for (let i = 0; i < cleaned.length; i++) {
    const want = spec[i];
    if (cleaned[i].phase !== want.phase || !cleaned[i].text) {
      console.warn(`Segment ${i} phase/text mismatch; using template.`);
      return templateNarrationSegments(play);
    }
    const wt = want.turn;
    const ct = cleaned[i].turn;
    if (wt == null) {
      if (ct != null) {
        console.warn(`Segment ${i} turn should be null; using template.`);
        return templateNarrationSegments(play);
      }
    } else if (ct !== wt) {
      console.warn(`Segment ${i} turn mismatch (want ${wt}); using template.`);
      return templateNarrationSegments(play);
    }
  }

  applyCfFamilyNarrationGuards(cleaned, play);
  return cleaned;
}

/** Same persona and tone for every clip; prebuilt voice (e.g. Charon) stays consistent. */
const TTS_VOICE_BASE = `Use one continuous host voice for the whole video: natural adult male, warm, clear, conversational — the same tech Shorts creator in every clip. Keep the same energy, pace, pitch range, and speaking style throughout; do not shift accent, register, or "character" between lines.

`;

const TTS_PHASE_NOTE = {
  intro:
    "Context: opening line of the same narration. Keep it brief if the script is short.\n\n",
  guess:
    "Context: you are speaking just before the on-screen guess is submitted — do not sound like you are already reading clue results.\n\n",
  react:
    "Context: you are speaking after a guess; react to feedback in the script. If it says C plus plus, C sharp, or plain C, pronounce each name distinctly.\n\n",
  outro:
    "Context: closing line of the same narration.\n\n",
};

/**
 * Full TTS instruction text: shared tone + optional phase context + script line.
 * @param {string} [phase] intro | guess | react | outro
 */
export function buildTtsPrompt(plainScript, phase = null) {
  const note =
    phase && TTS_PHASE_NOTE[phase] ? TTS_PHASE_NOTE[phase] : "";
  return `${TTS_VOICE_BASE}${note}${plainScript}`;
}

/**
 * TTS: male-presenting creator voice (voice name from GEMINI_TTS_VOICE, default Charon).
 * @param {string} [phase] intro | guess | react | outro — only timing/context, not a different tone
 */
export async function textToSpeechWav(plainScript, outPath, phase = null) {
  const ai = getClient();
  const ttsPrompt = buildTtsPrompt(plainScript, phase);

  const response = await ai.models.generateContent({
    model: TTS_MODEL,
    contents: [{ parts: [{ text: ttsPrompt }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: VOICE },
        },
      },
    },
  });

  const inline = pickGeminiAudioInline(response);
  const data = inline?.data;
  if (!data) {
    throw new Error(
      `No audio from ${TTS_MODEL}: ${JSON.stringify(response, null, 2)}`,
    );
  }

  const mime = inline.mimeType || inline.mime_type;
  const audioBuffer = Buffer.from(data, "base64");
  await writeGeminiTtsBytesToWavPath(outPath, audioBuffer, mime);
  return outPath;
}

export { VOICE as TTS_VOICE_NAME };
