const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const fs = require('fs');
const config = require('../config/config');

router.use(auth);

router.post('/clear-logs', (req, res, next) => {
  try {
    fs.writeFileSync(require('path').join(config.logDir, 'server.log'), '');
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;