const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { listFiles, readFile, deleteFile } = require("../controllers/fileController");

router.get("/", auth, listFiles);
router.get("/read", auth, readFile);
router.delete("/", auth, deleteFile);

module.exports = router;