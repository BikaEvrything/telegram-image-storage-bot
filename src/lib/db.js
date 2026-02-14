import { MongoClient } from "mongodb";
import { safeErr } from "./safeErr.js";

let _client = null;
let _db = null;
let _connecting = null;

export async function getDb(mongoUri, log = console) {
  if (!mongoUri) return null;
  if (_db) return _db;
  if (_connecting) return _connecting;

  _connecting = (async () => {
    try {
      log.info?.("[db] connect start", { mongoSet: true });

      _client = new MongoClient(mongoUri, {
        maxPoolSize: 10,
        ignoreUndefined: true,
      });
      await _client.connect();
      _db = _client.db();

      log.info?.("[db] connected", { mongo: true });
      return _db;
    } catch (e) {
      log.error?.("[db] connect failed", { err: safeErr(e) });
      _client = null;
      _db = null;
      throw e;
    } finally {
      _connecting = null;
    }
  })();

  return _connecting;
}

export async function closeDb(log = console) {
  try {
    if (_client) {
      await _client.close();
      log.info?.("[db] closed");
    }
  } catch (e) {
    log.error?.("[db] close failed", { err: safeErr(e) });
  } finally {
    _client = null;
    _db = null;
    _connecting = null;
  }
}

export async function getCollections(mongoUri, log = console) {
  const db = await getDb(mongoUri, log);
  if (!db) return null;

  const memory = db.collection("memory_messages");
  const images = db.collection("image_items");

  try {
    await memory.createIndex({ platform: 1, userId: 1, ts: -1 });
    await memory.createIndex({ platform: 1, userId: 1, chatId: 1, ts: -1 });

    await images.createIndex({ userId: 1, createdAt: -1 });
    await images.createIndex({ userId: 1, updatedAt: -1 });
    await images.createIndex({ userId: 1, fileUniqueId: 1 });
    await images.createIndex({ userId: 1, messageId: 1 });

    await images.createIndex({ userId: 1, tags: 1 });
    await images.createIndex({ userId: 1, caption: "text", note: "text", tagsText: "text" });
  } catch (e) {
    log.error?.("[db] ensureIndexes failed", { err: safeErr(e) });
  }

  return { db, memory, images };
}
