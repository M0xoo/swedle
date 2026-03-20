/**
 * Sample: Gemini API text-to-speech → WAV.
 * Docs: https://ai.google.dev/gemini-api/docs/speech-generation
 */
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import {
  buildTtsPrompt,
  writeGeminiTtsBytesToWavPath,
} from "./gemini-audio.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
dotenv.config({ path: join(root, ".env") });

const OUT_DIR = join(root, "out");
const OUT_WAV = join(OUT_DIR, "sample.wav");

async function main() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY. Copy .env.example to .env and set your key.");
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [
      {
        parts: [
          {
            text: buildTtsPrompt(
              "SWEDLE — six daily puzzles for software engineers. Same games for everyone at UTC midnight.",
              "intro",
            ),
          },
        ],
      },
    ],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: process.env.GEMINI_TTS_VOICE?.trim() || "Charon",
          },
        },
      },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  let inline = null;
  if (Array.isArray(parts)) {
    for (const p of parts) {
      if (p.inlineData?.data) {
        inline = p.inlineData;
        break;
      }
    }
  }
  if (!inline?.data) {
    console.error("No audio in response:", JSON.stringify(response, null, 2));
    process.exit(1);
  }

  const audioBuffer = Buffer.from(inline.data, "base64");
  const mime = inline.mimeType || inline.mime_type;
  await writeGeminiTtsBytesToWavPath(OUT_WAV, audioBuffer, mime);
  console.log("Wrote", OUT_WAV);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
