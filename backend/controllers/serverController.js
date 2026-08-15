const serverManager = require("../services/serverManager");

async function getServer(req, res, next) {
  try {
    const info = serverManager.getStatus(req.params.id);
    if (!info) return res.status(404).json({ error: "Bot not found" });
    res.json(info);
  } catch (err) { next(err); }
}

async function startServer(req, res, next) {
  try {
    await serverManager.start(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
}

async function stopServer(req, res, next) {
  try {
    await serverManager.stop(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
}

async function restartServer(req, res, next) {
  try {
    await serverManager.restart(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
}

module.exports = { getServer, startServer, stopServer, restartServer };