//modules imported
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

require("dotenv").config();
const path = require("path");
const moment = require("moment");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require("fs").promises;
const multer = require("multer");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const { problemUpload, cloudinary } = require("./config/cloudinary");

// Import Cloudinary helper
const cloudinaryHelper = require("./utils/cloudinaryHelper");

//Databse connection
const connectDB = require("./config/database.js");
connectDB(); // Connect to MongoDB

// Import models
const User = require("./models/user.js");
const hostelProblem = require("./models/problem.js");
const Announcement = require("./models/announcement.js");
const { MenuItems } = require("./models/menu.js");
const ChatRoom = require("./models/chatroom");
const Transit = require("./models/transit");
const OTP = require("./models/otp.js");

// Import the dedicated Feedback model from models/feedback.js
const Feedback = require("./models/feedback");

// Import controllers
const { authMiddleware } = require("./controllers/authController");

// Import routes
const authRoutes = require("./routes/authRoutes");
const problemRoutes = require("./routes/problemRoutes");
const announcementRoutes = require("./routes/announcementRoutes");
const menuRoutes = require("./routes/menuRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
const chatRoomRoutes = require("./routes/chatRoomRoutes");
const transitRoutes = require("./routes/transitRoutes");
const userRoutes = require("./routes/userRoutes");
const emailRoutes = require("./routes/emailRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

// Express configuration remains the same
app.set("view engine", "ejs");
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

moment().format();

// Use routes
app.use("/auth", authRoutes);
app.use("/services/problems", problemRoutes);
app.use("/", announcementRoutes);
app.use("/", menuRoutes);
app.use("/", feedbackRoutes);
app.use("/services/chatRoom", chatRoomRoutes);
app.use("/", transitRoutes);
app.use("/", userRoutes);
app.use("/", emailRoutes);

// Public routes (no auth required)
app.get("/", (req, res) => {
  const isLoggedIn = Boolean(req.cookies.jwt);
  res.render("homepage.ejs", { loggedIn: isLoggedIn });
});

app.get("/about", (req, res) => {
  const isLoggedIn = Boolean(req.cookies.jwt);
  res.render("about.ejs", { loggedIn: isLoggedIn });
});

app.get("/contact", async (req, res) => {
  const isLoggedIn = Boolean(req.cookies.jwt);
  let userForTemplate = null;

  if (isLoggedIn && req.cookies.userid) {
    try {
      const userId = req.cookies.userid;
      const currentUser = await User.findById(userId)
        .select("-password")
        .lean();

      if (currentUser) {
        userForTemplate = {
          name: currentUser.name,
          email: currentUser.email,
          role: currentUser.role,
          roomNumber: currentUser.roomNo,
          hostelNumber: currentUser.hostel,
          phoneNumber: currentUser.phoneNumber || "",
        };
      }
    } catch (error) {
      console.error("Error fetching user for contact page:", error);
    }
  }

  res.render("contact.ejs", {
    loggedIn: isLoggedIn,
    user: userForTemplate,
  });
});

app.get("/login", (req, res) => {
  const { redirect, message } = req.query;
  res.render("login.ejs", { redirect, message });
});

app.get("/signup", (req, res) => {
  res.render("signup.ejs");
});

app.get("/dashboard", authMiddleware, async (req, res) => {
  try {
    const isLoggedIn = Boolean(req.cookies.jwt);
    const role = req.cookies.role;
    const userId = req.cookies.userid;

    const userInfo = await User.findById(userId).select("-password");

    if (!userInfo) {
      return res.status(404).send("User not found");
    }

    if (role === "student") {
      const userProblems = await hostelProblem
        .find({
          hostel: userInfo.hostel,
          studentId: userInfo.rollNo,
        })
        .lean();

      const problems = userProblems.map((problem) => ({
        ...problem,
        roomNumber: problem.roomNo,
      }));

      res.render("partials/dashboard/student.ejs", {
        userInfo,
        problems,
        loggedIn: isLoggedIn,
      });
    } else if (role === "warden") {
      const userProblems = await hostelProblem
        .find({
          hostel: userInfo.hostel,
        })
        .lean();

      const problems = userProblems.map((problem) => ({
        ...problem,
        roomNumber: problem.roomNo,
      }));

      res.render("partials/dashboard/warden.ejs", {
        userInfo,
        problems,
        loggedIn: isLoggedIn,
      });
    } else if (role === "admin") {
      const allUsers = await User.find().select("-password").lean();

      const userProblems = await hostelProblem.find().lean();

      const problems = userProblems.map((problem) => ({
        ...problem,
        roomNumber: problem.roomNo,
      }));

      res.render("partials/dashboard/admin.ejs", {
        userInfo,
        problems,
        allUsers,
        loggedIn: isLoggedIn,
      });
    }
  } catch (error) {
    console.error("Error in dashboard route:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Student List Route
app.get("/student-list", authMiddleware, async (req, res) => {
  try {
    const isLoggedIn = Boolean(req.cookies.jwt);
    const role = req.cookies.role;
    const userId = req.cookies.userid;

    // Only admin and warden roles can access this page
    if (role !== "admin" && role !== "warden") {
      return res.redirect("/dashboard");
    }

    const userInfo = await User.findById(userId).select("-password");

    if (!userInfo) {
      return res.status(404).send("User not found");
    }

    // Get students based on role
    let students;
    if (role === "admin") {
      // Admin can see all students
      students = await User.find({ role: "student" }).lean();
    } else {
      // Warden can only see students from their hostel
      students = await User.find({
        role: "student",
        hostel: userInfo.hostel,
      }).lean();
    }

    res.render("studentList", {
      userInfo,
      students,
      role,
      loggedIn: isLoggedIn,
    });
  } catch (error) {
    console.error("Error in student list route:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/services/users/add-warden", async (req, res) => {
  try {
    const { name, email, hostel, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const newWarden = await User.create({
      name,
      email,
      hostel,
      password: hashedPassword, // In production, make sure to hash the password
      role: "warden",
    });

    res
      .status(201)
      .json({ message: "Warden added successfully", warden: newWarden });
  } catch (error) {
    console.error("Error adding warden:", error);
    res
      .status(500)
      .json({ message: "Error adding warden", error: error.message });
  }
});

// Delete Warden
app.delete("/services/users/delete-warden/:id", async (req, res) => {
  try {
    const wardenId = req.params.id;

    // Validate wardenId format (MongoDB ObjectId)
    if (!wardenId || wardenId.length !== 24) {
      return res.status(400).json({ message: "Invalid warden ID format" });
    }

    // Find the warden first to confirm existence
    const warden = await User.findOne({
      _id: wardenId,
      role: "warden",
    });

    if (!warden) {
      return res.status(404).json({ message: "Warden not found" });
    }

    // Delete the warden
    const deletedWarden = await User.findByIdAndDelete(wardenId);

    if (!deletedWarden) {
      return res.status(500).json({ message: "Failed to delete warden" });
    }

    return res
      .status(200)
      .json({ message: "Warden deleted successfully", deletedWarden });
  } catch (error) {
    console.error("Error deleting warden:", error);
    return res
      .status(500)
      .json({ message: "Error deleting warden", error: error.message });
  }
});

const loadMenuData = require("./loadmenuData.js"); // Adjust the path
connectDB().then(async () => {
  try {
    await loadMenuData();
    console.log("Initial menu data loaded");
  } catch (error) {
    console.error("Error loading initial menu data:", error);
  }
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("A user connected");

  // Join a chat room
  socket.on("joinRoom", async ({ roomId, userId, role }) => {
    try {
      const chatRoom = await ChatRoom.findById(roomId);
      if (!chatRoom) {
        socket.emit("error", { message: "Chat room not found" });
        return;
      }

      // Get user info for hostel check
      const user = await User.findById(userId);
      if (!user) {
        socket.emit("error", { message: "User not found" });
        return;
      }

      // Check access level including hostel restriction
      const hasAccess = checkRoomAccess(
        chatRoom.accessLevel,
        role,
        user.hostel,
        chatRoom.restrictedToHostel
      );
      if (!hasAccess) {
        socket.emit("error", {
          message: "You do not have access to this chat room",
        });
        return;
      }

      // Join the room
      socket.join(roomId);
      socket.emit("roomJoined", { roomId, roomName: chatRoom.roomName });

      // Notify others
      socket.to(roomId).emit("userJoined", { userId, roomId });
    } catch (error) {
      socket.emit("error", { message: "Error joining room" });
    }
  });

  // Handle chat messages
  socket.on(
    "sendMessage",
    async ({ roomId, userId, message, imageData, userName }) => {
      try {
        const chatRoom = await ChatRoom.findById(roomId);
        if (!chatRoom) {
          socket.emit("error", { message: "Chat room not found" });
          return;
        }

        let cloudinaryUrl = null;

        // If imageData is provided (base64), upload to Cloudinary
        if (imageData && imageData.startsWith("data:image")) {
          try {
            // Upload base64 image to Cloudinary using helper
            const result = await cloudinaryHelper.uploadBase64Image(
              imageData,
              "hostel_chat",
              { transformation: [{ width: 800, height: 600, crop: "limit" }] }
            );
            cloudinaryUrl = result.secure_url;
          } catch (uploadError) {
            console.error("Error uploading to Cloudinary:", uploadError);
            socket.emit("error", { message: "Error uploading image" });
            return;
          }
        }

        // Save message to database using Cloudinary URL if available
        chatRoom.messages.push({
          userId,
          userName,
          message,
          imageData: cloudinaryUrl || imageData, // Use Cloudinary URL if available
          timestamp: new Date(),
        });
        await chatRoom.save();

        // Broadcast message to room
        io.to(roomId).emit("newMessage", {
          userId,
          userName,
          message,
          imageData: cloudinaryUrl || imageData, // Use Cloudinary URL if available
          timestamp: new Date(),
        });
      } catch (error) {
        console.error("Error in sendMessage:", error);
        socket.emit("error", { message: "Error sending message" });
      }
    }
  );

  // Handle room deletion notification
  socket.on("chatRoomDeleted", ({ roomId, message }) => {
    // Leave the room if user is in it
    socket.leave(roomId);
    // Notify the user about the deletion
    socket.emit("roomDeleted", { roomId, message });
  });

  // Leave room
  socket.on("leaveRoom", ({ roomId, userId }) => {
    socket.leave(roomId);
    socket.to(roomId).emit("userLeft", { userId, roomId });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// Helper function to check room access
function checkRoomAccess(accessLevel, userRole, userHostel, restrictedHostel) {
  // Admins always have access
  if (userRole === "admin") {
    return true;
  }

  // Wardens: Only access student/warden chat rooms for their own hostel
  if (userRole === "warden") {
    const allowsWardens = [
      "wardens",
      "admin_warden",
      "warden_student",
      "admin_student",
      "all",
    ].includes(accessLevel);
    // If access level includes students, enforce hostel restriction
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
    // Otherwise, wardens can access warden/admin_warden/all rooms
    return allowsWardens;
  }

  // For students, check both access level and hostel restriction
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

  // Default deny for unknown roles
  return false;
}

// Help request form submission route
app.post("/submit-help-request", async (req, res) => {
  try {
    const { name, room, email, phone, request_type, message, urgency, hostel } =
      req.body;
    const role = req.cookies.role;
    // Validation logic: only require room/hostel for students/others, only hostel for warden, neither for admin
    if (
      !name ||
      !email ||
      !phone ||
      !request_type ||
      !message ||
      !urgency ||
      (role !== "admin" && role !== "warden" && (!room || !hostel)) ||
      (role === "warden" && !hostel)
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Validate phone number format (10 digits)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ message: "Invalid phone number format" });
    }

    // Find all admin users
    const adminUsers = await User.find({ role: "admin" });

    if (adminUsers.length === 0) {
      console.warn("No admin users found in the system");
      return res.status(500).json({
        success: false,
        message:
          "Unable to process request. No admin users found in the system.",
      });
    }

    // Set up nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // Send email to all admin users
    const adminEmails = adminUsers.map((admin) => admin.email);

    // Prepare email content for admins
    const adminMailOptions = {
      from: `"Hostelia Help Request" <${process.env.EMAIL_USER}>`,
      to: adminEmails.join(", "), // Send to all admin emails
      subject: `New Help Request: ${request_type} (${urgency} Priority)`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 5px;">
          <h2 style="color: #4f46e5;">New Help Request</h2>
          <p><strong>Request Type:</strong> ${request_type}</p>
          <p><strong>Priority:</strong> ${urgency}</p>
          <hr style="border: 1px solid #e4e4e4; margin: 20px 0;">
          <h3 style="color: #4f46e5;">Requester Details</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Room:</strong> ${room}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <hr style="border: 1px solid #e4e4e4; margin: 20px 0;">
          <h3 style="color: #4f46e5;">Message</h3>
          <p style="background-color: #f9fafb; padding: 15px; border-radius: 5px;">${message}</p>
          <hr style="border: 1px solid #e4e4e4; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 0.875rem;">This is an automated message from the Hostelia Help Request system.</p>
        </div>
      `,
    };

    // Send email to all admins
    await transporter.sendMail(adminMailOptions);

    // Send confirmation email to requester
    const confirmationMailOptions = {
      from: `"Hostelia Help Request" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your Help Request Has Been Received",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 5px;">
          <h2 style="color: #4f46e5;">Help Request Received</h2>
          <p>Dear ${name},</p>
          <p>Thank you for submitting your help request. We have received your request and will process it as soon as possible.</p>
          <hr style="border: 1px solid #e4e4e4; margin: 20px 0;">
          <h3 style="color: #4f46e5;">Request Details</h3>
          <p><strong>Request Type:</strong> ${request_type}</p>
          <p><strong>Priority:</strong> ${urgency}</p>
          <p><strong>Room:</strong> ${room}</p>
          <hr style="border: 1px solid #e4e4e4; margin: 20px 0;">
          <p>We will contact you at ${email} or ${phone} if we need any additional information.</p>
          <p>Best regards,<br>Hostelia Support Team</p>
        </div>
      `,
    };

    await transporter.sendMail(confirmationMailOptions);

    res.status(200).json({
      success: true,
      message:
        "Your help request has been submitted successfully. A confirmation email has been sent to your email address.",
    });
  } catch (error) {
    console.error("Error processing help request:", error);
    res.status(500).json({
      success: false,
      message:
        "An error occurred while processing your request. Please try again later.",
    });
  }
});

// --- MIGRATION: Assign random hostel to old chat rooms with student access and no hostel restriction ---
const assignRandomHostelToOldChatRooms = async () => {
  const hostels = ["BH-1", "BH-2", "BH-3", "BH-4"];
  const studentAccessLevels = ["students", "admin_student", "warden_student"];
  const rooms = await ChatRoom.find({
    accessLevel: { $in: studentAccessLevels },
    $or: [
      { restrictedToHostel: { $exists: false } },
      { restrictedToHostel: null },
      { restrictedToHostel: "" },
    ],
  });
  for (const room of rooms) {
    const randomHostel = hostels[Math.floor(Math.random() * hostels.length)];
    room.restrictedToHostel = randomHostel;
    await room.save();
    console.log(`Assigned ${randomHostel} to chat room ${room.roomName}`);
  }
};
// Uncomment the following line and run the server once to perform the migration:
// assignRandomHostelToOldChatRooms();

// --- ADMIN UTILITY: Delete all chat rooms from the database ---
const deleteAllChatRooms = async () => {
  const result = await ChatRoom.deleteMany({});
  console.log(`Deleted ${result.deletedCount} chat rooms from the database.`);
};
// Uncomment the following line and run the server once to delete all chat rooms:
// deleteAllChatRooms();

// --- ADMIN UTILITY: Delete all transit entries with 'Unknown' fields ---
async function deleteUnknownTransitEntries() {
  const result = await Transit.deleteMany({
    $or: [
      { studentName: "Unknown" },
      { studentHostel: "Unknown" },
      { studentRoomNumber: "Unknown" },
    ],
  });
  console.log(
    `Deleted ${result.deletedCount} transit entries with 'Unknown' fields.`
  );
}

deleteUnknownTransitEntries();

// Create temporary upload directory if it doesn't exist
(async () => {
  const tempDirPath = path.join(__dirname, "public", "uploads", "temp");
  try {
    await fs.mkdir(tempDirPath, { recursive: true });
    console.log(`Temporary upload directory created: ${tempDirPath}`);
  } catch (err) {
    if (err.code !== "EEXIST") {
      console.error(`Error creating temp directory: ${err.message}`);
    }
  }
})();

// Update the server listen call to use http instead of app
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`http://localhost:${PORT}/`);
});
