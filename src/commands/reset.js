
import { cfg } from "../lib/config.js";
import { clearUserMemory } from "../services/memoryStore.js";

export default function register(bot) {
  bot.command("reset", async (ctx) => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    if (!userId) return ctx.reply("I couldn’t read your user id from Telegram.");

    await clearUserMemory({
      mongoUri: cfg.MONGODB_URI,
      platform: "telegram",
      userId: String(userId),
      chatId: String(chatId || ""),
    });

    await ctx.reply("Memory cleared.");
  });
}
