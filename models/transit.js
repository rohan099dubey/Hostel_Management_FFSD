
const mongoose = require('mongoose');

const transitSchema = new mongoose.Schema({
    studentRollNumber: {
        type: String,
        required: true
    },
    studentName: {
        type: String,
        required: true,
        default: "Unknown"
    },
    studentHostel: {
        type: String,
        required: true,
        default: "Unknown"
    },
    studentRoomNumber: {
        type: String,
        required: true,
        default: "Unknown"
    },
    purpose: {
        type: String,
        required: true
    },
    transitStatus: {
        type: String,
        enum: ['ENTRY', 'EXIT'],
        required: true
    },
    date: {
        type: Date,
        required: true,
        default: () => new Date().toISOString().split('T')[0]  // YYYY-MM-DD
    },
    time: {
        type: String,
        required: true,
        default: () => new Date().toTimeString().split(' ')[0]  // HH:MM:SS
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Transit', transitSchema);
