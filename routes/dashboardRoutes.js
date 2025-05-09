const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const { authMiddleware } = require("../controllers/authController");

router.get("/dashboard", authMiddleware, dashboardController.renderDashboard);

module.exports = router;
