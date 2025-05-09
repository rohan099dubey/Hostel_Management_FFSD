const express = require("express");
const router = express.Router();
const {
  generateOTP,
  verifyOTP,
  signup,
  login,
  logout,
} = require("../controllers/authController");

// Auth routes
router.post("/generate-otp", generateOTP);
router.post("/verify-otp", verifyOTP);
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

module.exports = router;
