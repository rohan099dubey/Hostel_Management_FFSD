const mongoose = require("mongoose");

// Define the schema for feedback
const feedbackSchema = new mongoose.Schema(
  {
    rating: {
      type: String,
      required: [true, "Rating is required"],
      enum: ["1", "2", "3", "4", "5"],
    },
    comment: {
      type: String,
      default: "No comment provided",
    },
    day: {
      type: String,
      required: [true, "Day is required"],
      enum: [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
    },
    mealType: {
      type: String,
      required: [true, "Meal type is required"],
      enum: ["Breakfast", "Lunch", "Snacks", "Dinner"],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      // Not required since anonymous feedback is allowed
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Create the model from the schema
const Feedback = mongoose.model("Feedback", feedbackSchema);

module.exports = Feedback;
