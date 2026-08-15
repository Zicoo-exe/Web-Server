const { getSystemStats } = require('../services/systemStats');
const { getPhoneStats } = require('../services/remoteStats');

exports.getStats = async (req, res, next) => {
  try {
    const stats = await getSystemStats();
    res.json(stats);
  } catch (err) { next(err); }
};

exports.getPhoneStats = async (req, res, next) => {
  try {
    const stats = await getPhoneStats();
    res.json(stats);
  } catch (err) { next(err); }
};