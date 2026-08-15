const fileManager = require("../services/fileManager");

async function listFiles(req, res, next) {
  try {
    res.json(fileManager.listDir(req.query.path || ""));
  } catch (err) { next(err); }
}

async function createDirectory(req, res, next) {
  try {
    const { path: relPath, name } = req.body;
    const target = relPath ? `${relPath}/${name}` : name;
    fileManager.createDirectory(target);
    res.json({ ok: true });
  } catch (err) { next(err); }
}

async function createFile(req, res, next) {
  try {
    const { path: relPath, name } = req.body;
    const target = relPath ? `${relPath}/${name}` : name;
    fileManager.createFile(target);
    res.json({ ok: true });
  } catch (err) { next(err); }
}

async function uploadFile(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const relDir = req.body.path || "";
    fileManager.saveUploadedZip(relDir, req.file.originalname, req.file.buffer);
    res.json({ ok: true });
  } catch (err) { next(err); }
}

async function deleteItem(req, res, next) {
  try {
    const { path: relPath } = req.body;
    if (!relPath) return res.status(400).json({ error: "path is required" });
    const id = fileManager.moveToTrash(relPath);
    res.json({ ok: true, trashId: id });
  } catch (err) { next(err); }
}

async function listTrash(req, res, next) {
  try {
    res.json(fileManager.listTrash());
  } catch (err) { next(err); }
}

async function restoreTrashItem(req, res, next) {
  try {
    fileManager.restoreFromTrash(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
}

async function deleteTrashItemForever(req, res, next) {
  try {
    fileManager.deleteForever(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
}

async function emptyTrash(req, res, next) {
  try {
    fileManager.emptyTrash();
    res.json({ ok: true });
  } catch (err) { next(err); }
}

module.exports = {
  listFiles, createDirectory, createFile, uploadFile, deleteItem,
  listTrash, restoreTrashItem, deleteTrashItemForever, emptyTrash,
};