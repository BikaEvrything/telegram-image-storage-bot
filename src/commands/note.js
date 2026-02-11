
import { cfg } from "../lib/config.js";
import { setNote } from "../services/imageStore.js";

export default function register(bot) {
  bot.command("note", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return ctx.reply("I couldn’t read your user id from Telegram.");

    const full = String(ctx.message?.text || "").trim();
    const parts = full.split(/\s+/);
    const id = parts[1];
    const text = parts.slice(2).join(" ").trim();

    if (!id || !text) return ctx.reply("Usage: /note <id> <text>");

    const item = await setNote({
      mongoUri: cfg.MONGODB_URI,
      userId: String(userId),
      id,
      note: text,
    });

    if (!item) return ctx.reply("Not found. Try /list.");

    await ctx.reply(`Updated note for ${item._id}.`);
  });
}
