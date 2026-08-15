const os = require('os');
const multer = require('multer');
const fileManager = require('../services/fileManager');

const upload = multer({ dest: os.tmpdir() });
exports.uploadMiddleware = upload.single('file');

exports.list = (req, res, next) => {
  try {
    const relPath = req.query.path || '.';
    res.json(fileManager.listDir(req.params.serverId, relPath));
  } catch (err) { err.status = 400; next(err); }
};

exports.upload = (req, res, next) => {
  try {
    if (!req.file) { const e = new Error('No file uploaded'); e.status = 400; throw e; }
    const relPath = req.query.path || '.';
    fileManager.uploadZip(req.params.serverId, relPath, req.file.path, req.file.originalname);
    res.json({ success: true });
  } catch (err) { err.status = 400; next(err); }
};

exports.mkdir = (req, res, next) => {
  try {
    const { path: relPath, name } = req.body;
    if (!name) { const e = new Error('Folder name required'); e.status = 400; throw e; }
    fileManager.mkdir(req.params.serverId, relPath || '.', name);
    res.json({ success: true });
  } catch (err) { err.status = 400; next(err); }
};

exports.remove = (req, res, next) => {
  try {
    const relPath = req.query.path;
    if (!relPath) { const e = new Error('path is required'); e.status = 400; throw e; }
    fileManager.softDelete(req.params.serverId, relPath);
    res.json({ success: true });
  } catch (err) { err.status = 400; next(err); }
};

exports.trashList = (req, res, next) => {
  try {
    res.json(fileManager.listTrash(req.params.serverId));
  } catch (err) { next(err); }
};

exports.trashRestore = (req, res, next) => {
  try {
    fileManager.restore(req.params.trashId);
    res.json({ success: true });
  } catch (err) { err.status = 400; next(err); }
};

exports.trashDelete = (req, res, next) => {
  try {
    fileManager.permanentDelete(req.params.trashId);
    res.json({ success: true });
  } catch (err) { err.status = 400; next(err); }
};