const express = require("express");
const router = express.Router();
const transitController = require("../controllers/transitController");
const { authMiddleware } = require("../controllers/authController");

// Transit/Entry-Exit routes
router.get(
  "/services/register",
  authMiddleware,
  transitController.getTransitRegister
);
router.post(
  "/services/transit",
  authMiddleware,
  transitController.addTransitEntry
);
router.get(
  "/services/users/by-roll/:rollNo",
  authMiddleware,
  transitController.getStudentByRollNumber
);

module.exports = router;
