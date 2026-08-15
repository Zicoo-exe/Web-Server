const serverManager = require("../services/serverManager");

function resolveId(rawId) {
  if (!rawId || rawId === "null" || rawId === "undefined") return "default";
  return rawId;
}

async function getServer(req, res, next) {
  try {
    const id = resolveId(req.params.id);
    const info = serverManager.getStatus(id);
    if (!info) return res.status(404).json({ error: "Bot not found" });
    res.json(info);
  } catch (err) { next(err); }
}

async function startServer(req, res, next) {
  try {
    const id = resolveId(req.params.id);
    await serverManager.start(id);
    res.json({ ok: true });
  } catch (err) { next(err); }
}

async function stopServer(req, res, next) {
  try {
    const id = resolveId(req.params.id);
    await serverManager.stop(id);
    res.json({ ok: true });
  } catch (err) { next(err); }
}

async function restartServer(req, res, next) {
  try {
    const id = resolveId(req.params.id);
    await serverManager.restart(id);
    res.json({ ok: true });
  } catch (err) { next(err); }
}

module.exports = { getServer, startServer, stopServer, restartServer };