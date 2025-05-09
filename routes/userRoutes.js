const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authMiddleware } = require("../controllers/authController");

// Student list route
router.get(
  "/services/studentList",
  authMiddleware,
  userController.getStudentList
);

// Warden management routes
router.post("/services/warden", authMiddleware, userController.addWarden);
router.delete(
  "/services/warden/:id",
  authMiddleware,
  userController.deleteWarden
);

// Fee status update route
router.post(
  "/services/fee-status",
  authMiddleware,
  userController.updateFeeStatus
);

module.exports = router;
