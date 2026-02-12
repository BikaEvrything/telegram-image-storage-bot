
import { Bot } from "grammy";
import { registerCommands } from "./commands/loader.js";
import { cfg } from "./lib/config.js";
import { safeErr } from "./lib/safeErr.js";
import { aiChat } from "./lib/ai.js";
import { addTurn, getRecentTurns } from "./services/memoryStore.js";
import { extractMediaFromMessage, saveImageItem } from "./services/imageStore.js";

function isCommandText(t) {
  return String(t || "").trim().startsWith("/");
}

function stripMention(text, username) {
  const t = String(text || "");
  const u = String(username || "").trim();
  if (!u) return t.trim();
  const re = new RegExp("@" + u + "\\b", "ig");
  return t.replace(re, " ").replace(/\s+/g, " ").trim();
}

function looksLikeLibraryIntent(t) {
  const s = String(t || "").toLowerCase();
  return (
    s.includes("show") ||
    s.includes("find") ||
    s.includes("list") ||
    s.includes("search") ||
    s.includes("images") ||
    s.includes("photos") ||
    s.includes("tagged")
  );
}

function extractSearchQuery(t) {
  const s = String(t || "").trim();
  if (!s) return "";

  const m = s.match(/tag(?:ged)?\s+([a-z0-9_\-]+)/i);
  if (m?.[1]) return m[1];

  const m2 = s.match(/(?:show|find|search)\s+(?:my\s+)?(.+)/i);
  if (m2?.[1]) return m2[1].trim();

  return s;
}

export function createBot(token, log = console) {
  const bot = new Bot(token);

  bot.catch((err) => {
    log.error?.("[telegram] bot error", {
      err: safeErr(err?.error || err),
      ctx: {
        chatId: String(err?.ctx?.chat?.id || ""),
        fromId: String(err?.ctx?.from?.id || ""),
        updateId: String(err?.ctx?.update?.update_id || ""),
      },
    });
  });

  bot.use(async (ctx, next) => {
    try {
      return await next();
    } catch (e) {
      log.error?.("[telegram] middleware failure", { err: safeErr(e) });
      throw e;
    }
  });

  bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    if (userId && chatId) {
      log.info?.("[update]", {
        type: ctx.updateType,
        chatType: ctx.chat?.type,
        chatId: String(chatId),
        userId: String(userId),
      });
    }
    return next();
  });

  registerCommands(bot, log);

  bot.on("message:photo", async (ctx) => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    if (!userId) return;

    const media = extractMediaFromMessage(ctx.message);
    if (!media) return;

    try {
      const { item, deduped, reason } = await saveImageItem({
        mongoUri: cfg.MONGODB_URI,
        userId: String(userId),
        chatId: String(chatId || ""),
        messageId: ctx.message.message_id,
        media,
        log,
      });

      const cap = (item?.caption || "").trim();
      const preview = cap ? (cap.length > 80 ? cap.slice(0, 80) + "…" : cap) : "(no caption)";
      const extra = deduped ? `\nAlready saved (de-duplicated by ${reason}). Updated timestamp.` : "";

      await ctx.reply(
        `Saved. Item id: ${item?._id}\nCaption: ${preview}${extra}\n\nAdd tags: /tag ${item?._id} receipts,travel\nAdd a note: /note ${item?._id} <text>`
      );
    } catch (e) {
      log.error?.("[image] save photo failed", { err: safeErr(e) });
      await ctx.reply("Sorry, I couldn’t save that image.");
    }
  });

  bot.on("message:document", async (ctx) => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    if (!userId) return;

    const media = extractMediaFromMessage(ctx.message);
    if (!media) return;

    try {
      const { item, deduped, reason } = await saveImageItem({
        mongoUri: cfg.MONGODB_URI,
        userId: String(userId),
        chatId: String(chatId || ""),
        messageId: ctx.message.message_id,
        media,
        log,
      });

      const cap = (item?.caption || "").trim();
      const preview = cap ? (cap.length > 80 ? cap.slice(0, 80) + "…" : cap) : "(no caption)";
      const extra = deduped ? `\nAlready saved (de-duplicated by ${reason}). Updated timestamp.` : "";

      await ctx.reply(
        `Saved. Item id: ${item?._id}\nCaption: ${preview}${extra}\n\nAdd tags: /tag ${item?._id} receipts,travel\nAdd a note: /note ${item?._id} <text>`
      );
    } catch (e) {
      log.error?.("[image] save document failed", { err: safeErr(e) });
      await ctx.reply("Sorry, I couldn’t save that image.");
    }
  });

  bot.on("message:text", async (ctx, next) => {
  const raw = String(ctx.message?.text || "");
  if (isCommandText(raw)) return next();

  const chatType = ctx.chat?.type || "private";
  const isPrivate = chatType === "private";

  const botUsername = ctx.me?.username || bot.botInfo?.username || "";

  const replyTo = ctx.message?.reply_to_message;
  const isReplyToBot =
    !!replyTo?.from?.is_bot &&
    !!botUsername &&
    String(replyTo?.from?.username || "").toLowerCase() ===
      String(botUsername).toLowerCase();

  const ents = Array.isArray(ctx.message?.entities)
    ? ctx.message.entities
    : [];

  const isMentioned =
    !!botUsername &&
    ents.some((e) => {
      if (!e || e.type !== "mention") return false;
      const s = raw.slice(e.offset, e.offset + e.length);
      return (
        s.toLowerCase() === "@" + String(botUsername).toLowerCase()
      );
    });

  // 👉 PRIVATE CHAT: selalu aktif
  // 👉 GROUP: hanya jika mention atau reply ke bot
  if (!isPrivate && !isMentioned && !isReplyToBot) return next();

  const t = stripMention(raw, botUsername);
  if (!t) return ctx.reply("What can I help you with?");

  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  if (!userId) return ctx.reply("User ID not detected.");

  try {
    // Simpan pesan user
    await addTurn({
      mongoUri: cfg.MONGODB_URI,
      platform: "telegram",
      userId: String(userId),
      chatId: String(chatId || ""),
      role: "user",
      text: t,
      log,
    });

    const turns = await getRecentTurns({
      mongoUri: cfg.MONGODB_URI,
      platform: "telegram",
      userId: String(userId),
      chatId: String(chatId || ""),
      limit: 16,
      log,
    });

    const messages = [];

    // 🔥 Prompt baru lebih conversational
    messages.push({
      role: "system",
      content:
        "You are a friendly and intelligent AI assistant inside a Telegram bot. You can chat naturally, answer general knowledge questions, and also help manage image storage when needed. Keep responses clear and helpful.",
    });

    for (const m of turns) {
      if (!m?.text) continue;
      messages.push({ role: m.role, content: String(m.text) });
    }

    const reply = await aiChat({
      messages,
      meta: { projectId: "image-vault", platform: "telegram" },
      log,
    });

    // Simpan balasan AI
    await addTurn({
      mongoUri: cfg.MONGODB_URI,
      platform: "telegram",
      userId: String(userId),
      chatId: String(chatId || ""),
      role: "assistant",
      text: reply,
      log,
    });

    await ctx.reply(String(reply).slice(0, 3500));
  } catch (e) {
    log.error?.("[ai] handler failed", { err: safeErr(e) });
    await ctx.reply("AI error: " + safeErr(e));
  }
});


  return bot;
}
