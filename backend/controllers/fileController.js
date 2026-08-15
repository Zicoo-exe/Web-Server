const fs = require("fs");
const path = require("path");

// Root directory the file browser is allowed to see — change this to whatever you want exposed.
const ROOT_DIR = path.join(__dirname, "../../data");

function safeResolve(relativePath) {
  const target = path.join(ROOT_DIR, relativePath || "");
  const resolved = path.resolve(target);
  if (!resolved.startsWith(path.resolve(ROOT_DIR))) {
    throw new Error("Path traversal blocked");
  }
  return resolved;
}

async function listFiles(req, res, next) {
  try {
    const relPath = req.query.path || "";
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

    // folders first, then alphabetical
    items.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    res.json({ path: relPath, items });
  } catch (err) {
    next(err);
  }
}

async function readFile(req, res, next) {
  try {
    const relPath = req.query.path;
    if (!relPath) return res.status(400).json({ error: "path is required" });

    const filePath = safeResolve(relPath);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) return res.status(400).json({ error: "Cannot read a directory" });

    const content = fs.readFileSync(filePath, "utf-8");
    res.json({ path: relPath, content });
  } catch (err) {
    next(err);
  }
}

async function deleteFile(req, res, next) {
  try {
    const relPath = req.body.path;
    if (!relPath) return res.status(400).json({ error: "path is required" });

    const targetPath = safeResolve(relPath);
    const stats = fs.statSync(targetPath);
    stats.isDirectory() ? fs.rmdirSync(targetPath, { recursive: true }) : fs.unlinkSync(targetPath);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { listFiles, readFile, deleteFile };