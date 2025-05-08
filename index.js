//modules imported
const express = require("express");
const app = express();
require("dotenv").config();
const path = require("path");
const moment = require("moment");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require("fs").promises;
const multer = require("multer");

//Databse connection
const { dataProblems, dataEntryExit, userData } = require("./config/data.js");
const connectDB = require("./config/database.js");
connectDB(); // Connect to MongoDB

// Import models
const User = require("./models/user.js");
const hostelProblem = require("./models/problem.js");
const Announcement = require("./models/announcement.js");
const { MenuItems } = require("./models/menu.js");
const ChatRoom = require("./models/chatroom");
const Transit = require("./models/transit");

// Import the dedicated Feedback model from models/feedback.js
const Feedback = require("./models/feedback");

// Multer configuration remains the same
const storage = multer.diskStorage({
  destination: "./public/uploads/",
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png/;
    const extName = fileTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimeType = fileTypes.test(file.mimetype);

    if (mimeType && extName) {
      return cb(null, true);
    } else {
      cb(new Error("Images only!"));
    }
  },
});

// Express configuration remains the same
app.set("view engine", "ejs");
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

moment().format();

const generateToken = (userID, res) => {
  const token = jwt.sign({ userID }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // in millisecond
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV !== "development",
  });

  return token;
};

// Auth middleware remains the same
const authMiddleware = (req, res, next) => {
  const publicRoutes = [
    "/auth/login",
    "/auth/logout",
    "/signup",
    "/about",
    "/contact",
    "/",
    "/login",
  ];
  if (!req.cookies.jwt && !publicRoutes.includes(req.path)) {
    return res.redirect("/login");
  }
  next();
};

// Public routes (no auth required)
app.get("/", (req, res) => {
  const isLoggedIn = Boolean(req.cookies.jwt);
  res.render("homepage.ejs", { loggedIn: isLoggedIn });
});

app.get("/about", (req, res) => {
  const isLoggedIn = Boolean(req.cookies.jwt);
  res.render("about.ejs", { loggedIn: isLoggedIn });
});

app.get("/contact", (req, res) => {
  const isLoggedIn = Boolean(req.cookies.jwt);
  res.render("contact.ejs", { loggedIn: isLoggedIn });
});

app.get("/login", (req, res) => {
  const { redirect, message } = req.query;
  res.render("login.ejs", { redirect, message });
});

app.get("/signup", (req, res) => {
  res.render("signup.ejs");
});

//routes for login and signup
//signup
const signup = async (req, res) => {
  try {
    console.log("Received signup request with data:", req.body);

    const { name, rollNo, email, hostel, roomNo, year, password } = req.body;

    // Validate required fields
    if (
      !name ||
      !rollNo ||
      !email ||
      !hostel ||
      !roomNo ||
      !year ||
      !password
    ) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Check for existing user
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }

    // Create new user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      rollNo,
      email,
      hostel,
      roomNo,
      year,
      password: hashedPassword,
      role: "student",
    });

    generateToken(newUser._id, res);
    res.cookie("userid", newUser._id);
    res.cookie("role", newUser.role);

    return res.status(201).json({
      success: true,
      user: {
        userId: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating user",
      error: error.message,
    });
  }
};
app.post("/auth/signup", signup);

//login
const login = async (req, res) => {
  const { email, password, redirect } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      console.log("invalid user");
      return res.status(400).json({ message: "Invalid Credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      console.log("incorrect password");
      return res.status(400).json({ message: "Invalid Credentials" });
    }

    generateToken(user._id, res);
    res.cookie("role", user.role);
    res.cookie("userid", user._id);

    console.log("user found");
    console.log(user);

    // Handle redirect if provided
    const redirectTo = redirect || "/dashboard";

    return res.status(200).json({
      userId: user._id,
      name: user.name,
      rollNo: user.rollNo,
      email: user.email,
      hostel: user.hostel,
      roomNo: user.roomNo,
      year: user.year,
      role: user.role,
      redirect: redirectTo,
    });
  } catch (error) {
    console.error("ERROR in log-in controller:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
app.post("/auth/login", login);

//logout
const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.cookie("role", "", { maxAge: 0 });
    res.cookie("userid", "", { maxAge: 0 });
    res.clearCookie("jwt");
    res.clearCookie("role");
    res.clearCookie("userid");
    res.redirect("/");
  } catch (error) {
    console.log("ERROR in log-out controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
app.post("/auth/logout", logout);

app.get("/services/announcements", authMiddleware, async (req, res) => {
  try {
    const isLoggedIn = Boolean(req.cookies.jwt);
    let announcements = await Announcement.find().sort({ createdAt: -1 });
    const { role } = req.cookies;

    res.render("announcements", { announcements, role, loggedIn: isLoggedIn });
  } catch (error) {
    console.error("Error fetching announcements:", error);
    res.status(500).send("Error fetching announcements");
  }
});

app.post("/services/announcement", async (req, res) => {
  const { title, message } = req.body;

  if (!title || !message) {
    return res.status(400).send("No title or message provided");
  }

  try {
    const newAnnouncement = await Announcement.create({
      title,
      message,
      date: new Date(),
    });

    console.log("Announcement Created:", newAnnouncement);

    res.redirect("/services/announcements");
  } catch (error) {
    console.error("Error creating announcement:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.delete("/announcements/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Announcement.findByIdAndDelete(id);
    res.status(200).send("Deleted Successfully");
  } catch (error) {
    console.error("Error deleting announcement:", error);
    res.status(500).send("Failed to delete");
  }
});

app.get("/services/problems", authMiddleware, async (req, res) => {
  const isLoggedIn = Boolean(req.cookies.jwt);
  const role = req.cookies.role;
  const userID = req.cookies.userid;

  try {
    // First try to find the user in MongoDB
    let user = await User.findById(userID).select("-password");

    // If still no user found, return error
    if (!user) {
      return res.status(404).send("User not found");
    }

    let userProblems1 = [];

    if (role !== "admin") {
      // Changed findAll to find for MongoDB and sort by createdAt descending
      userProblems1 = await hostelProblem
        .find({ hostel: user.hostel })
        .sort({ createdAt: -1 });

      if (userProblems1.length > 0) {
        userProblems1 = userProblems1.map((problem) => ({
          ...problem.toObject(), // Changed toJSON to toObject for MongoDB
          roomNumber: problem.roomNo,
          createdAt: problem.createdAt || new Date(),
        }));
      }
    } else {
      // For admin, get all problems
      userProblems1 = await hostelProblem.find().sort({ createdAt: -1 });
    }

    const problems = userProblems1;

    res.render("problems.ejs", {
      problems,
      role,
      userID,
      loggedIn: isLoggedIn,
      user,
    });
  } catch (error) {
    console.error("Error fetching problems:", error);
    res.status(500).send("Error fetching problems");
  }
});

app.post(
  "/services/problems/add",
  upload.single("problemImage"),
  async (req, res) => {
    try {
      const {
        problemTitle,
        problemDescription,
        roomNo,
        category,
        studentId,
        hostel,
      } = req.body;
      if (!req.file) {
        return res.status(400).json({ message: "Image upload is required" });
      }

      const problemImage = `/uploads/${req.file.filename}`; // Store image path relative to public folder

      console.log("Received data:", req.body);
      console.log("Uploaded file:", req.file);

      if (
        !problemTitle ||
        !problemDescription ||
        !problemImage ||
        !studentId ||
        !hostel ||
        !roomNo ||
        !category
      ) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const newProblem = {
        problemTitle,
        problemDescription,
        problemImage,
        studentId,
        hostel,
        roomNo,
        category,
        status: "Pending",
      };

      await hostelProblem.create(newProblem);
      console.log("Problem created:", newProblem);
      res.status(201).json(newProblem);
    } catch (error) {
      console.error("ERROR in creating problem:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

app.post("/services/problems/statusChange", async (req, res) => {
  const { problemId, status } = req.body;
  try {
    const problem = await hostelProblem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    // If admin/warden is setting status to "Resolved", change it to "ToBeConfirmed"
    if (status === "Resolved") {
      problem.status = "ToBeConfirmed";
      // Don't set timeResolved yet, it will be set when student confirms
    } else {
      problem.status = status;

      // If the status is being set back to Pending, reset the studentStatus
      if (status === "Pending") {
        problem.studentStatus = "NotResolved";
      }

      // Only set timeResolved for Rejected status
      if (status === "Rejected") {
        problem.timeResolved = new Date();
      }
    }

    await problem.save();
    res.status(200).json({ message: "Status updated successfully" });
  } catch (error) {
    console.error("ERROR in status change:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/services/problems/student-confirmation", async (req, res) => {
  try {
    const { problemId, isResolved } = req.body;

    // Find and update the problem
    const problem = await hostelProblem.findById(problemId);

    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    if (isResolved === true) {
      // Student confirms resolution
      problem.studentStatus = "Resolved";
      problem.status = "Resolved";
      problem.timeResolved = new Date(); // Set the resolution time now

      await problem.save();

      res.status(200).json({
        success: true,
        message: "Problem resolution confirmed by student",
      });
    } else {
      // Student rejects resolution
      problem.studentStatus = "Rejected";
      problem.status = "Pending"; // Reset to pending for admin/warden

      await problem.save();

      res.status(200).json({
        success: true,
        message: "Problem marked as not resolved and returned to pending",
      });
    }
  } catch (error) {
    console.error("Error in student confirmation:", error);
    res.status(500).json({
      success: false,
      message: "Error confirming problem resolution",
    });
  }
});

app.get("/services/register", authMiddleware, async (req, res) => {
  try {
    const isLoggedIn = Boolean(req.cookies.jwt);
    const transitEntries = await Transit.find().sort({ createdAt: -1 });

    const formattedEntries = transitEntries.map((entry) => ({
      studentName: entry.studentName,
      studentHostel: entry.studentHostel,
      studentRoomNumber: entry.studentRoomNumber,
      studentRollNumber: entry.studentRollNumber,
      purpose: entry.purpose,
      transitStatus: entry.transitStatus,
      date: entry.createdAt.toISOString().split("T")[0], // Extract YYYY-MM-DD
      time: entry.createdAt.toISOString().split("T")[1].split(".")[0], // Extract HH:MM:SS
    }));
    const mergedData = formattedEntries;

    res.render("register.ejs", { entryExit: mergedData, loggedIn: isLoggedIn });
  } catch (error) {
    console.error("Error fetching transit data:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/services/transit", async (req, res) => {
  try {
    const {
      studentRollNumber,
      purpose,
      transitStatus,
      studentName,
      studentHostel,
      studentRoomNumber,
    } = req.body;

    if (!studentRollNumber || !purpose || !transitStatus) {
      return res.status(400).send("All fields are required.");
    }

    await Transit.create({
      studentRollNumber,
      purpose,
      transitStatus,
      studentName,
      studentHostel,
      studentRoomNumber,
    });

    res.redirect("/services/register"); // Redirect back to the transit page
  } catch (error) {
    console.error("Error adding transit entry:", error);
    res.status(500).send("Internal Server Error");
  }
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

app.get("/services/mess", async (req, res) => {
  try {
    const isLoggedIn = Boolean(req.cookies.jwt);
    const menuItems = await MenuItems.find();

    // Calculate ratings for each day-meal combination
    const dayMealRatings = {};
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const mealTypes = ["Breakfast", "Lunch", "Snacks", "Dinner"];

    // Initialize the structure
    days.forEach((day) => {
      dayMealRatings[day] = {};
      mealTypes.forEach((meal) => {
        dayMealRatings[day][meal] = {
          count: 0,
          totalRating: 0,
          averageRating: 0,
        };
      });
    });

    // Get all feedback entries
    const feedbackData = await Feedback.find();

    // Calculate totals and averages for each day-meal combo
    feedbackData.forEach((feedback) => {
      const day = feedback.day;
      const mealType = feedback.mealType;

      if (dayMealRatings[day] && dayMealRatings[day][mealType]) {
        dayMealRatings[day][mealType].count += 1;
        dayMealRatings[day][mealType].totalRating += parseInt(feedback.rating);
      }
    });

    // Calculate average for each day-meal combination
    days.forEach((day) => {
      mealTypes.forEach((meal) => {
        if (dayMealRatings[day][meal].count > 0) {
          dayMealRatings[day][meal].averageRating = (
            dayMealRatings[day][meal].totalRating /
            dayMealRatings[day][meal].count
          ).toFixed(1);
        }
      });
    });

    // For backwards compatibility, also provide meal-only ratings for the feedback dashboard
    const mealTypeRatings = {
      Breakfast: { count: 0, totalRating: 0, averageRating: 0 },
      Lunch: { count: 0, totalRating: 0, averageRating: 0 },
      Snacks: { count: 0, totalRating: 0, averageRating: 0 },
      Dinner: { count: 0, totalRating: 0, averageRating: 0 },
    };

    // Calculate totals and averages
    feedbackData.forEach((feedback) => {
      if (mealTypeRatings[feedback.mealType]) {
        mealTypeRatings[feedback.mealType].count += 1;
        mealTypeRatings[feedback.mealType].totalRating += parseInt(
          feedback.rating
        );
      }
    });

    // Calculate average for each meal type
    Object.keys(mealTypeRatings).forEach((mealType) => {
      if (mealTypeRatings[mealType].count > 0) {
        mealTypeRatings[mealType].averageRating = (
          mealTypeRatings[mealType].totalRating /
          mealTypeRatings[mealType].count
        ).toFixed(1);
      }
    });

    res.render("menu", {
      menuItems,
      dayMealRatings,
      mealTypeRatings, // Keep this for backward compatibility
      query: req.query,
      loggedIn: isLoggedIn,
    });
  } catch (error) {
    console.error("Error fetching menu items:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Updated feedback route to use MongoDB and require authentication
app.post("/feedback", authMiddleware, async (req, res) => {
  try {
    const { rating, comment, day, mealType } = req.body;
    const sanitizedComment = comment.replace(/[\r\n]+/g, " ").trim();

    // Get user ID from cookies (will always be available due to authMiddleware)
    const userId = req.cookies.userid;

    if (!userId) {
      return res
        .status(401)
        .redirect("/login?redirect=/services/mess&message=login_required");
    }

    // Create new feedback using the Mongoose model
    const newFeedback = new Feedback({
      rating: rating || "No rating provided",
      comment: sanitizedComment || "No comment provided",
      day: day || "Sunday", // Default to Sunday if none provided
      mealType: mealType || "Breakfast", // Default to Breakfast if none provided
      user: userId, // User ID from auth middleware
    });

    // Save to MongoDB
    await newFeedback.save();

    res.redirect("/services/mess?feedback=success");
  } catch (error) {
    console.error("Error saving feedback:", error);
    res.status(500).send(error.message);
  }
});

app.get("/services/chatRoom", authMiddleware, async (req, res) => {
  try {
    const isLoggedIn = Boolean(req.cookies.jwt);
    const { role } = req.cookies;

    // Fetch all chat rooms
    const chatRoomsAll = await ChatRoom.find().sort({ createdAt: -1 });

    // Filter rooms based on role and accessLevel
    const chatRooms = chatRoomsAll.filter((room) => {
      if (room.accessLevel === "all") return true;
      if (room.accessLevel === "admins" && role === "admin") return true;
      if (room.accessLevel === "students" && role === "student") return true;
      if (room.accessLevel === "wardens" && role === "warden") return true;
      // If none match, user can't see the room
      return false;
    });

    // Now only the rooms the user can see will be passed to EJS
    res.render("chatRoom.ejs", { role, loggedIn: isLoggedIn, chatRooms });
  } catch (error) {
    console.error("Error loading chat rooms:", error);
    res.status(500).send("Error loading chat rooms");
  }
});

app.post("/services/chatRoom/create", authMiddleware, async (req, res) => {
  try {
    const { role, userid } = req.cookies;
    // Only admin and warden can create a chat room
    if (role !== "admin" && role !== "warden") {
      return res.status(403).send("Unauthorized");
    }

    const { roomName, roomType, description, accessLevel, roomIcon } = req.body;
    if (!roomName || !roomType || !accessLevel) {
      return res.status(400).send("Missing required fields");
    }

    const newRoom = await ChatRoom.create({
      roomName,
      roomType,
      description,
      accessLevel,
      roomIcon: roomIcon || "fas fa-comments", // default icon if not provided
      createdBy: userid,
    });

    res.status(201).json(newRoom);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

app.delete(
  "/services/chatRoom/delete/:id",
  authMiddleware,
  async (req, res) => {
    try {
      const { role } = req.cookies;
      if (role !== "admin" && role !== "warden") {
        return res.status(403).send("Unauthorized");
      }

      const { id } = req.params;
      await ChatRoom.findByIdAndDelete(id);
      res.status(200).send("Deleted Successfully");
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal server error");
    }
  }
);

// Route to fetch user by roll number
app.get("/services/users/by-roll/:rollNo", async (req, res) => {
  try {
    const { rollNo } = req.params;

    // Find user with the provided roll number
    const user = await User.findOne({ rollNo }).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      name: user.name,
      hostel: user.hostel,
      roomNo: user.roomNo,
    });
  } catch (error) {
    console.error("Error fetching user by roll number:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// Add route to view feedback data (admin only)
app.get("/services/feedback", authMiddleware, async (req, res) => {
  try {
    const { role } = req.cookies;
    const isLoggedIn = Boolean(req.cookies.jwt);

    // Only admin and warden can access feedback data
    if (role !== "admin" && role !== "warden") {
      return res
        .status(403)
        .send("Access denied. Only admin and warden can view feedback data.");
    }

    // Get query parameters for filtering
    const { day, mealType, startDate, endDate } = req.query;

    // Build query based on filters
    const query = {};
    if (day) query.day = day;
    if (mealType) query.mealType = mealType;

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDateTime;
      }
    }

    // Fetch feedback data with filters
    const feedbackData = await Feedback.find(query)
      .sort({ createdAt: -1 })
      .populate("user", "name email");

    // Group feedback by day and meal type for statistics
    const statistics = {};
    const totalRatings = feedbackData.reduce((acc, feedback) => {
      const key = `${feedback.day}-${feedback.mealType}`;
      if (!statistics[key]) {
        statistics[key] = {
          day: feedback.day,
          mealType: feedback.mealType,
          count: 0,
          totalRating: 0,
          averageRating: 0,
        };
      }
      statistics[key].count += 1;
      statistics[key].totalRating += parseInt(feedback.rating);
      statistics[key].averageRating = (
        statistics[key].totalRating / statistics[key].count
      ).toFixed(1);
      return acc + parseInt(feedback.rating);
    }, 0);

    const averageRating =
      feedbackData.length > 0
        ? (totalRatings / feedbackData.length).toFixed(1)
        : 0;

    // Calculate average ratings by meal type across all days
    const mealTypeStats = {
      Breakfast: { count: 0, totalRating: 0, averageRating: 0 },
      Lunch: { count: 0, totalRating: 0, averageRating: 0 },
      Snacks: { count: 0, totalRating: 0, averageRating: 0 },
      Dinner: { count: 0, totalRating: 0, averageRating: 0 },
    };

    feedbackData.forEach((feedback) => {
      if (mealTypeStats[feedback.mealType]) {
        mealTypeStats[feedback.mealType].count += 1;
        mealTypeStats[feedback.mealType].totalRating += parseInt(
          feedback.rating
        );
      }
    });

    // Calculate average for each meal type
    Object.keys(mealTypeStats).forEach((mealType) => {
      if (mealTypeStats[mealType].count > 0) {
        mealTypeStats[mealType].averageRating = (
          mealTypeStats[mealType].totalRating / mealTypeStats[mealType].count
        ).toFixed(1);
      }
    });

    res.render("feedbackData", {
      feedbackData,
      statistics: Object.values(statistics),
      mealTypeStats,
      averageRating,
      filters: { day, mealType, startDate, endDate },
      loggedIn: isLoggedIn,
      role,
    });
  } catch (error) {
    console.error("Error fetching feedback data:", error);
    res.status(500).send("Error fetching feedback data");
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server is listening on port ${process.env.PORT}`);
  console.log(`Server running on http://localhost:${process.env.PORT}/`);
});
