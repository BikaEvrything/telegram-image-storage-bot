import "dotenv/config";

import { run } from "@grammyjs/runner";

import { cfg } from "./lib/config.js";
import { safeErr } from "./lib/safeErr.js";
import { log } from "./lib/logger.js";
import { createBot } from "./bot.js";
import { closeDb } from "./lib/db.js";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getAppVersion() {
  try {
    const pkg = await import(new URL("../package.json", import.meta.url), {
      assert: { type: "json" },
    });
    return String(pkg?.default?.version || "");
  } catch {
    try {
      const pkg = await import(new URL("../package.json", import.meta.url));
      return String(pkg?.default?.version || "");
    } catch {
      return "";
    }
  }
}

process.on("unhandledRejection", (reason) => {
  log.error("[process] UnhandledRejection", { err: safeErr(reason) });
  // Keep process alive; runner will keep polling.
});

process.on("uncaughtException", (err) => {
  log.error("[process] UncaughtException", { err: safeErr(err) });
  // Keep process alive when feasible.
});

async function startRunnerWith409Retry(bot) {
  const delays = [2000, 5000, 10000, 20000];
  let attempt = 0;

  while (true) {
    try {
      log.info("[runner] start", { concurrency: cfg.CONCURRENCY });
      run(bot, { concurrency: cfg.CONCURRENCY });
      log.info("[runner] started");
      return;
    } catch (e) {
      const msg = safeErr(e);
      const is409 = msg.includes("409") || msg.toLowerCase().includes("conflict");

      const delay = delays[Math.min(attempt, delays.length - 1)];
      attempt += 1;

      log.error("[runner] start failed", { err: msg, is409, backoffMs: delay });
      await sleep(delay);
    }
  }
}

async function boot() {
  const version = await getAppVersion();

  log.info("[boot] starting", {
    version: version || "unknown",
    TELEGRAM_BOT_TOKEN_set: !!cfg.TELEGRAM_BOT_TOKEN,
    MONGODB_URI_set: !!cfg.MONGODB_URI,
    COOKMYBOTS_AI_KEY_set: !!cfg.COOKMYBOTS_AI_KEY,
    COOKMYBOTS_AI_ENDPOINT_set: !!cfg.COOKMYBOTS_AI_ENDPOINT,
  });

  if (!cfg.MONGODB_URI) {
    log.warn("[boot] MONGODB_URI missing; memory will be in-memory and not persistent");
  }

  if (!cfg.TELEGRAM_BOT_TOKEN) {
    log.error("TELEGRAM_BOT_TOKEN is required. Add it in your environment and redeploy.");
    process.exit(1);
  }

  const bot = createBot(cfg.TELEGRAM_BOT_TOKEN, log);

  try {
    await bot.init();
  } catch (e) {
    log.warn("[boot] bot.init failed (continuing)", { err: safeErr(e) });
  }

  try {
    await bot.api.deleteWebhook({ drop_pending_updates: true });
    log.info("[boot] webhook cleared");
  } catch (e) {
    log.warn("[boot] deleteWebhook failed (continuing)", { err: safeErr(e) });
  }

  const stop = async () => {
    log.warn("[shutdown] stopping");
    try {
      await bot.stop();
    } catch (e) {
      log.error("[shutdown] bot.stop failed", { err: safeErr(e) });
    }

    await closeDb(log);
    process.exit(0);
  };

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  await startRunnerWith409Retry(bot);
}

boot().catch((e) => {
  log.error("[boot] fatal", { err: safeErr(e) });
  process.exit(1);
});
