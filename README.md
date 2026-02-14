Image Vault is a Telegram bot that stores your uploaded images into a personal library so you can list, search, view, tag, add notes, delete, and export metadata later.

It uses grammY for Telegram, MongoDB for storage (with an in-memory fallback when MongoDB is not configured), and the CookMyBots AI gateway for a lightweight natural-language assistant.

Key features
1) Save images by simply sending a photo or an image document
2) De-duplicates repeated uploads by file_unique_id per user
3) List and search your library with pagination
4) View an item by id (re-sends using Telegram file_id)
5) Add tags and notes, delete items, and export a JSON summary
6) Conversational mode: send a normal text message (not a slash command) and the bot replies naturally
7) Long-term conversation memory stored in MongoDB when available

Conversational mode rules
1) In private chats, the bot replies to all non-command text messages.
2) In groups/supergroups, the bot replies only when you reply to the bot or mention it by @username.
3) The assistant is instructed to be concise. When your request matches bot features, it will tell you the exact command to use and give one short example.

Reset behavior
/reset clears only your conversation memory for the AI assistant. It does not delete or modify your saved images.

Architecture overview
1) src/index.js boots the process, validates env, clears webhook, and starts long polling via @grammyjs/runner with conflict backoff
2) src/bot.js wires middleware, commands, image saving handlers, and the catch-all conversational text handler
3) src/commands/*.js are individual command modules registered by src/commands/loader.js
4) src/lib/db.js manages a single shared Mongo connection (optional)
5) src/services/imageStore.js is the CRUD layer for saved images
6) src/services/memoryStore.js is long-term conversation memory with MongoDB or an in-memory fallback
7) src/lib/ai.js wraps CookMyBots AI gateway calls with retries, timeouts, and logging

Setup
Prerequisites
1) Node.js 18+
2) A Telegram bot token from BotFather
3) Optional but strongly recommended: MongoDB connection string (MONGODB_URI)
4) CookMyBots AI gateway credentials (COOKMYBOTS_AI_ENDPOINT and COOKMYBOTS_AI_KEY)

Install
1) npm run install:root
2) Copy .env.sample to .env and fill in values

Run locally
1) npm run dev

Run in production
1) npm start

Environment variables
1) TELEGRAM_BOT_TOKEN (required) Telegram bot token
2) MONGODB_URI (optional) MongoDB connection for image library and long-term memory. If missing, the bot still runs but conversation memory is in-memory (lost on restart).
3) COOKMYBOTS_AI_ENDPOINT (required for AI) Base URL of the CookMyBots AI gateway (example: https://api.cookmybots.com/api/ai)
4) COOKMYBOTS_AI_KEY (required for AI) API key for CookMyBots AI gateway
5) AI_TIMEOUT_MS (optional) Timeout for AI gateway calls (default 600000)
6) AI_MAX_RETRIES (optional) Retries for AI calls (default 2)
7) CONCURRENCY (optional) grammY runner concurrency (default 20)

Commands
1) /start
Welcome message and how to save images.

2) /help
Shows the command list and short examples.

3) /save
Reply to a message with a photo or image document to save it. If used without reply, the bot explains how to save.

4) /list [page]
Shows your most recent saved images, 5 per page.

5) /view <id>
Re-sends a saved image using Telegram file_id and shows its metadata.

6) /tag <id> <comma-separated-tags>
Sets or replaces tags for an item. You can also run /tag <id> and reply with the tags.

7) /note <id> <text>
Sets or replaces a note for an item.

8) /delete <id>
Deletes an item from your library.

9) /search <query> [page]
Searches caption, note, and tags for your query, with pagination.

10) /export
Exports a JSON summary (ids + metadata only). If it is too long for a message, it is sent as a document.

11) /reset
Clears long-term AI memory messages for the user.

Integrations
1) Telegram Bot API via grammY long polling
2) MongoDB for persistence
3) CookMyBots AI Gateway
   1) POST {COOKMYBOTS_AI_ENDPOINT}/chat

Deployment notes (Render)
1) Use a background worker or web service; either is fine for long polling.
2) Set TELEGRAM_BOT_TOKEN in Render env.
3) Recommended: set MONGODB_URI so data persists.
4) The bot clears any webhook on boot to avoid conflicts.

Troubleshooting
1) Bot does not respond
Check TELEGRAM_BOT_TOKEN is set and correct.

2) 409 Conflict (another getUpdates)
The bot automatically retries with backoff. This can happen during deploy overlap.

3) Conversation memory disappears after restart
Set MONGODB_URI. Without it, the bot uses an in-memory fallback.

Extending the bot
Add a new file in src/commands/ and export a default function register(bot). It will be auto-registered by src/commands/loader.js. Then update /help output to include the new command.
