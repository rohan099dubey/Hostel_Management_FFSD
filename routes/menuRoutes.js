const express = require("express");
const router = express.Router();
const menuController = require("../controllers/menuController");
const { authMiddleware } = require("../controllers/authController");

router.get("/services/mess", menuController.getMenu);
router.post("/feedback", authMiddleware, menuController.submitFeedback);

module.exports = router;
