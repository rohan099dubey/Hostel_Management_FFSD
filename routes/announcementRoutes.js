const express = require("express");
const router = express.Router();
const announcementController = require("../controllers/announcementController");
const { authMiddleware } = require("../controllers/authController");

router.get(
  "/services/announcements",
  authMiddleware,
  announcementController.getAnnouncements
);
router.post(
  "/services/announcement",
  announcementController.createAnnouncement
);
router.delete(
  "/announcements/delete/:id",
  announcementController.deleteAnnouncement
);

module.exports = router;
