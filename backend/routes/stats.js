const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/statsController');

router.use(auth);
router.get('/', ctrl.getStats);
router.get('/phone', ctrl.getPhoneStats);

module.exports = router;
