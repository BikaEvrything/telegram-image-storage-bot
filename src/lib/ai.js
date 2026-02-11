
import { safeErr } from "./safeErr.js";
import { cfg } from "./config.js";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function aiChat({ messages, meta = {}, log = console }) {
  const endpoint = cfg.COOKMYBOTS_AI_ENDPOINT;
  const keySet = !!cfg.COOKMYBOTS_AI_KEY;

  if (!endpoint || !keySet) {
    log.warn?.("[ai] missing gateway config", {
      endpointSet: !!endpoint,
      keySet,
    });
    throw new Error("AI is not configured yet.");
  }

  const url = endpoint + "/chat";
  const timeoutMs = Number(cfg.AI_TIMEOUT_MS || 600000);
  const maxRetries = Number(cfg.AI_MAX_RETRIES || 2);

  let attempt = 0;
  while (true) {
    attempt += 1;
    const startedAt = Date.now();
    log.info?.("[ai] chat start", {
      attempt,
      timeoutMs,
      messageCount: Array.isArray(messages) ? messages.length : 0,
    });

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfg.COOKMYBOTS_AI_KEY}`,
        },
        body: JSON.stringify({ messages, meta }),
        signal: controller.signal,
      });

      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }

      if (!res.ok) {
        const msg = json?.error || json?.message || text || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      const content = json?.output?.content;
      if (!content || typeof content !== "string") {
        throw new Error("AI gateway returned no content.");
      }

      log.info?.("[ai] chat success", {
        ms: Date.now() - startedAt,
      });

      return content;
    } catch (e) {
      const errMsg = safeErr(e);
      log.error?.("[ai] chat failure", {
        attempt,
        err: errMsg,
      });

      if (attempt > maxRetries) throw e;
      await sleep(400 * attempt);
    } finally {
      clearTimeout(t);
    }
  }
}
