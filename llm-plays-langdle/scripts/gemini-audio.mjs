/**
 * Gemini: narration script (Flash) + TTS (preview TTS model) → WAV
 */
import { mkdir } from "node:fs/promises";
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
 * Template fallback if JSON generation fails (still one TTS file per beat).
 */
export function templateNarrationSegments(play) {
  const secretName = play.secretName ?? play.secret?.name ?? "the answer";
  const segs = [];
  segs.push({
    id: "00-intro",
    phase: "intro",
    turn: null,
    text: `Let's play Langdle on SWEDLE — guess today's programming language from the clues. Puzzle date UTC ${play.dateKey}. Here we go.`,
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
      text: `${rHead}paradigm ${t.cells.paradigm}, open source ${t.cells.openSource}, execution ${t.cells.execution}, platforms ${t.cells.platforms}, year ${t.cells.year}.${y}${t.solved ? " That's the language." : ""}`,
    });
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
 * Structured segments for per-clip TTS + exact Playwright timing (intro → guess/react ×N → outro).
 * @param {{ dateKey: string, turns: object[], won: boolean, secretName: string, secret: { name: string } }} play
 * @returns {Promise<Array<{ id: string, phase: string, turn: number|null, text: string }>>}
 */
export async function generateNarrationSegments(play) {
  const n = play.turns.length;
  const turnsBlock = JSON.stringify(play.turns, null, 2);
  const prompt = `You write voiceover for a vertical tech Short. An AI played **Langdle** on **SWEDLE** (Wordle for programming languages: green exact, orange partial, gray miss; year hints up/down).

Return ONLY valid JSON (no markdown fences). Shape:
{"segments":[{"id":"00-intro","phase":"intro","turn":null,"text":"..."},...]}

STRICT structure:
1. First segment: phase "intro", turn null. Hook + mention SWEDLE Langdle + UTC date ${play.dateKey}. 2–4 short sentences. Male creator energy.
2. For each round k = 1..${n}: read \`guessName\` from that round in the JSON below.
   - phase "guess", turn k: first person, **about to try** that language. **If guessName is "C"**: you MUST say **plain C** or **classic C** and explicitly say it is **not C plus plus** and **not C sharp**. **If "C++"**: say **C plus plus** (words) or **C++** in text. **If "C#"**: say **C sharp** (words) or **C#**. Never say only "C" when you mean C++ or C#. Never vague "C family". 1–2 sentences.
   - phase "react", turn k: same **guessName** disambiguation in the first phrase (e.g. "For C plus plus…") then clue colors. Do NOT reveal the secret answer here. 2–5 sentences.
3. Last segment: phase "outro", turn null. Win or loss. If the secret is **C**, **C++**, or **C#**, use the same spoken disambiguation as above when naming the answer. Secret display name: ${play.secretName}. 2–4 sentences.

Total segments = ${1 + 2 * n + 1}. ids must be unique (e.g. 00-intro, 01-guess, 01-react, 02-guess, …, 99-outro).

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

  const expected = 1 + 2 * n + 1;
  if (cleaned.length !== expected) {
    console.warn(
      `Expected ${expected} segments, got ${cleaned.length}; using template.`,
    );
    return templateNarrationSegments(play);
  }

  const wantPhases = ["intro"];
  for (let k = 1; k <= n; k++) {
    wantPhases.push("guess", "react");
  }
  wantPhases.push("outro");
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i].phase !== wantPhases[i] || !cleaned[i].text) {
      console.warn(`Segment ${i} phase/text mismatch; using template.`);
      return templateNarrationSegments(play);
    }
    if (cleaned[i].phase === "guess" || cleaned[i].phase === "react") {
      const tk = Math.ceil(i / 2);
      if (cleaned[i].turn !== tk) {
        console.warn(`Segment ${i} turn mismatch (want ${tk}); using template.`);
        return templateNarrationSegments(play);
      }
    }
  }

  applyCfFamilyNarrationGuards(cleaned, play);
  return cleaned;
}

const TTS_PREFIX = {
  intro:
    "Speak in a natural adult male voice — clear tech YouTuber. This is the cold open.\n\n",
  guess:
    "Speak in a natural adult male voice — you're talking out loud *before* the guess hits the board; don't imply the clue row is already showing.\n\n",
  react:
    "Speak in a natural adult male voice — thoughtful, reading puzzle clues. If the script says C plus plus or C sharp or plain C, pronounce those clearly and distinctly.\n\n",
  outro:
    "Speak in a natural adult male voice — punchy sign-off.\n\n",
};

/**
 * TTS: male-presenting creator voice (voice name from GEMINI_TTS_VOICE, default Charon).
 * @param {string} [phase] intro | guess | react | outro — tweaks delivery hint
 */
export async function textToSpeechWav(plainScript, outPath, phase = null) {
  const ai = getClient();
  const prefix =
    (phase && TTS_PREFIX[phase]) ||
    "Speak in a natural adult male voice — clear, confident, friendly, like a tech YouTuber or Shorts creator. Conversational pace, not rushed.\n\n";
  const ttsPrompt = `${prefix}${plainScript}`;

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

  const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!data) {
    throw new Error(
      `No audio from ${TTS_MODEL}: ${JSON.stringify(response, null, 2)}`,
    );
  }

  await mkdir(dirname(outPath), { recursive: true });
  const audioBuffer = Buffer.from(data, "base64");
  await saveWaveFile(outPath, audioBuffer);
  return outPath;
}

export { VOICE as TTS_VOICE_NAME };
