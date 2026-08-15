const consoleManager = require('../services/consoleManager');

exports.getOutput = (req, res, next) => {
  try {
    res.json({ output: consoleManager.getConsoleOutput(req.params.id) });
  } catch (err) { next(err); }
};

exports.sendCommand = (req, res, next) => {
  try {
    const { command } = req.body;
    if (!command) { const e = new Error('command is required'); e.status = 400; throw e; }
    consoleManager.sendConsoleCommand(req.params.id, command);
    res.json({ success: true });
  } catch (err) { err.status = 400; next(err); }
};