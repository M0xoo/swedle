import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Next.js dev HMR WebSockets often fail in headless Chromium; the app still works. */
function isBenignDevHmrNoise(text) {
  const t = String(text);
  const lower = t.toLowerCase();
  if (lower.includes("webpack-hmr") || lower.includes("/_next/webpack-hmr"))
    return true;
  if (
    lower.includes("websocket") &&
    lower.includes("_next") &&
    (lower.includes("hmr") ||
      lower.includes("turbopack") ||
      lower.includes("err_invalid_http_response"))
  ) {
    return true;
  }
  return false;
}

async function expectEnabled(page, locator, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const disabled = await locator.getAttribute("disabled");
    const ariaDisabled = await locator.getAttribute("aria-disabled");
    if (disabled == null && ariaDisabled !== "true") return;
    await sleep(100);
  }
  const hint = await page.getByText(/Restoring today/).isVisible().catch(() => false);
  throw new Error(
    `Lang search input stayed disabled after ${timeoutMs}ms. ` +
      (hint
        ? "Still on “Restoring today’s progress…”. Check React hydration / JS errors above."
        : "Check BASE_URL, that /lang loads, and console errors above."),
  );
}

/**
 * @param {object} opts
 * @param {string} opts.baseUrl
 * @param {{ id: string, name: string }[]} opts.guesses
 * @param {string} opts.outVideo
 * @param {Array<{ phase: string, durationMs: number, guessIndex?: number }>} [opts.playbackSteps]
 *        Required unless opts.fastReplay — intro/guess/react/outro sleeps synced to TTS.
 * @param {boolean} [opts.fastReplay] If true, skip narration timing: submit guesses back-to-back (no WAV pipeline).
 * @returns {Promise<{ setupMs: number }>} setupMs = ms from navigation start until replay logic starts
 */
export async function recordLangGameplay(opts) {
  const { baseUrl, guesses, outVideo, playbackSteps, fastReplay } = opts;

  if (!fastReplay) {
    if (!Array.isArray(playbackSteps) || playbackSteps.length === 0) {
      throw new Error(
        "recordLangGameplay: playbackSteps is required unless fastReplay is true.",
      );
    }
  } else {
    if (!Array.isArray(guesses) || guesses.length === 0) {
      throw new Error("recordLangGameplay: guesses required for fastReplay.");
    }
  }

  await mkdir(join(outVideo, ".."), { recursive: true });

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: join(outVideo, ".."),
      size: { width: 1080, height: 1920 },
    },
    ignoreHTTPSErrors: true,
  });

  await context.addInitScript(() => {
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
  });

  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: "reduce" });

  page.on("pageerror", (err) => {
    console.error("[pageerror]", err.message);
  });
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (isBenignDevHmrNoise(text)) return;
    console.error("[console]", text);
  });

  const url = `${baseUrl.replace(/\/$/, "")}/lang`;

  const recordT0 = Date.now();

  await page.goto(url, { waitUntil: "load", timeout: 180_000 });

  const search = page
    .getByTestId("lang-search-input")
    .or(page.locator('input[placeholder*="Search"]'));
  await search.waitFor({ state: "attached", timeout: 120_000 });
  await search.waitFor({ state: "visible", timeout: 120_000 });
  await expectEnabled(page, search, 120_000);

  const setupMs = Date.now() - recordT0;

  if (fastReplay) {
    console.log(
      `[record] Fast replay (no narration waits): ${guesses.length} guesses (setup ${setupMs} ms).`,
    );
    const input = page
      .getByTestId("lang-search-input")
      .or(page.locator('input[placeholder*="Search"]'));
    for (let i = 0; i < guesses.length; i++) {
      const lang = guesses[i];
      await input.click();
      await input.fill(lang.name);
      await page.getByRole("button", { name: lang.name, exact: true }).click();
    }
  } else {
    console.log(
      `[record] Page ready; ${playbackSteps.length} timed steps (setup ${setupMs} ms → leading silence on audio). Guess: full guess-audio duration, then submit.`,
    );

    for (let s = 0; s < playbackSteps.length; s++) {
      const step = playbackSteps[s];
      const ms = Math.max(0, Math.round(step.durationMs));
      const phase = step.phase;

      if (phase === "intro") {
        await sleep(ms);
        continue;
      }

      if (phase === "guess") {
        const idx = step.guessIndex;
        if (idx == null || idx < 0 || idx >= guesses.length) {
          throw new Error(`playbackSteps[${s}]: invalid guessIndex ${idx}`);
        }
        const lang = guesses[idx];
        const input = page
          .getByTestId("lang-search-input")
          .or(page.locator('input[placeholder*="Search"]'));
        await sleep(ms);
        await input.click();
        await input.fill(lang.name);
        await page.getByRole("button", { name: lang.name, exact: true }).click();
        continue;
      }

      if (phase === "react" || phase === "outro") {
        await sleep(ms);
        continue;
      }

      throw new Error(`Unknown playback phase: ${phase}`);
    }
  }

  const video = page.video();
  await page.close();
  if (video) {
    await video.saveAs(outVideo);
  }
  await context.close();
  await browser.close();

  return { setupMs };
}
