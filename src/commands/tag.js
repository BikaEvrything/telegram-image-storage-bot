
import { cfg } from "../lib/config.js";
import { setTags } from "../services/imageStore.js";

function parseTags(text) {
  const raw = String(text || "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export default function register(bot) {
  bot.command("tag", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return ctx.reply("I couldn’t read your user id from Telegram.");

    const full = String(ctx.message?.text || "").trim();
    const parts = full.split(/\s+/);
    const id = parts[1];
    if (!id) return ctx.reply("Usage: /tag <id> <comma-separated-tags>");

    let tagText = parts.slice(2).join(" ").trim();

    if (!tagText) {
      const replied = ctx.message?.reply_to_message;
      const replyText = String(replied?.text || "").trim();
      if (replyText) tagText = replyText;
    }

    if (!tagText) {
      return ctx.reply("Send tags like: /tag <id> receipts,travel (or reply to this command with tag text). ");
    }

    const tags = parseTags(tagText);

    const item = await setTags({
      mongoUri: cfg.MONGODB_URI,
      userId: String(userId),
      id,
      tags,
    });

    if (!item) return ctx.reply("Not found. Try /list.");

    await ctx.reply(`Updated tags for ${item._id}: ${(item.tags || []).join(", ") || "(none)"}`);
  });
}
