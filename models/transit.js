// const { DataTypes } = require('sequelize');
// const sequelize = require('../config/database');

// const Transit = sequelize.define('Transit', {
//     transitId: {
//         type: DataTypes.INTEGER,
//         primaryKey: true,
//         autoIncrement: true
//     },
//     studentRollNumber: {
//         type: DataTypes.TEXT,
//         allowNull: false
//     },
//     studentName: {
//         type: DataTypes.TEXT,
//         allowNull: false,
//         defaultValue: "Unknown"
//     },
//     studentHostel: {
//         type: DataTypes.TEXT,
//         allowNull: false,
//         defaultValue: "Unknown"
//     },
//     studentRoomNumber: {
//         type: DataTypes.TEXT,
//         allowNull: false,
//         defaultValue: "Unknown"
//     },
//     purpose: {
//         type: DataTypes.TEXT,
//         allowNull: false
//     },
//     transitStatus: {
//         type: DataTypes.ENUM('ENTRY', 'EXIT'),
//         allowNull: false
//     },
//     date: {
//         type: DataTypes.DATEONLY, // Stores only the date (YYYY-MM-DD)
//         allowNull: false,
//         defaultValue: DataTypes.NOW
//     },
//     time: {
//         type: DataTypes.TIME, // Stores only the time (HH:MM:SS)
//         allowNull: false,
//         defaultValue: DataTypes.NOW
//     }
// }, {
//     timestamps: true // Enables createdAt & updatedAt columns
// });

// module.exports = Transit;


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
