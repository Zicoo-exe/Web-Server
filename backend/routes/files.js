const express = require("express");
const multer = require("multer");
const router = express.Router();
const auth = require("../middleware/auth");
const ctrl = require("../controllers/fileController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB cap, adjust as needed
  fileFilter: (req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith(".zip")) {
      return cb(new Error("Only .zip files are allowed"));
    }
    cb(null, true);
  },
});

router.get("/", auth, ctrl.listFiles);
router.post("/directory", auth, ctrl.createDirectory);
router.post("/file", auth, ctrl.createFile);
router.post("/upload", auth, upload.single("file"), ctrl.uploadFile);
router.delete("/", auth, ctrl.deleteItem);

router.get("/trash", auth, ctrl.listTrash);
router.post("/trash/:id/restore", auth, ctrl.restoreTrashItem);
router.delete("/trash/:id", auth, ctrl.deleteTrashItemForever);
router.delete("/trash", auth, ctrl.emptyTrash);

module.exports = router;