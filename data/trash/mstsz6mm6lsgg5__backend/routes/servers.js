const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/serverController');

router.use(auth);
router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.post('/', ctrl.create);
router.delete('/:id', ctrl.remove);
router.post('/:id/start', ctrl.start);
router.post('/:id/stop', ctrl.stop);

module.exports = router;