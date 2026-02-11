Image Vault stores a user’s uploaded images into a personal library and lets them retrieve and manage them later.

How saving works
Send a Telegram photo or an image document to the bot. The bot saves the Telegram file_id plus metadata (caption, tags, notes). If you upload the same file again, it will be de-duplicated by file_unique_id.

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
Clears the AI conversation memory for your user.

Environment variables
1) TELEGRAM_BOT_TOKEN (required)
Telegram bot token.

2) MONGODB_URI (optional but recommended)
MongoDB connection string. When set, the image library and AI memory are stored long-term. When missing, the bot runs with an in-memory fallback (data is lost on restart).

3) COOKMYBOTS_AI_ENDPOINT (required for AI)
Base URL for the CookMyBots AI gateway. The bot calls /chat under this base.

4) COOKMYBOTS_AI_KEY (required for AI)
Auth key for the CookMyBots AI gateway.

5) AI_TIMEOUT_MS (optional)
AI gateway timeout in ms (default 600000).

6) AI_MAX_RETRIES (optional)
AI gateway retries (default 2).

7) CONCURRENCY (optional)
Runner concurrency (default 20).

Run instructions
1) npm run install:root
2) Set env vars (or create a .env from .env.sample)
3) npm start
