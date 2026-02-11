
export default function register(bot) {
  bot.command("start", async (ctx) => {
    const lines = [
      "Image Vault saves your uploaded images into a personal library.",
      "",
      "To save an image, just send me a photo or an image file (document).",
      "I’ll reply with an item id you can use later.",
      "",
      "Main commands: /list, /search, /view <id>, /tag <id> <tags>, /note <id> <text>, /delete <id>, /export, /reset",
      "Tip: You can also reply to an image with /save (useful in groups).",
    ];
    await ctx.reply(lines.join("\n"));
  });
}
