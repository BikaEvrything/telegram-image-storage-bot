
import { cfg } from "../lib/config.js";
import { listImages } from "../services/imageStore.js";

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
  bot.command("list", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return ctx.reply("I couldn’t read your user id from Telegram.");

    const parts = String(ctx.message?.text || "").trim().split(/\s+/);
    const page = parts[1] ? Number(parts[1]) : 1;

    const res = await listImages({
      mongoUri: cfg.MONGODB_URI,
      userId: String(userId),
      page,
      pageSize: 5,
    });

    if (!res.items.length) {
      return ctx.reply("No saved images yet. Send me a photo to save your first one.");
    }

    const totalPages = Math.max(1, Math.ceil((res.total || 0) / res.pageSize));

    const lines = [];
    lines.push(`Your saved images (page ${res.page}/${totalPages}):`);

    for (const it of res.items) {
      const tags = Array.isArray(it.tags) && it.tags.length ? it.tags.join(", ") : "";
      const cap = capPreview(it.caption);
      const meta = [fmtDate(it.createdAt), cap].filter(Boolean).join(" | ");
      const tagPart = tags ? ` [${tags}]` : "";
      lines.push(`${it._id}: ${meta}${tagPart}`);
    }

    lines.push("\nUse /view <id> to view one, or /search <query>.");

    await ctx.reply(lines.join("\n"));
  });
}
