const ChatRoom = require("../models/chatroom");
const User = require("../models/user.js");
const mongoose = require("mongoose");

// Helper function to check room access
function checkRoomAccess(accessLevel, userRole, userHostel, restrictedHostel) {
  if (userRole === "admin") {
    return true;
  }
  if (userRole === "warden") {
    const allowsWardens = [
      "wardens",
      "admin_warden",
      "warden_student",
      "admin_student",
      "all",
    ].includes(accessLevel);
    const includesStudents = [
      "students",
      "admin_student",
      "warden_student",
    ].includes(accessLevel);
    if (includesStudents) {
      if (restrictedHostel && restrictedHostel !== userHostel) {
        return false;
      }
      return true;
    }
    return allowsWardens;
  }
  if (userRole === "student") {
    const allowsStudents = [
      "students",
      "admin_student",
      "warden_student",
      "all",
    ].includes(accessLevel);
    if (!allowsStudents) {
      return false;
    }
    if (restrictedHostel && restrictedHostel !== userHostel) {
      return false;
    }
    return true;
  }
  return false;
}

exports.getChatRooms = async (req, res) => {
  try {
    const isLoggedIn = Boolean(req.cookies.jwt);
    const { role, userid } = req.cookies;
    const user = await User.findById(userid);
    if (!user) {
      return res.redirect("/login");
    }
    const chatRoomsAll = await ChatRoom.find().sort({ createdAt: -1 });
    res.render("chatRoom.ejs", {
      role,
      loggedIn: isLoggedIn,
      chatRooms: chatRoomsAll,
      userHostel: user.hostel,
    });
  } catch (error) {
    console.error("Error loading chat rooms:", error);
    res.status(500).send("Error loading chat rooms");
  }
};

exports.createChatRoom = async (req, res) => {
  try {
    const { role, userid } = req.cookies;
    if (role !== "admin" && role !== "warden") {
      return res.status(403).send("Unauthorized");
    }
    const {
      roomName,
      roomType,
      description,
      accessLevel,
      restrictedToHostel,
      roomIcon,
    } = req.body;
    if (!roomName || !roomType || !accessLevel) {
      return res.status(400).send("Missing required fields");
    }
    const includesStudents = [
      "students",
      "admin_student",
      "warden_student",
    ].includes(accessLevel);
    if (includesStudents && !restrictedToHostel) {
      return res
        .status(400)
        .send("Hostel is required for student-access chat rooms");
    }
    const duplicateQuery = {
      accessLevel,
      roomType,
      restrictedToHostel: includesStudents ? restrictedToHostel : null,
    };
    const existingRoom = await ChatRoom.findOne(duplicateQuery);
    if (existingRoom) {
      return res.status(409).json({
        error:
          "A chat room with the same access level, room type, and hostel (if applicable) already exists.",
      });
    }
    const newRoom = await ChatRoom.create({
      roomName,
      roomType,
      description,
      accessLevel,
      restrictedToHostel: includesStudents ? restrictedToHostel : null,
      roomIcon: roomIcon || "fas fa-comments",
      createdBy: userid,
    });
    res.status(201).json(newRoom);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
};

exports.deleteChatRoom = async (req, res) => {
  try {
    const { role, userid } = req.cookies;
    if (role !== "admin" && role !== "warden") {
      return res.status(403).json({ error: "Unauthorized" });
    }
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid room ID format" });
    }
    const deletedRoom = await ChatRoom.findByIdAndDelete(id);
    if (!deletedRoom) {
      return res
        .status(404)
        .json({ error: "Chat room not found or already deleted" });
    }
    // Note: Socket.IO notification should be handled in index.js where io is available
    return res
      .status(200)
      .json({ success: true, message: "Deleted Successfully" });
  } catch (err) {
    console.error("Error deleting chat room:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};

exports.getChatRoomStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const room = await ChatRoom.findById(id);
    if (!room) {
      return res.status(404).json({ message: "Chat room not found" });
    }
    res.json({
      roomId: room._id,
      roomName: room.roomName,
      deleted: room.deleted,
      deletedAt: room.deletedAt,
      accessLevel: room.accessLevel,
      createdAt: room.createdAt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
};

exports.viewChatRoom = async (req, res) => {
  try {
    const roomId = req.params.roomId;
    const userId = req.cookies.userid;
    const role = req.cookies.role;
    if (!userId) {
      return res.redirect("/login");
    }
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return res
        .status(404)
        .render("error", { message: "Chat room not found" });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.redirect("/login");
    }
    const hasAccess = checkRoomAccess(
      room.accessLevel,
      role,
      user.hostel,
      room.restrictedToHostel
    );
    if (!hasAccess) {
      return res.status(403).render("error", {
        message: "You do not have access to this chat room",
      });
    }
    res.render("chatRoomView", {
      room,
      userId,
      userName: user.name,
      role,
      loggedIn: true,
    });
  } catch (error) {
    console.error("Error accessing chat room:", error);
    res.status(500).render("error", { message: "Error accessing chat room" });
  }
};
