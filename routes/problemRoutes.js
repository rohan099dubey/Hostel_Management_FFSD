const express = require("express");
const router = express.Router();
const {
  getProblems,
  addProblem,
  updateProblemStatus,
  studentConfirmation,
} = require("../controllers/problemController");
const { authMiddleware } = require("../controllers/authController");
const { problemUpload } = require("../config/cloudinary");

// Problem routes
router.get("/", authMiddleware, getProblems);
router.post("/add", problemUpload.single("problemImage"), addProblem);
router.post("/statusChange", updateProblemStatus);
router.post("/student-confirmation", studentConfirmation);

module.exports = router;
