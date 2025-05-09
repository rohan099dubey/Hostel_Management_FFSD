const User = require("../models/user.js");
const hostelProblem = require("../models/problem.js");

exports.renderDashboard = async (req, res) => {
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

      return res.render("partials/dashboard/student.ejs", {
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

      return res.render("partials/dashboard/warden.ejs", {
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
      return res.render("partials/dashboard/admin.ejs", {
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
};
