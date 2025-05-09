const express = require("express");
const router = express.Router();
const emailController = require("../controllers/emailController");
const { authMiddleware } = require("../controllers/authController");

// Send single fee reminder
router.post(
  "/send-fee-reminder",
  authMiddleware,
  emailController.sendFeeReminder
);

// Send bulk fee reminders
router.post(
  "/send-bulk-fee-reminders",
  authMiddleware,
  emailController.sendBulkFeeReminders
);

module.exports = router;
