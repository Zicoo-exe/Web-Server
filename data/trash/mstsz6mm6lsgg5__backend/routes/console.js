const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/consoleController');

router.use(auth);
router.get('/:id', ctrl.getOutput);
router.post('/:id/command', ctrl.sendCommand);

module.exports = router;