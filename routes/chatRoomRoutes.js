const express = require("express");
const router = express.Router();
const {
  getChatRooms,
  createChatRoom,
  deleteChatRoom,
  getChatRoomStatus,
  viewChatRoom,
} = require("../controllers/chatroomController");
const { authMiddleware } = require("../controllers/authController");

// Chat room routes - specific routes first, then catch-all routes
router.get("/", authMiddleware, getChatRooms);
router.post("/create", authMiddleware, createChatRoom);
router.delete("/delete/:id", authMiddleware, deleteChatRoom);
router.get("/status/:id", authMiddleware, getChatRoomStatus);
router.get("/:roomId", authMiddleware, viewChatRoom);

module.exports = router;
