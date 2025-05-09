const Announcement = require("../models/announcement.js");

exports.getAnnouncements = async (req, res) => {
  try {
    const isLoggedIn = Boolean(req.cookies.jwt);
    let announcements = await Announcement.find().sort({ createdAt: -1 });
    const { role } = req.cookies;
    res.render("announcements", { announcements, role, loggedIn: isLoggedIn });
  } catch (error) {
    console.error("Error fetching announcements:", error);
    res.status(500).send("Error fetching announcements");
  }
};

exports.createAnnouncement = async (req, res) => {
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
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    await Announcement.findByIdAndDelete(id);
    res.status(200).send("Deleted Successfully");
  } catch (error) {
    console.error("Error deleting announcement:", error);
    res.status(500).send("Failed to delete");
  }
};
