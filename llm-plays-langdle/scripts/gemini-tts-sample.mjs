/**
 * Sample: Gemini API text-to-speech → WAV.
 * Docs: https://ai.google.dev/gemini-api/docs/speech-generation
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import wav from "wav";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
dotenv.config({ path: join(root, ".env") });

const OUT_DIR = join(root, "out");
const OUT_WAV = join(OUT_DIR, "sample.wav");

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
            text: "Say in a clear adult male tech-creator voice: SWEDLE — six daily puzzles for software engineers. Same games for everyone at UTC midnight.",
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

  const data =
    response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!data) {
    console.error("No audio in response:", JSON.stringify(response, null, 2));
    process.exit(1);
  }

  const audioBuffer = Buffer.from(data, "base64");
  await saveWaveFile(OUT_WAV, audioBuffer);
  console.log("Wrote", OUT_WAV);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
