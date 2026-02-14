Image Vault stores a user’s uploaded images into a personal library and lets them retrieve and manage them later.

How saving works
Send a Telegram photo or an image document to the bot. The bot saves the Telegram file_id plus metadata (caption, tags, notes). If you upload the same file again, it will be de-duplicated by file_unique_id.

Conversational mode
If you send a normal text message that is not a slash command, the bot replies using the CookMyBots AI gateway and includes recent conversation context.
1) In private chats, it replies to all non-command text.
2) In groups/supergroups, it replies only when you reply to the bot or mention it by @username.

Public commands
1) /start
Explains what the bot does and how to save images.

2) /help
Lists commands and examples.

3) /save
Usage: reply to an image message with /save
If you run /save without replying, the bot will instruct you to send a photo or reply to one.

4) /list [page]
Usage: /list
Usage: /list 2
Shows the most recent saved images, 5 per page.

5) /view <id>
Usage: /view 5f2c9d1a
Re-sends the saved image and prints its metadata.

6) /tag <id> <comma-separated-tags>
Usage: /tag 5f2c9d1a receipts,2026,taxes
Also supported: /tag 5f2c9d1a (then reply with tag text)

7) /note <id> <text>
Usage: /note 5f2c9d1a Final version, paid already

8) /delete <id>
Usage: /delete 5f2c9d1a

9) /search <query> [page]
Usage: /search receipts
Usage: /search travel 2
Searches in tags, caption text, and note text.

10) /export
Exports your saved item metadata as JSON.

11) /reset
Clears only conversation memory for your Telegram user. It does not delete your saved images.

Environment variables
1) TELEGRAM_BOT_TOKEN (required)
Telegram bot token.

2) MONGODB_URI (optional but recommended)
MongoDB connection string. When set, the image library and AI conversation memory are stored long-term. When missing, the bot runs with in-memory memory fallback (lost on restart).

3) COOKMYBOTS_AI_ENDPOINT
Base URL for the CookMyBots AI gateway. The bot calls /chat under this base.

4) COOKMYBOTS_AI_KEY
Auth key for the CookMyBots AI gateway.

Troubleshooting: bot not responding
1) If a webhook is configured, Telegram will not deliver updates to long polling. This bot clears webhook on boot.
2) If you see 409 Conflict in logs, another instance is polling getUpdates. This can happen during deployments. The bot retries with backoff.
3) If MONGODB_URI is missing, memory is not persistent. Configure MongoDB for reliable storage.

Run instructions
1) npm run install:root
2) Set env vars (or create a .env from .env.sample)
3) npm start
