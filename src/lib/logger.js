import { safeErr } from "./safeErr.js";

function base(level, msg, meta) {
  try {
    const payload = {
      level,
      msg,
      ts: new Date().toISOString(),
      ...(meta && typeof meta === "object" ? meta : {}),
    };
    console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](JSON.stringify(payload));
  } catch (e) {
    console.error("[logger] failed", safeErr(e));
  }
}

export const log = {
  info: (msg, meta) => base("info", msg, meta),
  warn: (msg, meta) => base("warn", msg, meta),
  error: (msg, meta) => base("error", msg, meta),
};
