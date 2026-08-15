const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "../../data");
const TRASH_DIR = path.join(DATA_DIR, "trash");
const TRASH_META = path.join(DATA_DIR, "trash.json");
const SERVERS_FILE = path.join(DATA_DIR, "servers.json");

const RETENTION_DAYS = 3;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

// Ensure trash dir + meta file exist
if (!fs.existsSync(TRASH_DIR)) fs.mkdirSync(TRASH_DIR, { recursive: true });
if (!fs.existsSync(TRASH_META)) fs.writeFileSync(TRASH_META, "[]");

function readTrashMeta() {
  try {
    return JSON.parse(fs.readFileSync(TRASH_META, "utf-8") || "[]");
  } catch {
    return [];
  }
}

function writeTrashMeta(entries) {
  fs.writeFileSync(TRASH_META, JSON.stringify(entries, null, 2));
}

// The "project root" the file manager browses — defaults to the active bot's cwd.
function getRootDir() {
  try {
    const servers = JSON.parse(fs.readFileSync(SERVERS_FILE, "utf-8") || "{}");
    const bot = servers.default;
    if (bot && bot.cwd && fs.existsSync(bot.cwd)) return bot.cwd;
  } catch {
    // fall through to default below
  }
  return DATA_DIR;
}

function safeResolve(relativePath) {
  const root = getRootDir();
  const target = path.resolve(root, relativePath || "");
  if (!target.startsWith(path.resolve(root))) {
    throw new Error("Path traversal blocked");
  }
  return target;
}

function listDir(relPath = "") {
  const dirPath = safeResolve(relPath);
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  const items = entries.map((entry) => {
    const fullPath = path.join(dirPath, entry.name);
    const stats = fs.statSync(fullPath);
    return {
      name: entry.name,
      isDirectory: entry.isDirectory(),
      size: entry.isDirectory() ? null : stats.size,
      modified: stats.mtime,
    };
  });

  items.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return { path: relPath, items };
}

function createDirectory(relPath) {
  const target = safeResolve(relPath);
  if (fs.existsSync(target)) throw new Error("Already exists");
  fs.mkdirSync(target, { recursive: true });
}

function createFile(relPath) {
  const target = safeResolve(relPath);
  if (fs.existsSync(target)) throw new Error("Already exists");
  fs.writeFileSync(target, "");
}

function saveUploadedZip(relDir, filename, buffer) {
  if (path.extname(filename).toLowerCase() !== ".zip") {
    throw new Error("Only .zip files can be uploaded");
  }
  const dirPath = safeResolve(relDir);
  const destPath = path.join(dirPath, filename);
  fs.writeFileSync(destPath, buffer);
  return destPath;
}

// Soft delete: move file/folder into data/trash/<id>__<name>, record metadata
function moveToTrash(relPath) {
  const sourcePath = safeResolve(relPath);
  if (!fs.existsSync(sourcePath)) throw new Error("File or folder not found");

  const stats = fs.statSync(sourcePath);
  const id = crypto.randomUUID();
  const name = path.basename(sourcePath);
  const trashEntryDir = path.join(TRASH_DIR, id);
  fs.mkdirSync(trashEntryDir, { recursive: true });
  const trashPath = path.join(trashEntryDir, name);

  fs.renameSync(sourcePath, trashPath);

  const meta = readTrashMeta();
  meta.push({
    id,
    name,
    originalPath: relPath,
    isDirectory: stats.isDirectory(),
    deletedAt: new Date().toISOString(),
  });
  writeTrashMeta(meta);

  return id;
}

function listTrash() {
  const meta = readTrashMeta();
  const now = Date.now();
  return meta.map((entry) => {
    const deletedAt = new Date(entry.deletedAt).getTime();
    const expiresAt = deletedAt + RETENTION_MS;
    const daysLeft = Math.max(0, Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000)));
    return { ...entry, daysLeft };
  });
}

function restoreFromTrash(id) {
  const meta = readTrashMeta();
  const entry = meta.find((e) => e.id === id);
  if (!entry) throw new Error("Trash item not found");

  const trashPath = path.join(TRASH_DIR, id, entry.name);
  const restoreTarget = safeResolve(entry.originalPath);

  if (fs.existsSync(restoreTarget)) {
    throw new Error("A file/folder already exists at the original location");
  }

  fs.mkdirSync(path.dirname(restoreTarget), { recursive: true });
  fs.renameSync(trashPath, restoreTarget);
  fs.rmdirSync(path.join(TRASH_DIR, id), { recursive: true });

  writeTrashMeta(meta.filter((e) => e.id !== id));
}

function deleteForever(id) {
  const meta = readTrashMeta();
  const entry = meta.find((e) => e.id === id);
  if (!entry) throw new Error("Trash item not found");

  const trashEntryDir = path.join(TRASH_DIR, id);
  if (fs.existsSync(trashEntryDir)) fs.rmSync(trashEntryDir, { recursive: true, force: true });

  writeTrashMeta(meta.filter((e) => e.id !== id));
}

function emptyTrash() {
  const meta = readTrashMeta();
  meta.forEach((entry) => {
    const trashEntryDir = path.join(TRASH_DIR, entry.id);
    if (fs.existsSync(trashEntryDir)) fs.rmSync(trashEntryDir, { recursive: true, force: true });
  });
  writeTrashMeta([]);
}

// Called on startup + hourly from server.js
function cleanupExpiredTrash() {
  const meta = readTrashMeta();
  const now = Date.now();
  const expired = meta.filter((e) => now - new Date(e.deletedAt).getTime() > RETENTION_MS);

  expired.forEach((entry) => {
    const trashEntryDir = path.join(TRASH_DIR, entry.id);
    if (fs.existsSync(trashEntryDir)) fs.rmSync(trashEntryDir, { recursive: true, force: true });
  });

  if (expired.length > 0) {
    const remaining = meta.filter((e) => now - new Date(e.deletedAt).getTime() <= RETENTION_MS);
    writeTrashMeta(remaining);
  }
}

module.exports = {
  listDir,
  createDirectory,
  createFile,
  saveUploadedZip,
  moveToTrash,
  listTrash,
  restoreFromTrash,
  deleteForever,
  emptyTrash,
  cleanupExpiredTrash,
  getRootDir,
};