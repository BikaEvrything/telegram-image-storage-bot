
import { cfg } from "../lib/config.js";
import { deleteItem } from "../services/imageStore.js";

export default function register(bot) {
  bot.command("delete", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return ctx.reply("I couldn’t read your user id from Telegram.");

    const full = String(ctx.message?.text || "").trim();
    const parts = full.split(/\s+/);
    const id = parts[1];
    if (!id) return ctx.reply("Usage: /delete <id>");

    const ok = await deleteItem({
      mongoUri: cfg.MONGODB_URI,
      userId: String(userId),
      id,
    });

    await ctx.reply(ok ? "Deleted." : "Not found.");
  });
}
