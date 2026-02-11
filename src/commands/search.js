
import { cfg } from "../lib/config.js";
import { searchImages } from "../services/imageStore.js";

function fmtDate(d) {
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function capPreview(s) {
  const t = String(s || "").trim();
  if (!t) return "";
  return t.length > 50 ? t.slice(0, 50) + "…" : t;
}

export default function register(bot) {
  bot.command("search", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return ctx.reply("I couldn’t read your user id from Telegram.");

    const full = String(ctx.message?.text || "").trim();
    const parts = full.split(/\s+/);
    const rawPage = parts[parts.length - 1];
    const page = /^\d+$/.test(rawPage) ? Number(rawPage) : 1;

    const query = /^\d+$/.test(rawPage) ? parts.slice(1, -1).join(" ") : parts.slice(1).join(" ");
    if (!query) return ctx.reply("Usage: /search <query> [page]");

    const res = await searchImages({
      mongoUri: cfg.MONGODB_URI,
      userId: String(userId),
      query,
      page,
      pageSize: 5,
    });

    if (!res.items.length) {
      return ctx.reply("No matches.");
    }

    const totalPages = Math.max(1, Math.ceil((res.total || 0) / res.pageSize));
    const lines = [];
    lines.push(`Results for "${query}" (page ${res.page}/${totalPages}):`);

    for (const it of res.items) {
      const tags = Array.isArray(it.tags) && it.tags.length ? it.tags.join(", ") : "";
      const cap = capPreview(it.caption);
      const meta = [fmtDate(it.createdAt), cap].filter(Boolean).join(" | ");
      const tagPart = tags ? ` [${tags}]` : "";
      lines.push(`${it._id}: ${meta}${tagPart}`);
    }

    lines.push("\nUse /view <id> to open one.");

    await ctx.reply(lines.join("\n"));
  });
}
