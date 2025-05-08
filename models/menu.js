
const mongoose = require("mongoose");

// MenuItems Schema
const menuItemSchema = new mongoose.Schema({
  day: {
    type: String,
    required: true,
  },
  mealType: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  alternateWeek: {
    type: Boolean,
    default: false,
  },
  seasonal: {
    type: Boolean,
    default: false,
  },
});

// Feedback Schema
const feedbackSchema = new mongoose.Schema({
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
  },
  day: {
    type: String,
    required: true,
  },
  mealType: {
    type: String,
    required: true,
  },
});

const MenuItems = mongoose.model("MenuItem", menuItemSchema); // Keep model name same
const OldFeedback = mongoose.model("OldFeedback", feedbackSchema); // Renamed the model to avoid collection conflicts

module.exports = { MenuItems, OldFeedback };
