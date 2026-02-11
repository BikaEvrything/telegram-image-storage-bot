
import { InputFile } from "grammy";
import { cfg } from "../lib/config.js";
import { exportItems } from "../services/imageStore.js";

export default function register(bot) {
  bot.command("export", async (ctx) => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    if (!userId) return ctx.reply("I couldn’t read your user id from Telegram.");

    const rows = await exportItems({
      mongoUri: cfg.MONGODB_URI,
      userId: String(userId),
    });

    const payload = {
      exportedAt: new Date().toISOString(),
      count: rows.length,
      items: rows,
    };

    const json = JSON.stringify(payload, null, 2);

    if (json.length <= 3500) {
      return ctx.reply(json);
    }

    const buf = Buffer.from(json, "utf8");
    const file = new InputFile(buf, "image-vault-export.json");

    try {
      await ctx.api.sendDocument(chatId, file, {
        caption: `Exported ${rows.length} items (metadata only).`,
      });
    } catch {
      await ctx.reply("Export is too large to send here.");
    }
  });
}
