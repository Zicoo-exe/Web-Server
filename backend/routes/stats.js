const express = require("express");
const router = express.Router();
const { getStats } = require("../controllers/statsController");
const auth = require("../middleware/auth");

router.get("/", auth, getStats);

module.exports = router;