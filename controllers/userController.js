const User = require("../models/user.js");
const bcrypt = require("bcrypt");

// Get student list based on role
exports.getStudentList = async (req, res) => {
  try {
    const { role, userid } = req.cookies;
    const isLoggedIn = Boolean(req.cookies.jwt);

    // Only admin and warden roles can access this page
    if (role !== "admin" && role !== "warden") {
      return res.redirect("/dashboard");
    }

    const userInfo = await User.findById(userid).select("-password");

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
};

// Add new warden
exports.addWarden = async (req, res) => {
  try {
    const { name, email, hostel, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const newWarden = await User.create({
      name,
      email,
      hostel,
      password: hashedPassword,
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
};

// Delete warden
exports.deleteWarden = async (req, res) => {
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
};

// Update fee status
exports.updateFeeStatus = async (req, res) => {
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
      message: `${
        feeType === "hostelFees" ? "Hostel" : "Mess"
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
};
