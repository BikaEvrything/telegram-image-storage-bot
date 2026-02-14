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

function shouldRespondInGroup({ raw, entities, botUsername, isReplyToBot }) {
  if (isReplyToBot) return true;
  if (!botUsername) return false;

  const ents = Array.isArray(entities) ? entities : [];
  const mentionedByEntity = ents.some((e) => {
    if (!e || e.type !== "mention") return false;
    const s = String(raw || "").slice(e.offset, e.offset + e.length);
    return s.toLowerCase() === ("@" + String(botUsername).toLowerCase());
  });

  if (mentionedByEntity) return true;

  const fallbackTextMatch = String(raw || "")
    .toLowerCase()
    .includes("@" + String(botUsername).toLowerCase());
  return fallbackTextMatch;
}

function systemPrompt() {
  return [
    "You are a helpful assistant inside a Telegram image library bot.",
    "Be concise and use plain language.",
    "If the user’s intent matches the bot’s features, instruct them using the exact commands below and include one short example.",
    "Supported commands: /save (reply to image), /view <id>, /list [page], /search <query> [page], /tag <id> <tags>, /note <id> <text>, /delete <id>, /export, /reset.",
    "If the request is unrelated to the image library, answer normally but keep it brief.",
  ].join(" ");
}

function trunc(s, n = 60) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length > n ? t.slice(0, n) + "…" : t;
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
    const text = ctx.message?.text;
    const isCmd = typeof text === "string" && text.trim().startsWith("/");

    log.info?.("[update]", {
      type: ctx.updateType,
      chatType: ctx.chat?.type,
      chatId: chatId != null ? String(chatId) : "",
      userId: userId != null ? String(userId) : "",
      isCommand: !!isCmd,
      textPreview: isCmd ? trunc(text, 40) : "",
    });

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
    if (raw.startsWith("/")) return next();

    const chatType = ctx.chat?.type || "private";
    const isPrivate = chatType === "private";

    const botUsername = ctx.me?.username || bot.botInfo?.username || "";

    const replyTo = ctx.message?.reply_to_message;
    const isReplyToBot =
      !!replyTo?.from?.is_bot &&
      !!botUsername &&
      String(replyTo?.from?.username || "").toLowerCase() === String(botUsername).toLowerCase();

    if (!isPrivate) {
      const ok = shouldRespondInGroup({
        raw,
        entities: ctx.message?.entities,
        botUsername,
        isReplyToBot,
      });
      if (!ok) return next();
    }

    const t = stripMention(raw, botUsername);
    if (!t) return ctx.reply("What should I help you with?");

    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    if (!userId) return ctx.reply("I couldn’t read your user id from Telegram.");

    try {
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
        limit: 18,
        log,
      });

      const messages = [];
      messages.push({ role: "system", content: systemPrompt() });
      for (const m of turns) {
        if (!m?.text) continue;
        messages.push({ role: m.role, content: String(m.text) });
      }

      const reply = await aiChat({
        messages,
        meta: { projectId: "telegram-image-storage-bot", platform: "telegram" },
        log,
      });

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
      await ctx.reply("Sorry, I had trouble with that. Please try again.");
    }
  });

  return bot;
}
