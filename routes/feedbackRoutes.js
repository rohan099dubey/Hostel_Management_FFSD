const express = require("express");
const router = express.Router();
const feedbackController = require("../controllers/feedbackController");
const { authMiddleware } = require("../controllers/authController");

router.get(
  "/services/feedback",
  authMiddleware,
  feedbackController.viewFeedbackData
);

module.exports = router;
