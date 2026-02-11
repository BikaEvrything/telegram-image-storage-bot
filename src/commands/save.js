
import { cfg } from "../lib/config.js";
import { extractMediaFromMessage, saveImageItem } from "../services/imageStore.js";

export default function register(bot) {
  bot.command("save", async (ctx) => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    if (!userId) return ctx.reply("I couldn’t read your user id from Telegram.");

    const replied = ctx.message?.reply_to_message;
    if (!replied) {
      return ctx.reply("Reply to a photo (or image document) with /save, or just send me the image directly.");
    }

    const media = extractMediaFromMessage(replied);
    if (!media) {
      return ctx.reply("That message doesn’t look like a photo or image document. Try replying to a photo.");
    }

    const { item, deduped, reason } = await saveImageItem({
      mongoUri: cfg.MONGODB_URI,
      userId: String(userId),
      chatId: String(chatId || ""),
      messageId: replied.message_id,
      media,
    });

    const cap = (item?.caption || "").trim();
    const preview = cap ? (cap.length > 80 ? cap.slice(0, 80) + "…" : cap) : "(no caption)";

    const extra = deduped ? `\nAlready saved (de-duplicated by ${reason}). Updated timestamp.` : "";

    await ctx.reply(
      `Saved. Item id: ${item?._id}\nCaption: ${preview}${extra}\n\nTo add tags: /tag ${item?._id} receipts,travel\nTo add a note: /note ${item?._id} <text>`
    );
  });
}
