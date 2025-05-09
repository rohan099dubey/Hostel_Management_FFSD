const Transit = require("../models/transit");
const User = require("../models/user.js");

exports.getTransitRegister = async (req, res) => {
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

    res.render("register.ejs", {
      entryExit: formattedEntries,
      loggedIn: isLoggedIn,
    });
  } catch (error) {
    console.error("Error fetching transit data:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.addTransitEntry = async (req, res) => {
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
};

exports.getStudentByRollNumber = async (req, res) => {
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
};
