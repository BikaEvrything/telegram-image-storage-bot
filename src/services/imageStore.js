
import crypto from "node:crypto";
import { getCollections } from "../lib/db.js";
import { safeErr } from "../lib/safeErr.js";

const inMem = new Map();

function userKey(userId) {
  return String(userId || "");
}

function newId() {
  return crypto.randomBytes(4).toString("hex");
}

function normalizeTags(tags) {
  const arr = Array.isArray(tags) ? tags : [];
  const out = [];
  for (const t of arr) {
    const s = String(t || "").trim();
    if (!s) continue;
    out.push(s.toLowerCase());
  }
  return Array.from(new Set(out)).slice(0, 50);
}

function tagsText(tags) {
  return (tags || []).join(" ");
}

function isImageDoc(doc) {
  const mime = String(doc?.mimeType || "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  const name = String(doc?.fileName || "").toLowerCase();
  return name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".webp") || name.endsWith(".gif");
}

export function extractMediaFromMessage(msg) {
  if (!msg) return null;

  const caption = String(msg.caption || "").trim();

  if (Array.isArray(msg.photo) && msg.photo.length) {
    const best = msg.photo[msg.photo.length - 1];
    return {
      mediaType: "photo",
      fileId: best.file_id,
      fileUniqueId: best.file_unique_id,
      mimeType: "image/jpeg",
      fileName: "photo.jpg",
      caption,
    };
  }

  const doc = msg.document;
  if (doc && isImageDoc({ mimeType: doc.mime_type, fileName: doc.file_name })) {
    return {
      mediaType: "document",
      fileId: doc.file_id,
      fileUniqueId: doc.file_unique_id,
      mimeType: doc.mime_type || "application/octet-stream",
      fileName: doc.file_name || "image",
      caption,
    };
  }

  return null;
}

export async function saveImageItem({
  mongoUri,
  userId,
  chatId,
  messageId,
  media,
  log = console,
}) {
  const now = new Date();

  if (!media?.fileId || !media?.fileUniqueId) {
    throw new Error("No image media found.");
  }

  if (!mongoUri) {
    const k = userKey(userId);
    const arr = inMem.get(k) || [];

    const byMsg = arr.find((x) => String(x.messageId) === String(messageId));
    if (byMsg) {
      return { item: byMsg, deduped: true, reason: "messageId" };
    }

    const byUnique = arr.find((x) => String(x.fileUniqueId) === String(media.fileUniqueId));
    if (byUnique) {
      byUnique.updatedAt = now;
      byUnique.caption = media.caption || byUnique.caption || "";
      return { item: byUnique, deduped: true, reason: "fileUniqueId" };
    }

    const item = {
      _id: newId(),
      userId: String(userId),
      chatId: String(chatId || ""),
      messageId: Number(messageId),
      fileId: media.fileId,
      fileUniqueId: media.fileUniqueId,
      mediaType: media.mediaType,
      mimeType: media.mimeType || "",
      fileName: media.fileName || "",
      caption: media.caption || "",
      tags: [],
      note: "",
      tagsText: "",
      createdAt: now,
      updatedAt: now,
    };

    arr.push(item);
    inMem.set(k, arr);

    return { item, deduped: false };
  }

  try {
    const cols = await getCollections(mongoUri, log);
    if (!cols?.images) throw new Error("DB not available");

    const base = {
      userId: String(userId),
      chatId: String(chatId || ""),
      messageId: Number(messageId),
      fileId: media.fileId,
      fileUniqueId: media.fileUniqueId,
      mediaType: media.mediaType,
      mimeType: media.mimeType || "",
      fileName: media.fileName || "",
      caption: media.caption || "",
    };

    const byMsg = await cols.images.findOne({ userId: String(userId), messageId: Number(messageId) });
    if (byMsg) {
      await cols.images.updateOne(
        { _id: byMsg._id },
        {
          $set: {
            ...base,
            updatedAt: now,
          },
        }
      );
      const updated = await cols.images.findOne({ _id: byMsg._id });
      return { item: updated, deduped: true, reason: "messageId" };
    }

    const byUnique = await cols.images.findOne({ userId: String(userId), fileUniqueId: String(media.fileUniqueId) });
    if (byUnique) {
      await cols.images.updateOne(
        { _id: byUnique._id },
        {
          $set: {
            caption: base.caption || byUnique.caption || "",
            fileId: base.fileId,
            mimeType: base.mimeType,
            fileName: base.fileName,
            updatedAt: now,
          },
        }
      );
      const updated = await cols.images.findOne({ _id: byUnique._id });
      return { item: updated, deduped: true, reason: "fileUniqueId" };
    }

    const _id = newId();
    await cols.images.insertOne({
      _id,
      ...base,
      tags: [],
      note: "",
      tagsText: "",
      createdAt: now,
      updatedAt: now,
    });

    const item = await cols.images.findOne({ _id });
    return { item, deduped: false };
  } catch (e) {
    log.error?.("[imageStore] save failed", { err: safeErr(e) });
    throw e;
  }
}

export async function listImages({ mongoUri, userId, page = 1, pageSize = 5, log = console }) {
  const p = Math.max(1, Number(page || 1));
  const limit = Math.min(20, Math.max(1, Number(pageSize || 5)));
  const skip = (p - 1) * limit;

  if (!mongoUri) {
    const arr = (inMem.get(userKey(userId)) || []).slice().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return {
      items: arr.slice(skip, skip + limit),
      page: p,
      pageSize: limit,
      total: arr.length,
    };
  }

  const cols = await getCollections(mongoUri, log);
  if (!cols?.images) return { items: [], page: p, pageSize: limit, total: 0 };

  const q = { userId: String(userId) };

  const total = await cols.images.countDocuments(q);
  const items = await cols.images.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray();
  return { items, page: p, pageSize: limit, total };
}

export async function getImageById({ mongoUri, userId, id, log = console }) {
  const _id = String(id || "").trim();
  if (!_id) return null;

  if (!mongoUri) {
    const arr = inMem.get(userKey(userId)) || [];
    return arr.find((x) => String(x._id) === _id) || null;
  }

  const cols = await getCollections(mongoUri, log);
  if (!cols?.images) return null;
  return await cols.images.findOne({ _id, userId: String(userId) });
}

export async function setTags({ mongoUri, userId, id, tags, log = console }) {
  const _id = String(id || "").trim();
  const t = normalizeTags(tags);
  const now = new Date();

  if (!mongoUri) {
    const arr = inMem.get(userKey(userId)) || [];
    const item = arr.find((x) => String(x._id) === _id);
    if (!item) return null;
    item.tags = t;
    item.tagsText = tagsText(t);
    item.updatedAt = now;
    return item;
  }

  const cols = await getCollections(mongoUri, log);
  if (!cols?.images) return null;

  await cols.images.updateOne(
    { _id, userId: String(userId) },
    {
      $set: {
        tags: t,
        tagsText: tagsText(t),
        updatedAt: now,
      },
    }
  );

  return await cols.images.findOne({ _id, userId: String(userId) });
}

export async function setNote({ mongoUri, userId, id, note, log = console }) {
  const _id = String(id || "").trim();
  const n = String(note || "").trim().slice(0, 2000);
  const now = new Date();

  if (!mongoUri) {
    const arr = inMem.get(userKey(userId)) || [];
    const item = arr.find((x) => String(x._id) === _id);
    if (!item) return null;
    item.note = n;
    item.updatedAt = now;
    return item;
  }

  const cols = await getCollections(mongoUri, log);
  if (!cols?.images) return null;

  await cols.images.updateOne(
    { _id, userId: String(userId) },
    {
      $set: {
        note: n,
        updatedAt: now,
      },
    }
  );

  return await cols.images.findOne({ _id, userId: String(userId) });
}

export async function deleteItem({ mongoUri, userId, id, log = console }) {
  const _id = String(id || "").trim();

  if (!mongoUri) {
    const k = userKey(userId);
    const arr = inMem.get(k) || [];
    const idx = arr.findIndex((x) => String(x._id) === _id);
    if (idx < 0) return false;
    arr.splice(idx, 1);
    inMem.set(k, arr);
    return true;
  }

  const cols = await getCollections(mongoUri, log);
  if (!cols?.images) return false;

  const res = await cols.images.deleteOne({ _id, userId: String(userId) });
  return (res?.deletedCount || 0) > 0;
}

export async function searchImages({ mongoUri, userId, query, page = 1, pageSize = 5, log = console }) {
  const q = String(query || "").trim();
  const p = Math.max(1, Number(page || 1));
  const limit = Math.min(20, Math.max(1, Number(pageSize || 5)));
  const skip = (p - 1) * limit;

  const terms = q
    .split(/\s+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 12);

  if (!mongoUri) {
    const arr = (inMem.get(userKey(userId)) || []).slice().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    const lowered = q.toLowerCase();
    const hits = arr.filter((it) => {
      const hay = [it.caption, it.note, (it.tags || []).join(" ")].join(" ").toLowerCase();
      return hay.includes(lowered);
    });
    return { items: hits.slice(skip, skip + limit), page: p, pageSize: limit, total: hits.length };
  }

  const cols = await getCollections(mongoUri, log);
  if (!cols?.images) return { items: [], page: p, pageSize: limit, total: 0 };

  const base = { userId: String(userId) };

  let mongoQuery = base;
  if (terms.length) {
    mongoQuery = {
      ...base,
      $or: [
        { caption: { $regex: terms.join("|"), $options: "i" } },
        { note: { $regex: terms.join("|"), $options: "i" } },
        { tags: { $in: terms.map((t) => t.toLowerCase()) } },
        { tagsText: { $regex: terms.join("|"), $options: "i" } },
      ],
    };
  }

  const total = await cols.images.countDocuments(mongoQuery);
  const items = await cols.images.find(mongoQuery).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray();
  return { items, page: p, pageSize: limit, total };
}

export async function exportItems({ mongoUri, userId, log = console }) {
  if (!mongoUri) {
    const arr = (inMem.get(userKey(userId)) || []).slice().sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    return arr.map((it) => ({
      id: it._id,
      mediaType: it.mediaType,
      mimeType: it.mimeType,
      fileName: it.fileName,
      caption: it.caption,
      tags: it.tags,
      note: it.note,
      createdAt: it.createdAt,
      updatedAt: it.updatedAt,
    }));
  }

  const cols = await getCollections(mongoUri, log);
  if (!cols?.images) return [];

  const rows = await cols.images
    .find({ userId: String(userId) })
    .sort({ createdAt: 1 })
    .toArray();

  return rows.map((it) => ({
    id: it._id,
    mediaType: it.mediaType,
    mimeType: it.mimeType,
    fileName: it.fileName,
    caption: it.caption,
    tags: it.tags,
    note: it.note,
    createdAt: it.createdAt,
    updatedAt: it.updatedAt,
  }));
}
