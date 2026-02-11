
import "dotenv/config";
import { run } from "@grammyjs/runner";

import { cfg } from "./lib/config.js";
import { safeErr } from "./lib/safeErr.js";
import { createBot } from "./bot.js";
import { closeDb } from "./lib/db.js";

process.on("unhandledRejection", (reason) => {
  console.error("[process] UnhandledRejection", { err: safeErr(reason) });
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("[process] UncaughtException", { err: safeErr(err) });
  process.exit(1);
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function startPollingWithRetry(bot) {
  const delays = [2000, 5000, 10000, 20000];
  let i = 0;

  while (true) {
    try {
      console.log("[boot] starting runner polling", { concurrency: cfg.CONCURRENCY });
      run(bot, { concurrency: cfg.CONCURRENCY });
      return;
    } catch (e) {
      const msg = safeErr(e);
      const is409 = msg.includes("409") || msg.toLowerCase().includes("conflict");
      console.error("[boot] polling failed", { err: msg, is409 });

      const delay = delays[Math.min(i, delays.length - 1)];
      i += 1;
      await sleep(delay);
    }
  }
}

async function boot() {
  console.log("[boot] starting", {
    tokenSet: !!cfg.TELEGRAM_BOT_TOKEN,
    mongoSet: !!cfg.MONGODB_URI,
    aiEndpointSet: !!cfg.COOKMYBOTS_AI_ENDPOINT,
    aiKeySet: !!cfg.COOKMYBOTS_AI_KEY,
  });

  if (!cfg.TELEGRAM_BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN is required. Add it in your environment and redeploy.");
    process.exit(1);
  }

  const bot = createBot(cfg.TELEGRAM_BOT_TOKEN, console);

  try {
    await bot.init();
  } catch (e) {
    console.warn("[boot] bot.init failed (continuing)", { err: safeErr(e) });
  }

  try {
    await bot.api.deleteWebhook({ drop_pending_updates: true });
    console.log("[boot] webhook cleared");
  } catch (e) {
    console.warn("[boot] deleteWebhook failed (continuing)", { err: safeErr(e) });
  }

  const stop = async () => {
    console.log("[shutdown] stopping");
    try {
      await bot.stop();
    } catch (e) {
      console.error("[shutdown] bot.stop failed", { err: safeErr(e) });
    }

    await closeDb(console);
    process.exit(0);
  };

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  await startPollingWithRetry(bot);
}

boot().catch((e) => {
  console.error("[boot] fatal", { err: safeErr(e) });
  process.exit(1);
});
