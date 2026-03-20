/**
 * Langdle in Node: Gemini picks guesses; we evaluate with the same rules as production
 * and send green/orange/gray feedback back. Playwright only replays the final guess list.
 */
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  evaluateLanguageGuess,
  getDailyLanguage,
  getLanguageDirectory,
} from "./lang-daily-logic.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
dotenv.config({ path: join(root, ".env") });

const GAME_MODELS = [
  process.env.GEMINI_GAME_MODEL?.trim(),
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
].filter(Boolean);

const MAX_GUESSES = 6;
const MAX_PARSE_RETRIES = 4;

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  return new GoogleGenAI({ apiKey });
}

function extractText(response) {
  return (
    response.candidates?.[0]?.content?.parts
      ?.map((p) => p.text)
      .filter(Boolean)
      .join("\n")
      ?.trim() ?? ""
  );
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

/** LLMs often output wrong slugs; map before directory lookup. */
const ID_ALIASES = new Map(
  Object.entries({
    "c++": "cpp",
    "cplusplus": "cpp",
    "c-plus-plus": "cpp",
    "c plus plus": "cpp",
    "c#": "csharp",
    "c-sharp": "csharp",
    "c sharp": "csharp",
    "c_sharp": "csharp",
    "cs": "csharp",
  }),
);

/** Normalize spoken / fuzzy names to canonical directory name (exact match on .name next). */
const NAME_ALIASES = new Map(
  Object.entries({
    "c sharp": "C#",
    "c-sharp": "C#",
    "c#": "C#",
    "c plus plus": "C++",
    "cplusplus": "C++",
  }),
);

function resolveGuessId(obj, directory) {
  if (!obj || typeof obj !== "object") return null;
  const raw =
    obj.guessId ?? obj.guess_id ?? obj.id ?? obj.languageId ?? obj.slug;
  if (typeof raw === "string" && raw.trim()) {
    let id = raw.trim().toLowerCase().replace(/\s+/g, "");
    id = ID_ALIASES.get(id) ?? id;
    if (directory.some((l) => l.id === id)) return id;
  }
  const nameRaw = obj.guessName ?? obj.name ?? obj.language;
  if (typeof nameRaw === "string" && nameRaw.trim()) {
    let n = nameRaw.trim().toLowerCase().replace(/\s+/g, " ");
    const viaAlias = NAME_ALIASES.get(n);
    if (viaAlias) {
      const hit = directory.find((l) => l.name === viaAlias);
      if (hit) return hit.id;
    }
    const hit = directory.find((l) => l.name.toLowerCase() === n);
    if (hit) return hit.id;
  }
  return null;
}

function formatFeedback(result, turnIndex, maxTurns) {
  const { guess, cells, yearHint, solved } = result;
  const yExtra =
    yearHint === "up"
      ? " — secret language first appeared in a later year (↑)."
      : yearHint === "down"
        ? " — secret language first appeared in an earlier year (↓)."
        : "";
  return `Turn ${turnIndex}/${maxTurns} — feedback after your guess "${guess.name}" (id: ${guess.id}):
- paradigm: ${cells.paradigm}
- open source: ${cells.openSource}
- execution: ${cells.execution}
- platforms: ${cells.platforms}
- year: ${cells.year}${yExtra}

${solved ? "SOLVED — you found the language. Do not guess again." : `Not solved yet. Guesses used: ${turnIndex}/${maxTurns}. Reply with your next move as JSON only: {"guessId":"<id>"}`}`;
}

function buildInitialPrompt(dateKey, directory) {
  const lines = directory.map((l) => `${l.id}\t${l.name}`).join("\n");
  return `You are playing **Langdle** on SWEDLE: guess the secret programming language for UTC calendar date ${dateKey}.

Rules:
- You have at most ${MAX_GUESSES} guesses.
- After each guess you receive five clues: paradigm, open source, execution, platforms, year.
- **green** = exact match for that attribute.
- **orange** = close / partial overlap (not exact).
- **gray** = wrong.
- Year may include ↑ (secret first appeared in a later year) or ↓ (earlier) when year is not exact.

You do NOT know the answer in advance. Use the feedback logically.

**Ids are exact slugs — do not confuse these three:**
- \`c\` = **C** (classic C)
- \`cpp\` = **C++** (not \`c++\` as id — use \`cpp\`)
- \`csharp\` = **C#** / C Sharp (not \`c#\` as id — use \`csharp\`)
Other languages use their listed id only.

Reply with **only** a single JSON object on one line (no markdown, no prose):
{"guessId":"<id>"}

The id must be exactly one of the ids in the directory (first column).

Directory (id TAB name):
${lines}

This is guess 1 of ${MAX_GUESSES}. Output your JSON now.`;
}

async function generateWithModel(ai, model, contents) {
  return ai.models.generateContent({
    model,
    contents,
  });
}

/**
 * @param {string} dateKey
 * @returns {Promise<{
 *   dateKey: string,
 *   secret: object,
 *   guesses: object[],
 *   turns: object[],
 *   won: boolean,
 *   contents: object[]
 * }>}
 */
export async function runLlmLangPlay(dateKey) {
  const secret = getDailyLanguage(dateKey);
  const directory = getLanguageDirectory();
  const ai = getClient();

  const contents = [];
  const turns = [];
  const guesses = [];

  contents.push({
    role: "user",
    parts: [{ text: buildInitialPrompt(dateKey, directory) }],
  });

  let modelUsed = GAME_MODELS[0];
  let loopGuard = 0;

  while (guesses.length < MAX_GUESSES) {
    if (++loopGuard > 48) {
      throw new Error("Langdle LLM loop exceeded safety limit (stuck repeating?).");
    }
    let response = null;
    let lastErr = null;
    for (const model of GAME_MODELS) {
      try {
        response = await generateWithModel(ai, model, contents);
        modelUsed = model;
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (!response) {
      throw new Error(`Gemini game model failed: ${lastErr?.message ?? lastErr}`);
    }

    const rawText = extractText(response);
    if (!rawText) {
      throw new Error("Empty model response during Langdle play.");
    }

    contents.push({ role: "model", parts: [{ text: rawText }] });

    let guessId = null;
    let parsed = extractJsonObject(rawText);
    if (parsed) guessId = resolveGuessId(parsed, directory);

    let repair = 0;
    while (!guessId && repair < MAX_PARSE_RETRIES) {
      repair++;
      contents.push({
        role: "user",
        parts: [
          {
            text: `That was not valid. Reply with ONLY one JSON object: {"guessId":"<id>"} using an id from the directory. No other text. Ids: c=C, cpp=C++, csharp=C# — do not mix them up.`,
          },
        ],
      });
      let retryResp = null;
      for (const model of GAME_MODELS) {
        try {
          retryResp = await generateWithModel(ai, model, contents);
          break;
        } catch {
          /* try next */
        }
      }
      if (!retryResp) break;
      const retryText = extractText(retryResp);
      contents.push({ role: "model", parts: [{ text: retryText }] });
      parsed = extractJsonObject(retryText);
      if (parsed) guessId = resolveGuessId(parsed, directory);
    }

    if (!guessId) {
      throw new Error(
        `Could not parse a valid guess after repairs. Last model text: ${rawText.slice(0, 200)}…`,
      );
    }

    if (guesses.some((g) => g.id === guessId)) {
      contents.push({
        role: "user",
        parts: [
          {
            text: `You already guessed "${guessId}". Pick a different id (JSON only).`,
          },
        ],
      });
      continue;
    }

    const result = evaluateLanguageGuess(secret, guessId);
    if (!result) {
      contents.push({
        role: "user",
        parts: [
          {
            text: `Unknown id "${guessId}". Use an id from the directory. JSON only.`,
          },
        ],
      });
      continue;
    }

    turns.push({
      turn: turns.length + 1,
      guessId: result.guess.id,
      guessName: result.guess.name,
      cells: { ...result.cells },
      yearHint: result.yearHint,
      solved: result.solved,
    });
    guesses.push(result.guess);

    if (result.solved) {
      console.log("LLM Langdle: solved in", turns.length, "guesses (", modelUsed, ")");
      return {
        dateKey,
        secret,
        guesses,
        turns,
        won: true,
        contents,
        modelUsed,
      };
    }

    if (guesses.length >= MAX_GUESSES) break;

    contents.push({
      role: "user",
      parts: [{ text: formatFeedback(result, guesses.length, MAX_GUESSES) }],
    });
  }

  console.log("LLM Langdle: exhausted after", turns.length, "guesses (", modelUsed, ")");
  return {
    dateKey,
    secret,
    guesses,
    turns,
    won: false,
    contents,
    modelUsed,
  };
}
