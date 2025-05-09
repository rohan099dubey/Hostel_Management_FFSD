const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user.js");
const OTP = require("../models/otp.js");
const nodemailer = require("nodemailer");

/**
 * Generate JWT token and set cookie
 */
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

/**
 * Auth middleware to protect routes
 */
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
  const isApiRequest =
    req.xhr ||
    req.headers.accept?.includes("application/json") ||
    req.headers["content-type"] === "application/json";

  if (
    (!req.cookies.jwt || !req.cookies.userid) &&
    !publicRoutes.includes(req.path)
  ) {
    if (isApiRequest) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    return res.redirect("/login");
  }
  next();
};

/**
 * Generate OTP for email verification
 */
const generateOTP = async (req, res) => {
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
};

/**
 * Verify OTP and create user account if userData is provided
 */
const verifyOTP = async (req, res) => {
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
};

/**
 * User signup
 */
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

/**
 * User login
 */
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

/**
 * User logout
 */
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

module.exports = {
  generateToken,
  authMiddleware,
  generateOTP,
  verifyOTP,
  signup,
  login,
  logout,
};
