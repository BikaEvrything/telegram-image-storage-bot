import { cfg } from "../lib/config.js";
import { clearUserMemory } from "../services/memoryStore.js";

export default function register(bot, log = console) {
  bot.command("reset", async (ctx) => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    if (!userId) return ctx.reply("I couldn’t read your user id from Telegram.");

    await clearUserMemory({
      mongoUri: cfg.MONGODB_URI,
      platform: "telegram",
      userId: String(userId),
      chatId: String(chatId || ""),
      log,
    });

    await ctx.reply("Conversation memory cleared. Your saved images are unchanged.");
  });
}
