
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export async function registerCommands(bot, log = console) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const files = fs
    .readdirSync(__dirname)
    .filter((f) => f.endsWith(".js") && f !== "loader.js" && !f.startsWith("_"))
    .sort();

  for (const f of files) {
    const url = pathToFileURL(path.join(__dirname, f)).href;
    try {
      const mod = await import(url);
      const fn = mod?.default || mod?.register;
      if (typeof fn === "function") {
        await fn(bot);
        log.info?.("[commands] registered", { file: f });
      } else {
        log.warn?.("[commands] skipped (no export)", { file: f });
      }
    } catch (e) {
      log.error?.("[commands] failed", { file: f, err: e?.message || String(e) });
      throw e;
    }
  }
}
