const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const db = require('../config/database');
const serverManager = require('./serverManager');
const formatBytes = require('../utils/formatBytes');

const TRASH_ROOT = path.join(__dirname, '..', '..', 'data', 'trash');
if (!fs.existsSync(TRASH_ROOT)) fs.mkdirSync(TRASH_ROOT, { recursive: true });

function getServerRoot(serverId) {
  const server = serverManager.getServer(serverId);
  return path.resolve(server.cwd || '.');
}

function safeResolve(root, relPath) {
  const target = path.resolve(root, relPath || '.');
  if (!target.startsWith(root)) throw new Error('Invalid path');
  return target;
}

function listDir(serverId, relPath = '.') {
  const root = getServerRoot(serverId);
  const target = safeResolve(root, relPath);
  if (!fs.existsSync(target)) return [];
  const entries = fs.readdirSync(target, { withFileTypes: true });
  return entries.map(entry => {
    const full = path.join(target, entry.name);
    const stat = fs.statSync(full);
    return {
      name: entry.name,
      type: entry.isDirectory() ? 'folder' : 'file',
      size: entry.isDirectory() ? null : formatBytes(stat.size),
      modified: stat.mtime
    };
  }).sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'folder' ? -1 : 1));
}

function uploadZip(serverId, relPath, zipFilePath, originalName) {
  if (!originalName.toLowerCase().endsWith('.zip')) {
    fs.unlinkSync(zipFilePath);
    throw new Error('Only .zip files are allowed');
  }
  const root = getServerRoot(serverId);
  const target = safeResolve(root, relPath);
  fs.mkdirSync(target, { recursive: true });
  const zip = new AdmZip(zipFilePath);
  zip.extractAllTo(target, true);
  fs.unlinkSync(zipFilePath);
}

function mkdir(serverId, relPath, name) {
  const root = getServerRoot(serverId);
  const target = safeResolve(root, path.join(relPath, name));
  fs.mkdirSync(target, { recursive: true });
}

function loadTrash() { return db.read('trash') || []; }
function saveTrash(list) { db.write('trash', list); }

function softDelete(serverId, relPath) {
  const root = getServerRoot(serverId);
  const source = safeResolve(root, relPath);
  if (!fs.existsSync(source)) throw new Error('File not found');

  const trashId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const name = path.basename(source);
  const trashDest = path.join(TRASH_ROOT, `${trashId}__${name}`);

  fs.renameSync(source, trashDest);

  const list = loadTrash();
  list.push({
    id: trashId,
    serverId,
    name,
    originalRelPath: relPath,
    trashPath: trashDest,
    deletedAt: Date.now()
  });
  saveTrash(list);
}

function listTrash(serverId) {
  return loadTrash()
    .filter(t => t.serverId === serverId)
    .map(t => ({ ...t, expiresAt: t.deletedAt + 3 * 24 * 60 * 60 * 1000 }));
}

function restore(trashId) {
  const list = loadTrash();
  const entry = list.find(t => t.id === trashId);
  if (!entry) throw new Error('Trash item not found');

  const root = getServerRoot(entry.serverId);
  const dest = safeResolve(root, entry.originalRelPath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.renameSync(entry.trashPath, dest);

  saveTrash(list.filter(t => t.id !== trashId));
}

function permanentDelete(trashId) {
  const list = loadTrash();
  const entry = list.find(t => t.id === trashId);
  if (!entry) throw new Error('Trash item not found');

  if (fs.existsSync(entry.trashPath)) {
    fs.rmSync(entry.trashPath, { recursive: true, force: true });
  }
  saveTrash(list.filter(t => t.id !== trashId));
}

function cleanupExpiredTrash() {
  const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
  const list = loadTrash();
  const now = Date.now();
  const remaining = [];

  for (const entry of list) {
    if (now - entry.deletedAt > THREE_DAYS) {
      if (fs.existsSync(entry.trashPath)) {
        fs.rmSync(entry.trashPath, { recursive: true, force: true });
      }
    } else {
      remaining.push(entry);
    }
  }
  if (remaining.length !== list.length) saveTrash(remaining);
}

module.exports = {
  listDir, uploadZip, mkdir, softDelete, listTrash, restore, permanentDelete, cleanupExpiredTrash
};