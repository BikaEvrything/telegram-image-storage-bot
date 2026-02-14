import { safeErr } from "./safeErr.js";
import { cfg } from "./config.js";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function aiChat({ messages, meta = {}, log = console }) {
  const endpoint = cfg.COOKMYBOTS_AI_ENDPOINT;
  const key = cfg.COOKMYBOTS_AI_KEY;

  if (!endpoint || !key) {
    throw new Error("AI is not configured yet.");
  }

  const url = endpoint.replace(/\/+$/, "") + "/chat";
  const maxRetries = Number(cfg.AI_MAX_RETRIES || 2);

  let attempt = 0;

  while (attempt <= maxRetries) {
    attempt++;
    const startedAt = Date.now();

    try {
      log.info?.("[ai] chat start", { attempt });

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({ messages, meta }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const json = await res.json();
      const content = json?.output?.content;

      if (!content) {
        throw new Error("AI gateway returned no content.");
      }

      log.info?.("[ai] success", {
        ms: Date.now() - startedAt,
      });

      return content;

    } catch (e) {
      const errMsg = safeErr(e);
      log.error?.("[ai] failure", { attempt, err: errMsg });

      if (attempt > maxRetries) {
        throw e;
      }

      await sleep(500 * attempt);
    }
  }
}
