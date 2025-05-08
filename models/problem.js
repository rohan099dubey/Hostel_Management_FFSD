
const mongoose = require("mongoose");

const problemSchema = new mongoose.Schema(
  {
    problemTitle: {
      type: String,
      required: true,
    },
    problemDescription: {
      type: String,
      required: true,
    },
    problemImage: {
      type: String,
      required: true,
    },
    hostel: {
      type: String,
      required: true,
    },
    roomNo: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: [
        "Electrical",
        "Plumbing",
        "Painting",
        "Carpentry",
        "Cleaning",
        "Internet",
        "Furniture",
        "Pest Control",
        "Other",
      ],
      required: true,
    },
    studentId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Resolved", "Rejected", "ToBeConfirmed"],
      default: "Pending",
    },
    studentStatus: {
      type: String,
      enum: ["NotResolved", "Resolved", "Rejected"],
      default: "NotResolved",
    },
    timeResolved: {
      type: Date,
      default: null,
    },
    timeCreated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Problem", problemSchema);
