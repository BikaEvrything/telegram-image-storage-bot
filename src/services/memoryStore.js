
import { getCollections } from "../lib/db.js";
import { safeErr } from "../lib/safeErr.js";
import { redactSecrets } from "../utils/redact.js";

const inMem = new Map();

function keyFor({ platform, userId }) {
  return `${platform}:${String(userId || "")}`;
}

function asTurn(doc) {
  return {
    role: doc.role,
    text: doc.text,
    ts: doc.ts,
  };
}

export async function addTurn({ mongoUri, platform, userId, chatId, role, text, log = console }) {
  const clean = redactSecrets(String(text || "").slice(0, 4000));

  if (!mongoUri) {
    const k = keyFor({ platform, userId });
    const arr = inMem.get(k) || [];
    arr.push({ platform, userId: String(userId), chatId: String(chatId || ""), role, text: clean, ts: new Date() });
    inMem.set(k, arr.slice(-200));
    return;
  }

  try {
    const cols = await getCollections(mongoUri, log);
    if (!cols?.memory) return;

    await cols.memory.insertOne({
      platform,
      userId: String(userId),
      chatId: String(chatId || ""),
      role,
      text: clean,
      ts: new Date(),
    });
  } catch (e) {
    log.error?.("[memory] addTurn failed", { err: safeErr(e) });
  }
}

export async function getRecentTurns({ mongoUri, platform, userId, chatId, limit = 16, log = console }) {
  if (!mongoUri) {
    const k = keyFor({ platform, userId });
    const arr = inMem.get(k) || [];
    return arr.slice(-limit).map(asTurn);
  }

  try {
    const cols = await getCollections(mongoUri, log);
    if (!cols?.memory) return [];

    const q = {
      platform,
      userId: String(userId),
    };
    if (chatId) q.chatId = String(chatId);

    const rows = await cols.memory
      .find(q)
      .sort({ ts: -1 })
      .limit(limit)
      .toArray();

    return rows.reverse().map(asTurn);
  } catch (e) {
    log.error?.("[memory] getRecentTurns failed", { err: safeErr(e) });
    return [];
  }
}

export async function clearUserMemory({ mongoUri, platform, userId, chatId, log = console }) {
  if (!mongoUri) {
    const k = keyFor({ platform, userId });
    inMem.delete(k);
    return;
  }

  try {
    const cols = await getCollections(mongoUri, log);
    if (!cols?.memory) return;

    const q = { platform, userId: String(userId) };
    if (chatId) q.chatId = String(chatId);

    await cols.memory.deleteMany(q);
  } catch (e) {
    log.error?.("[memory] clearUserMemory failed", { err: safeErr(e) });
  }
}
