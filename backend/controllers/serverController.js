const serverManager = require('../services/serverManager');

exports.list = (req, res, next) => {
  try {
    res.json(serverManager.listServers());
  } catch (err) { next(err); }
};

exports.get = (req, res, next) => {
  try {
    res.json(serverManager.getServer(req.params.id));
  } catch (err) { err.status = 404; next(err); }
};

exports.create = (req, res, next) => {
  try {
    const { name, command, args, cwd } = req.body;
    if (!name || !command) { const e = new Error('name and command are required'); e.status = 400; throw e; }
    res.status(201).json(serverManager.createServer({ name, command, args, cwd }));
  } catch (err) { next(err); }
};

exports.remove = (req, res, next) => {
  try {
    serverManager.deleteServer(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
};

exports.start = (req, res, next) => {
  try {
    const pid = serverManager.startServer(req.params.id);
    res.json({ success: true, pid });
  } catch (err) { err.status = 400; next(err); }
};

exports.stop = (req, res, next) => {
  try {
    serverManager.stopServer(req.params.id);
    res.json({ success: true });
  } catch (err) { err.status = 400; next(err); }
};