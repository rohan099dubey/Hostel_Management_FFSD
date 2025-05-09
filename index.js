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
const cloudinaryHelper = require('./utils/cloudinaryHelper');

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
const OTP = require("./models/otp.js");

// Import the dedicated Feedback model from models/feedback.js
const Feedback = require("./models/feedback");

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

// OTP generation endpoint
app.post("/auth/generate-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Validate email format (@iiits.in)
    if (!email.endsWith("@iiits.in")) {
      return res
        .status(400)
        .json({ message: "Email must be a valid @iiits.in address." });
    }

    // Check if email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP to database (replace existing if any)
    await OTP.findOneAndDelete({ email });
    await OTP.create({ email, otp });

    // Set up email transporter
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

    // Email content
    const mailOptions = {
      from: `"Hostelia - IIIT Sri City" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Email Verification OTP for Hostelia",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 5px;">
          <h2 style="color: #4f46e5;">Hostelia - Email Verification</h2>
          <p>Hello,</p>
          <p>Your One-Time Password (OTP) for email verification is:</p>
          <div style="background-color: #f3f4f6; padding: 10px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${otp}
          </div>
          <p>This OTP is valid for 10 minutes.</p>
          <p>If you did not request this OTP, please ignore this email.</p>
          <p>Best regards,<br>Hostelia Team</p>
        </div>
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email address",
    });
  } catch (error) {
    console.error("Error generating OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Error generating OTP",
      error: error.message,
    });
  }
});

// OTP verification endpoint
app.post("/auth/verify-otp", async (req, res) => {
  try {
    const { email, otp, userData } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    // Find the OTP record
    const otpRecord = await OTP.findOne({ email });

    if (!otpRecord) {
      return res.status(400).json({
        message: "OTP expired or not found. Please request a new one.",
      });
    }

    // Check if OTP matches
    if (otpRecord.otp !== otp) {
      return res
        .status(400)
        .json({ message: "Invalid OTP. Please try again." });
    }

    // OTP is valid - delete it after verification
    await OTP.findOneAndDelete({ email });

    // If userData is provided, create the user account
    if (userData) {
      const { name, rollNo, hostel, roomNo, year, password } = userData;

      // Validate required fields
      if (!name || !rollNo || !hostel || !roomNo || !year || !password) {
        return res.status(400).json({ message: "All fields are required." });
      }

      // Validate roll number format (3 digits)
      if (!/^[0-9]{3}$/.test(rollNo)) {
        return res
          .status(400)
          .json({ message: "Roll number must be exactly 3 digits." });
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

      // Generate token and set cookies
      generateToken(newUser._id, res);
      res.cookie("userid", newUser._id);
      res.cookie("role", newUser.role);

      return res.status(200).json({
        success: true,
        message: "Email verified and account created successfully",
        verified: true,
        user: {
          userId: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      verified: true,
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Error verifying OTP",
      error: error.message,
    });
  }
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

    // Validate roll number format (3 digits)
    if (!/^[0-9]{3}$/.test(rollNo)) {
      return res
        .status(400)
        .json({ message: "Roll number must be exactly 3 digits." });
    }

    // Validate email format (@iiits.in)
    if (!email.endsWith("@iiits.in")) {
      return res
        .status(400)
        .json({ message: "Email must be a valid @iiits.in address." });
    }

    // Check if email is verified
    const otpRecord = await OTP.findOne({ email });
    if (otpRecord) {
      return res
        .status(400)
        .json({ message: "Please verify your email before signing up." });
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
  problemUpload.single("problemImage"),
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

      console.log("Received data:", req.body);
      console.log("Uploaded file:", req.file);

      if (
        !problemTitle ||
        !problemDescription ||
        !studentId ||
        !hostel ||
        !roomNo ||
        !category
      ) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Upload file to Cloudinary using helper
      const result = await cloudinaryHelper.uploadLocalFile(
        req.file.path,
        'hostel_problems',
        { transformation: [{ width: 1000, height: 800, crop: "limit" }] }
      );

      // Create new problem with Cloudinary URL
      const newProblem = {
        problemTitle,
        problemDescription,
        problemImage: result.secure_url, // Use the Cloudinary URL
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
    const { studentRollNumber, purpose, transitStatus } = req.body;

    if (!studentRollNumber || !purpose || !transitStatus) {
      return res.status(400).send("All fields are required.");
    }

    // Fetch student details from MongoDB
    const student = await User.findOne({ rollNo: studentRollNumber });
    if (!student) {
      return res
        .status(400)
        .send(
          "No student found for this roll number. Please enter a valid roll number and wait for details to autofill."
        );
    }

    await Transit.create({
      studentRollNumber,
      purpose,
      transitStatus,
      studentName: student.name,
      studentHostel: student.hostel,
      studentRoomNumber: student.roomNo,
    });

    res.redirect("/services/register");
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
    const { role, userid } = req.cookies;

    // Get user info for hostel check
    const user = await User.findById(userid);
    if (!user) {
      return res.redirect("/login");
    }

    // Fetch all chat rooms
    const chatRoomsAll = await ChatRoom.find().sort({ createdAt: -1 });

    // Pass all rooms to the frontend (access control handled in EJS)
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
});

app.post("/services/chatRoom/create", authMiddleware, async (req, res) => {
  try {
    const { role, userid } = req.cookies;
    // Only admin and warden can create a chat room
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

    // Validate that hostel is selected if access level includes students
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

    // Duplicate check: same accessLevel, roomType, and restrictedToHostel (if relevant)
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
      const { role, userid } = req.cookies;
      if (role !== "admin" && role !== "warden") {
        console.log("Unauthorized delete attempt:", {
          userId: userid,
          role,
          roomId: req.params.id,
        });
        return res.status(403).json({ error: "Unauthorized" });
      }

      const { id } = req.params;
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        console.log("Invalid room ID format:", id);
        return res.status(400).json({ error: "Invalid room ID format" });
      }

      // Hard delete the chat room
      const deletedRoom = await ChatRoom.findByIdAndDelete(id);
      if (!deletedRoom) {
        console.log("Chat room not found for deletion:", id);
        return res
          .status(404)
          .json({ error: "Chat room not found or already deleted" });
      }

      // Log the deletion for debugging
      console.log("Chat Room Deleted:", {
        roomId: id,
        roomName: deletedRoom.roomName,
        deletedBy: req.cookies.userid,
        deletedByRole: role,
        deletedAt: new Date(),
      });

      // Notify all connected clients about the room deletion
      io.emit("chatRoomDeleted", {
        roomId: id,
        message: "Chat room has been deleted by an administrator",
      });

      return res
        .status(200)
        .json({ success: true, message: "Deleted Successfully" });
    } catch (err) {
      console.error("Error deleting chat room:", err);
      return res
        .status(500)
        .json({ error: "Internal server error", details: err.message });
    }
  }
);

// Add a route to verify chat room status (for debugging)
app.get("/services/chatRoom/status/:id", authMiddleware, async (req, res) => {
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
});

// Chat Room View Route
app.get("/services/chatRoom/:roomId", async (req, res) => {
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

    // Check access level including hostel restriction
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
  socket.on('sendMessage', async ({ roomId, userId, message, imageData, userName }) => {
    try {
      const chatRoom = await ChatRoom.findById(roomId);
      if (!chatRoom) {
        socket.emit('error', { message: 'Chat room not found' });
        return;
      }

      let cloudinaryUrl = null;

      // If imageData is provided (base64), upload to Cloudinary
      if (imageData && imageData.startsWith('data:image')) {
        try {
          // Upload base64 image to Cloudinary using helper
          const result = await cloudinaryHelper.uploadBase64Image(
            imageData,
            'hostel_chat',
            { transformation: [{ width: 800, height: 600, crop: 'limit' }] }
          );
          cloudinaryUrl = result.secure_url;
        } catch (uploadError) {
          console.error("Error uploading to Cloudinary:", uploadError);
          socket.emit('error', { message: 'Error uploading image' });
          return;
        }
      }

      // Save message to database using Cloudinary URL if available
      chatRoom.messages.push({
        userId,
        userName,
        message,
        imageData: cloudinaryUrl || imageData, // Use Cloudinary URL if available
        timestamp: new Date()
      });
      await chatRoom.save();

      // Broadcast message to room
      io.to(roomId).emit('newMessage', {
        userId,
        userName,
        message,
        imageData: cloudinaryUrl || imageData, // Use Cloudinary URL if available
        timestamp: new Date()
      });
    } catch (error) {
      console.error("Error in sendMessage:", error);
      socket.emit('error', { message: 'Error sending message' });
    }
  });

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
    // Otherwise, wardens can access warden/admin_warden rooms
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

// Email API endpoints
app.post("/send-fee-reminder", authMiddleware, async (req, res) => {
  try {
    const { role, userid } = req.cookies;

    // Only admin and warden can send email reminders
    if (role !== "admin" && role !== "warden") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { studentId, emailType, notes } = req.body;

    // Find the student
    const student = await User.findById(studentId);

    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    // Get sender info
    const sender = await User.findById(userid);

    // Prepare email content based on email type
    let emailSubject, emailContent;

    if (emailType === "hostelFee" || emailType === "both") {
      emailSubject = "Reminder: Hostel Fee Payment Due";
      emailContent = `<p>Dear ${student.name},</p>
      <p>This is a friendly reminder that your hostel fee payment is due. Please make the payment as soon as possible to avoid any inconvenience.</p>
      ${notes ? `<p><strong>Additional Notes:</strong> ${notes}</p>` : ""}
      <p>If you have already made the payment, please ignore this email.</p>
      <p>Best regards,<br>${sender.name}<br>${sender.role.charAt(0).toUpperCase() + sender.role.slice(1)
        }</p>`;
    }

    if (emailType === "messFee" || emailType === "both") {
      // If already set for hostelFee, add to the content
      if (emailSubject) {
        emailSubject = "Reminder: Hostel and Mess Fee Payments Due";
        emailContent = `<p>Dear ${student.name},</p>
        <p>This is a friendly reminder that your hostel and mess fee payments are due. Please make the payments as soon as possible to avoid any inconvenience.</p>
        ${notes ? `<p><strong>Additional Notes:</strong> ${notes}</p>` : ""}
        <p>If you have already made the payments, please ignore this email.</p>
        <p>Best regards,<br>${sender.name}<br>${sender.role.charAt(0).toUpperCase() + sender.role.slice(1)
          }</p>`;
      } else {
        emailSubject = "Reminder: Mess Fee Payment Due";
        emailContent = `<p>Dear ${student.name},</p>
        <p>This is a friendly reminder that your mess fee payment is due. Please make the payment as soon as possible to avoid any inconvenience.</p>
        ${notes ? `<p><strong>Additional Notes:</strong> ${notes}</p>` : ""}
        <p>If you have already made the payment, please ignore this email.</p>
        <p>Best regards,<br>${sender.name}<br>${sender.role.charAt(0).toUpperCase() + sender.role.slice(1)
          }</p>`;
      }
    }

    // Set up nodemailer transporter with proper configuration
    try {
      // Create a transporter with SMTP configuration
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || "smtp.gmail.com", // Fallback to Gmail if env var not loaded
        port: parseInt(process.env.EMAIL_PORT || "587"), // Convert to number and provide fallback
        secure: process.env.EMAIL_SECURE === "true", // Convert string to boolean
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false, // Helps in development environments
        },
        debug: true, // Enable debug output
      });

      // Verify connection configuration
      transporter.verify(function (error, success) {
        if (error) {
          console.log("SMTP connection error:", error);
        } else {
          console.log("SMTP server is ready to take our messages");
        }
      });

      // Email options
      const mailOptions = {
        from: `"Hostelia - ${sender.name}" <${process.env.EMAIL_USER}>`,
        to: student.email,
        subject: emailSubject,
        html: emailContent,
      };

      // Send email
      const info = await transporter.sendMail(mailOptions);

      console.log("Email sent successfully:", info.messageId);

      res.status(200).json({
        success: true,
        message: `Fee reminder sent to ${student.name}`,
        emailId: info.messageId,
      });
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      res.status(500).json({
        success: false,
        message: "Error sending email: " + emailError.message,
      });
    }
  } catch (error) {
    console.error("Error in fee reminder process:", error);
    res.status(500).json({
      success: false,
      message: "Error processing fee reminder",
      error: error.message,
    });
  }
});

// Send reminders to multiple students
app.post("/send-bulk-fee-reminders", authMiddleware, async (req, res) => {
  try {
    const { role, userid } = req.cookies;

    // Only admin and warden can send email reminders
    if (role !== "admin" && role !== "warden") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { studentIds, emailType, notes } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No students specified" });
    }

    // Get sender info
    const sender = await User.findById(userid);

    // Find all specified students
    const students = await User.find({ _id: { $in: studentIds } });

    if (students.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No students found" });
    }

    // Set up nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com", // Fallback to Gmail if env var not loaded
      port: parseInt(process.env.EMAIL_PORT || "587"), // Convert to number and provide fallback
      secure: process.env.EMAIL_SECURE === "true", // Convert string to boolean
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false, // Helps in development environments
      },
      debug: true, // Enable debug output
    });

    // Track successes and failures
    const results = {
      success: [],
      failed: [],
    };

    // Send emails to each student
    for (const student of students) {
      try {
        // Prepare email content based on email type
        let emailSubject, emailContent;

        if (emailType === "hostelFee" || emailType === "both") {
          emailSubject = "Reminder: Hostel Fee Payment Due";
          emailContent = `<p>Dear ${student.name},</p>
          <p>This is a friendly reminder that your hostel fee payment is due. Please make the payment as soon as possible to avoid any inconvenience.</p>
          ${notes ? `<p><strong>Additional Notes:</strong> ${notes}</p>` : ""}
          <p>If you have already made the payment, please ignore this email.</p>
          <p>Best regards,<br>${sender.name}<br>${sender.role.charAt(0).toUpperCase() + sender.role.slice(1)
            }</p>`;
        }

        if (emailType === "messFee" || emailType === "both") {
          // If already set for hostelFee, add to the content
          if (emailSubject) {
            emailSubject = "Reminder: Hostel and Mess Fee Payments Due";
            emailContent = `<p>Dear ${student.name},</p>
            <p>This is a friendly reminder that your hostel and mess fee payments are due. Please make the payments as soon as possible to avoid any inconvenience.</p>
            ${notes ? `<p><strong>Additional Notes:</strong> ${notes}</p>` : ""}
            <p>If you have already made the payments, please ignore this email.</p>
            <p>Best regards,<br>${sender.name}<br>${sender.role.charAt(0).toUpperCase() + sender.role.slice(1)
              }</p>`;
          } else {
            emailSubject = "Reminder: Mess Fee Payment Due";
            emailContent = `<p>Dear ${student.name},</p>
            <p>This is a friendly reminder that your mess fee payment is due. Please make the payment as soon as possible to avoid any inconvenience.</p>
            ${notes ? `<p><strong>Additional Notes:</strong> ${notes}</p>` : ""}
            <p>If you have already made the payment, please ignore this email.</p>
            <p>Best regards,<br>${sender.name}<br>${sender.role.charAt(0).toUpperCase() + sender.role.slice(1)
              }</p>`;
          }
        }

        // Email options
        const mailOptions = {
          from: `"Hostelia - ${sender.name}" <${process.env.EMAIL_USER}>`,
          to: student.email,
          subject: emailSubject,
          html: emailContent,
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);

        console.log(`Email sent to ${student.email}: ${info.messageId}`);
        results.success.push({
          id: student._id,
          name: student.name,
          email: student.email,
          messageId: info.messageId,
        });
      } catch (error) {
        console.error(`Error sending email to ${student.email}:`, error);
        results.failed.push({
          id: student._id,
          name: student.name,
          email: student.email,
          error: error.message,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Sent ${results.success.length} emails, failed to send ${results.failed.length} emails`,
      results,
    });
  } catch (error) {
    console.error("Error sending bulk fee reminders:", error);
    res.status(500).json({
      success: false,
      message: "Error sending bulk fee reminders",
      error: error.message,
    });
  }
});

// Update fee status route
app.post(
  "/services/users/update-fee-status",
  authMiddleware,
  async (req, res) => {
    try {
      const { role } = req.cookies;
      const { studentId, feeType, status } = req.body;

      // Only admin and warden can update fee status
      if (role !== "admin" && role !== "warden") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Validate input
      if (!studentId || !feeType || !status) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      if (!["hostelFees", "messFees"].includes(feeType)) {
        return res.status(400).json({ message: "Invalid fee type" });
      }

      if (!["paid", "unpaid"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      // Find and update the student
      const student = await User.findById(studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Initialize feeStatus if it doesn't exist
      if (!student.feeStatus) {
        student.feeStatus = {
          hostelFees: false,
          messFees: false,
        };
      }

      // Update the fee status
      student.feeStatus[feeType] = status === "paid";
      await student.save();

      res.status(200).json({
        success: true,
        message: `${feeType === "hostelFees" ? "Hostel" : "Mess"
          } fee status updated successfully`,
        student: {
          id: student._id,
          name: student.name,
          feeStatus: student.feeStatus,
        },
      });
    } catch (error) {
      console.error("Error updating fee status:", error);
      res.status(500).json({
        success: false,
        message: "Error updating fee status",
        error: error.message,
      });
    }
  }
);

// Help request form submission route
app.post("/submit-help-request", async (req, res) => {
  try {
    console.log("Received form data:", req.body);

    // Extract data from request body
    const { name, room, email, phone, request_type, message, urgency } =
      req.body;

    console.log("Extracted values:", {
      name,
      room,
      email,
      phone,
      request_type,
      message,
      urgency,
    });

    // Validate required fields
    if (
      !name ||
      !room ||
      !email ||
      !phone ||
      !request_type ||
      !message ||
      !urgency
    ) {
      console.log("Missing fields:", {
        name: !name ? "missing" : "present",
        room: !room ? "missing" : "present",
        email: !email ? "missing" : "present",
        phone: !phone ? "missing" : "present",
        request_type: !request_type ? "missing" : "present",
        message: !message ? "missing" : "present",
        urgency: !urgency ? "missing" : "present",
      });
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
    if (err.code !== 'EEXIST') {
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
