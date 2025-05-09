const User = require("../models/user.js");
const nodemailer = require("nodemailer");

// Send single fee reminder
exports.sendFeeReminder = async (req, res) => {
  try {
    const { role, userid } = req.cookies;
    if (role !== "admin" && role !== "warden") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    const { studentId, emailType, notes } = req.body;
    const student = await User.findById(studentId);
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }
    const sender = await User.findById(userid);
    let emailSubject, emailContent;
    if (emailType === "hostelFee" || emailType === "both") {
      emailSubject = "Reminder: Hostel Fee Payment Due";
      emailContent = `<p>Dear ${
        student.name
      },</p><p>This is a friendly reminder that your hostel fee payment is due. Please make the payment as soon as possible to avoid any inconvenience.</p>${
        notes ? `<p><strong>Additional Notes:</strong> ${notes}</p>` : ""
      }<p>If you have already made the payment, please ignore this email.</p><p>Best regards,<br>${
        sender.name
      }<br>${sender.role.charAt(0).toUpperCase() + sender.role.slice(1)}</p>`;
    }
    if (emailType === "messFee" || emailType === "both") {
      if (emailSubject) {
        emailSubject = "Reminder: Hostel and Mess Fee Payments Due";
        emailContent = `<p>Dear ${
          student.name
        },</p><p>This is a friendly reminder that your hostel and mess fee payments are due. Please make the payments as soon as possible to avoid any inconvenience.</p>${
          notes ? `<p><strong>Additional Notes:</strong> ${notes}</p>` : ""
        }<p>If you have already made the payments, please ignore this email.</p><p>Best regards,<br>${
          sender.name
        }<br>${sender.role.charAt(0).toUpperCase() + sender.role.slice(1)}</p>`;
      } else {
        emailSubject = "Reminder: Mess Fee Payment Due";
        emailContent = `<p>Dear ${
          student.name
        },</p><p>This is a friendly reminder that your mess fee payment is due. Please make the payment as soon as possible to avoid any inconvenience.</p>${
          notes ? `<p><strong>Additional Notes:</strong> ${notes}</p>` : ""
        }<p>If you have already made the payment, please ignore this email.</p><p>Best regards,<br>${
          sender.name
        }<br>${sender.role.charAt(0).toUpperCase() + sender.role.slice(1)}</p>`;
      }
    }
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: process.env.EMAIL_SECURE === "true",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      tls: { rejectUnauthorized: false },
      debug: true,
    });
    const mailOptions = {
      from: `"Hostelia - ${sender.name}" <${process.env.EMAIL_USER}>`,
      to: student.email,
      subject: emailSubject,
      html: emailContent,
    };
    const info = await transporter.sendMail(mailOptions);
    res
      .status(200)
      .json({
        success: true,
        message: `Fee reminder sent to ${student.name}`,
        emailId: info.messageId,
      });
  } catch (error) {
    console.error("Error sending email:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Error sending email: " + error.message,
      });
  }
};

// Send bulk fee reminders
exports.sendBulkFeeReminders = async (req, res) => {
  try {
    const { role, userid } = req.cookies;
    if (role !== "admin" && role !== "warden") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    const { studentIds, emailType, notes } = req.body;
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No students specified" });
    }
    const sender = await User.findById(userid);
    const students = await User.find({ _id: { $in: studentIds } });
    if (students.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No students found" });
    }
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: process.env.EMAIL_SECURE === "true",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      tls: { rejectUnauthorized: false },
      debug: true,
    });
    const results = { success: [], failed: [] };
    for (const student of students) {
      try {
        let emailSubject, emailContent;
        if (emailType === "hostelFee" || emailType === "both") {
          emailSubject = "Reminder: Hostel Fee Payment Due";
          emailContent = `<p>Dear ${
            student.name
          },</p><p>This is a friendly reminder that your hostel fee payment is due. Please make the payment as soon as possible to avoid any inconvenience.</p>${
            notes ? `<p><strong>Additional Notes:</strong> ${notes}</p>` : ""
          }<p>If you have already made the payment, please ignore this email.</p><p>Best regards,<br>${
            sender.name
          }<br>${
            sender.role.charAt(0).toUpperCase() + sender.role.slice(1)
          }</p>`;
        }
        if (emailType === "messFee" || emailType === "both") {
          if (emailSubject) {
            emailSubject = "Reminder: Hostel and Mess Fee Payments Due";
            emailContent = `<p>Dear ${
              student.name
            },</p><p>This is a friendly reminder that your hostel and mess fee payments are due. Please make the payments as soon as possible to avoid any inconvenience.</p>${
              notes ? `<p><strong>Additional Notes:</strong> ${notes}</p>` : ""
            }<p>If you have already made the payments, please ignore this email.</p><p>Best regards,<br>${
              sender.name
            }<br>${
              sender.role.charAt(0).toUpperCase() + sender.role.slice(1)
            }</p>`;
          } else {
            emailSubject = "Reminder: Mess Fee Payment Due";
            emailContent = `<p>Dear ${
              student.name
            },</p><p>This is a friendly reminder that your mess fee payment is due. Please make the payment as soon as possible to avoid any inconvenience.</p>${
              notes ? `<p><strong>Additional Notes:</strong> ${notes}</p>` : ""
            }<p>If you have already made the payment, please ignore this email.</p><p>Best regards,<br>${
              sender.name
            }<br>${
              sender.role.charAt(0).toUpperCase() + sender.role.slice(1)
            }</p>`;
          }
        }
        const mailOptions = {
          from: `"Hostelia - ${sender.name}" <${process.env.EMAIL_USER}>`,
          to: student.email,
          subject: emailSubject,
          html: emailContent,
        };
        const info = await transporter.sendMail(mailOptions);
        results.success.push({
          id: student._id,
          name: student.name,
          email: student.email,
          messageId: info.messageId,
        });
      } catch (error) {
        results.failed.push({
          id: student._id,
          name: student.name,
          email: student.email,
          error: error.message,
        });
      }
    }
    res
      .status(200)
      .json({
        success: true,
        message: `Sent ${results.success.length} emails, failed to send ${results.failed.length} emails`,
        results,
      });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error sending bulk fee reminders",
        error: error.message,
      });
  }
};
