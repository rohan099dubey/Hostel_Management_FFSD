const hostelProblem = require("../models/problem.js");
const User = require("../models/user.js");
const cloudinaryHelper = require("../utils/cloudinaryHelper");
const nodemailer = require("nodemailer");

/**
 * Get all problems for the current user based on role
 */
const getProblems = async (req, res) => {
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
};

/**
 * Add a new problem
 */
const addProblem = async (req, res) => {
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
      "hostel_problems",
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
};

/**
 * Update problem status (by admin/warden)
 */
const updateProblemStatus = async (req, res) => {
  const { problemId, status } = req.body;
  try {
    console.log(
      `Status change request for problem ID: ${problemId}, new status: ${status}`
    );

    const problem = await hostelProblem.findById(problemId);
    if (!problem) {
      console.log(`Problem not found with ID: ${problemId}`);
      return res.status(404).json({ message: "Problem not found" });
    }

    console.log(
      `Current problem status: ${problem.status}, changing to: ${
        status === "Resolved" ? "ToBeConfirmed" : status
      }`
    );

    // Avoid duplicate emails by checking if the status is already "ToBeConfirmed"
    if (status === "Resolved" && problem.status !== "ToBeConfirmed") {
      problem.status = "ToBeConfirmed";
      // Don't set timeResolved yet, it will be set when student confirms

      // Find the student by roll number
      const student = await User.findOne({ rollNo: problem.studentId });

      if (student && student.email) {
        console.log(
          `Preparing to send confirmation email to student: ${student.name} (${student.email})`
        );

        try {
          // Set up email transporter with proper error handling
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
            debug: true, // Enable debug output
          });

          console.log(
            `Email configuration: ${process.env.EMAIL_HOST}, Port: ${process.env.EMAIL_PORT}, User: ${process.env.EMAIL_USER}`
          );

          // Email HTML content
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 5px;">
              <h2 style="color: #4f46e5;">Problem Resolution Confirmation</h2>
              <p>Hello ${student.name},</p>
              <p>We're pleased to inform you that your reported problem has been marked as resolved:</p>
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <p><strong>Problem:</strong> ${problem.problemTitle}</p>
                <p><strong>Category:</strong> ${problem.category}</p>
                <p><strong>Room:</strong> ${problem.roomNo}</p>
                <p><strong>Description:</strong> ${problem.problemDescription}</p>
              </div>
              <p>Please confirm if this problem has been resolved to your satisfaction by logging into your dashboard and selecting either "Confirm Resolution" or "Not Resolved".</p>
              <p>If you don't confirm within 3 days, the problem will be automatically marked as resolved.</p>
              <p>Thank you for your cooperation.</p>
              <p>Best regards,<br>Hostelia Support Team</p>
            </div>
          `;

          // Send email to student
          const mailOptions = {
            from: `"Hostelia Support" <${process.env.EMAIL_USER}>`,
            to: student.email,
            subject: "Problem Resolution Confirmation Required",
            html: emailHtml,
          };

          console.log(
            `Sending email to: ${student.email}, Subject: Problem Resolution Confirmation Required`
          );

          // Use async/await and proper error handling for email sending
          try {
            const info = await transporter.sendMail(mailOptions);
            console.log(
              `Resolution confirmation email sent to ${student.email}, Message ID: ${info.messageId}`
            );
          } catch (sendError) {
            console.error("Failed to send email:", sendError);
          }
        } catch (emailError) {
          console.error("Error setting up email:", emailError);
          // Continue even if email fails, don't block the status update
        }
      } else {
        console.log(`Student not found or missing email: ${problem.studentId}`);
      }
    } else if (status !== "Resolved") {
      problem.status = status;

      // If the status is being set back to Pending, reset the studentStatus
      if (status === "Pending") {
        problem.studentStatus = "NotResolved";
      }

      // Only set timeResolved for Rejected status
      if (status === "Rejected") {
        problem.timeResolved = new Date();
      }
    } else {
      // Status is already "ToBeConfirmed" or we're trying to set it again to "Resolved"
      console.log(
        `No status change needed: Current=${problem.status}, Requested=${status}`
      );
    }

    await problem.save();
    console.log(
      `Problem ID: ${problemId} status successfully updated to ${problem.status}`
    );
    res.status(200).json({ message: "Status updated successfully" });
  } catch (error) {
    console.error("ERROR in status change:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Student confirms problem resolution
 */
const studentConfirmation = async (req, res) => {
  try {
    const { problemId, isResolved } = req.body;
    console.log(
      `Student confirmation for problem ID: ${problemId}, isResolved: ${isResolved}`
    );

    // Find and update the problem
    const problem = await hostelProblem.findById(problemId);

    if (!problem) {
      console.log(`Problem not found with ID: ${problemId}`);
      return res.status(404).json({ message: "Problem not found" });
    }

    console.log(
      `Current problem status: ${problem.status}, studentStatus: ${problem.studentStatus}`
    );

    // Find the student by roll number
    const student = await User.findOne({ rollNo: problem.studentId });
    if (!student) {
      console.log(`Student not found with roll number: ${problem.studentId}`);
    } else {
      console.log(
        `Student found: ${student.name}, email: ${student.email || "No email"}`
      );
    }

    if (isResolved === true) {
      // Student confirms resolution
      problem.studentStatus = "Resolved";
      problem.status = "Resolved";
      problem.timeResolved = new Date(); // Set the resolution time now

      await problem.save();
      console.log(`Problem ID: ${problemId} marked as resolved by student`);

      // Find admins and the hostel's warden to notify them
      console.log(
        `Finding admin users and warden for hostel: ${problem.hostel}`
      );
      const adminUsers = await User.find({ role: "admin" });
      const hostelWarden = await User.findOne({
        role: "warden",
        hostel: problem.hostel,
      });

      const staffRecipients = [];

      // Add admin emails
      if (adminUsers && adminUsers.length > 0) {
        adminUsers.forEach((admin) => {
          if (admin.email) {
            staffRecipients.push(admin.email);
            console.log(`Adding admin recipient: ${admin.email}`);
          }
        });
      } else {
        console.log(`No admin users found`);
      }

      // Add warden email if found
      if (hostelWarden && hostelWarden.email) {
        staffRecipients.push(hostelWarden.email);
        console.log(`Adding warden recipient: ${hostelWarden.email}`);
      } else {
        console.log(`No warden found for hostel: ${problem.hostel}`);
      }

      if (staffRecipients.length > 0) {
        console.log(
          `Preparing to send staff notification to: ${staffRecipients.join(
            ", "
          )}`
        );

        try {
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
            debug: true,
          });

          // Email HTML content for staff notification
          const staffEmailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 5px;">
              <h2 style="color: #4f46e5;">Problem Resolution Confirmed</h2>
              <p>A student has confirmed that their problem has been successfully resolved:</p>
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <p><strong>Problem:</strong> ${problem.problemTitle}</p>
                <p><strong>Category:</strong> ${problem.category}</p>
                <p><strong>Hostel:</strong> ${problem.hostel}</p>
                <p><strong>Room:</strong> ${problem.roomNo}</p>
                <p><strong>Student:</strong> ${
                  student ? student.name : "Unknown"
                } (${problem.studentId})</p>
                <p><strong>Description:</strong> ${
                  problem.problemDescription
                }</p>
              </div>
              <p>This problem has been marked as <strong>Resolved</strong>.</p>
            </div>
          `;

          // Send notification to staff
          const staffMailOptions = {
            from: `"Hostelia Support" <${process.env.EMAIL_USER}>`,
            to: staffRecipients.join(", "),
            subject: "Problem Resolution Confirmed by Student",
            html: staffEmailHtml,
          };

          console.log(
            `Sending staff notification to: ${staffRecipients.join(", ")}`
          );
          const staffInfo = await transporter.sendMail(staffMailOptions);
          console.log(
            `Staff notification email sent, Message ID: ${staffInfo.messageId}`
          );
        } catch (emailError) {
          console.error("Error sending staff notification email:", emailError);
          // Continue even if email fails
        }
      } else {
        console.log(`No staff recipients found to notify`);
      }

      res.status(200).json({
        success: true,
        message: "Problem resolution confirmed by student",
      });
    } else {
      // Student rejects resolution
      problem.studentStatus = "Rejected";
      problem.status = "Pending"; // Reset to pending for admin/warden

      await problem.save();
      console.log(
        `Problem ID: ${problemId} marked as NOT resolved by student, returned to pending`
      );

      // Find admins and the hostel's warden
      console.log(
        `Finding admin users and warden for hostel: ${problem.hostel}`
      );
      const adminUsers = await User.find({ role: "admin" });
      const hostelWarden = await User.findOne({
        role: "warden",
        hostel: problem.hostel,
      });

      const staffRecipients = [];

      // Add admin emails
      if (adminUsers && adminUsers.length > 0) {
        adminUsers.forEach((admin) => {
          if (admin.email) {
            staffRecipients.push(admin.email);
            console.log(`Adding admin recipient: ${admin.email}`);
          }
        });
      } else {
        console.log(`No admin users found`);
      }

      // Add warden email if found
      if (hostelWarden && hostelWarden.email) {
        staffRecipients.push(hostelWarden.email);
        console.log(`Adding warden recipient: ${hostelWarden.email}`);
      } else {
        console.log(`No warden found for hostel: ${problem.hostel}`);
      }

      if (staffRecipients.length > 0) {
        console.log(
          `Preparing to send staff notification to: ${staffRecipients.join(
            ", "
          )}`
        );

        try {
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
            debug: true,
          });

          // Email HTML content for staff notification
          const staffEmailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 5px;">
              <h2 style="color: #d11515;">Problem Resolution Rejected</h2>
              <p>A student has marked a problem as not resolved:</p>
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <p><strong>Problem:</strong> ${problem.problemTitle}</p>
                <p><strong>Category:</strong> ${problem.category}</p>
                <p><strong>Hostel:</strong> ${problem.hostel}</p>
                <p><strong>Room:</strong> ${problem.roomNo}</p>
                <p><strong>Student:</strong> ${
                  student ? student.name : "Unknown"
                } (${problem.studentId})</p>
                <p><strong>Description:</strong> ${
                  problem.problemDescription
                }</p>
              </div>
              <p>This problem has been returned to <strong>Pending</strong> status and requires further attention.</p>
            </div>
          `;

          // Send notification to staff
          const staffMailOptions = {
            from: `"Hostelia Support" <${process.env.EMAIL_USER}>`,
            to: staffRecipients.join(", "),
            subject: "ALERT: Problem Resolution Rejected by Student",
            html: staffEmailHtml,
          };

          console.log(
            `Sending staff notification to: ${staffRecipients.join(", ")}`
          );
          const staffInfo = await transporter.sendMail(staffMailOptions);
          console.log(
            `Staff notification email sent, Message ID: ${staffInfo.messageId}`
          );
        } catch (emailError) {
          console.error("Error sending staff notification email:", emailError);
          // Continue even if email fails
        }
      } else {
        console.log(`No staff recipients found to notify`);
      }

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
};

module.exports = {
  getProblems,
  addProblem,
  updateProblemStatus,
  studentConfirmation,
};
