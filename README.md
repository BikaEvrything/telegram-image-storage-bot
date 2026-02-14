Image Vault is a Telegram bot that stores your uploaded images into a personal library so you can list, search, view, tag, add notes, delete, and export metadata later.

It uses grammY for Telegram, MongoDB for storage (with a safe in-memory fallback when MongoDB is not configured), and the CookMyBots AI gateway for a lightweight natural-language assistant.

Key features
1) Save images by sending a photo or an image document
2) De-duplicates repeated uploads by Telegram file_unique_id per user
3) List and search your library with pagination
4) View an item by id (re-sends using Telegram file_id)
5) Add tags and notes, delete items, and export a JSON summary
6) Conversational mode: send a normal text message (not a slash command) and the bot replies naturally
7) Long-term conversation memory stored in MongoDB when available

Reliability notes
1) The bot clears any Telegram webhook on boot to avoid “bot not responding” issues.
2) The bot uses long polling via @grammyjs/runner.
3) If Telegram returns 409 Conflict (overlapping deploys or another instance polling), the bot retries polling with backoff.
4) Errors in handlers are caught and logged so the process does not crash.

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
2) MONGODB_URI (optional) MongoDB connection for image library and conversation memory. If missing, the bot still runs, but memory is in-memory (lost on restart).
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
Clears only AI conversation memory for the user. It does not delete saved images.

Troubleshooting: bot not responding
1) Verify TELEGRAM_BOT_TOKEN is set in the environment.
2) Verify you do not have a webhook set. This bot clears it on boot.
3) Look for 409 Conflict logs. This indicates multiple instances are polling. During deployments, this is normal; the bot will backoff and keep retrying.
4) If MongoDB is down or MONGODB_URI is missing, image saving still works only in-memory. Configure MONGODB_URI for persistence.
