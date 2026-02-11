
import { cfg } from "../lib/config.js";
import { getImageById } from "../services/imageStore.js";

function fmtDate(d) {
  try {
    return new Date(d).toISOString();
  } catch {
    return "";
  }
}

export default function register(bot) {
  bot.command("view", async (ctx) => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    if (!userId) return ctx.reply("I couldn’t read your user id from Telegram.");

    const text = String(ctx.message?.text || "").trim();
    const parts = text.split(/\s+/);
    const id = parts[1];
    if (!id) return ctx.reply("Usage: /view <id>");

    const item = await getImageById({
      mongoUri: cfg.MONGODB_URI,
      userId: String(userId),
      id,
    });

    if (!item) return ctx.reply("Not found. Try /list or /search.");

    const tags = Array.isArray(item.tags) ? item.tags : [];

    const metaLines = [
      `Item id: ${item._id}`,
      `Saved: ${fmtDate(item.createdAt)}`,
      `Caption: ${(item.caption || "").trim() || "(none)"}`,
      `Tags: ${tags.length ? tags.join(", ") : "(none)"}`,
      `Note: ${(item.note || "").trim() || "(none)"}`,
    ];

    try {
      if (item.mediaType === "photo") {
        await ctx.api.sendPhoto(chatId, item.fileId);
      } else {
        await ctx.api.sendDocument(chatId, item.fileId);
      }
    } catch {
      await ctx.reply("I couldn’t re-send the file, but the metadata is still saved.");
    }

    await ctx.reply(metaLines.join("\n"));
  });
}
