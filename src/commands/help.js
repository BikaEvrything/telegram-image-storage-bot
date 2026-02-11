
export default function register(bot) {
  bot.command("help", async (ctx) => {
    const msg = [
      "Commands:",
      "/start",
      "/help",
      "/save (reply to an image)",
      "/list [page]  Example: /list 2",
      "/view <id>  Example: /view a1b2c3d4",
      "/tag <id> <tags>  Example: /tag a1b2c3d4 receipts,2026",
      "/note <id> <text>  Example: /note a1b2c3d4 paid already",
      "/delete <id>  Example: /delete a1b2c3d4",
      "/search <query> [page]  Example: /search receipts 2",
      "/export",
      "/reset (clears AI memory)",
      "",
      "Saving images:",
      "1) Send a photo, or send an image as a document.",
      "2) Optionally add a caption.",
    ].join("\n");

    await ctx.reply(msg);
  });
}
