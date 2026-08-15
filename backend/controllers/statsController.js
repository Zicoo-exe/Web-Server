const systemStats = require("../services/systemStats");

async function getStats(req, res, next) {
  try {
    const stats = systemStats.getAllStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

module.exports = { getStats };