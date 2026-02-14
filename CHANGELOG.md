# Changelog

All notable changes to this bot project are recorded here.

## 2026-02-14 13:41:28. UTC
- Request: please make my bot able to speak properly or reply to messages
- Summary: I added a safer conversational AI mode for non-command text messages without changing the existing image library behaviors. The bot now replies naturally in private chats, and in groups only when mentioned or replied-to…
- Files: .env.sample, DOCS.md, README.md, package.json, src/bot.js, src/commands/reset.js, src/index.js, src/lib/ai.js, src/lib/db.js, src/services/memoryStore.js

## 2026-02-11 20:37:44. UTC
- Request: make me an image storage bot
- Summary: Generated a complete production-ready Telegram bot project for Image Vault using grammY and @grammyjs/runner, with MongoDB-backed image library + AI long-term memory (and safe in-memory fallbacks when MONGODB_URI is mis…
- Files: .env.sample, DOCS.md, README.md, package.json, project.json, src/bot.js, src/commands/delete.js, src/commands/export.js, src/commands/help.js, src/commands/list.js, src/commands/loader.js, src/commands/note.js, src/commands/reset.js, src/commands/save.js (+12…

