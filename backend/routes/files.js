const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/fileController');

router.use(auth);
router.get('/:serverId/trash/list', ctrl.trashList);
router.post('/trash/:trashId/restore', ctrl.trashRestore);
router.delete('/trash/:trashId', ctrl.trashDelete);
router.get('/:serverId', ctrl.list);
router.post('/:serverId/upload', ctrl.uploadMiddleware, ctrl.upload);
router.post('/:serverId/mkdir', ctrl.mkdir);
router.delete('/:serverId', ctrl.remove);

module.exports = router;