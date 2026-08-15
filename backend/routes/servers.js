const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  getServer, startServer, stopServer, restartServer,
} = require("../controllers/serverController");

router.get("/:id", auth, getServer);
router.post("/:id/start", auth, startServer);
router.post("/:id/stop", auth, stopServer);
router.post("/:id/restart", auth, restartServer);

module.exports = router;