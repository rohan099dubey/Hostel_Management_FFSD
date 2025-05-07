// const { DataTypes } = require('sequelize');
// const sequelize = require('../config/database');

// const hostelProblem = sequelize.define('Problem', {
//     problemId: {
//         type: DataTypes.INTEGER,
//         primaryKey: true,
//         autoIncrement: true
//     },
//     problemTitle: {
//         type: DataTypes.STRING,
//         allowNull: false
//     },
//     problemDescription: {
//         type: DataTypes.STRING,
//         allowNull: false
//     },
//     problemImage: {
//         type: DataTypes.STRING,
//         allowNull: false
//     },
//     hostel: {
//         type: DataTypes.STRING,
//         allowNull: false
//     },
//     roomNo: {
//         type: DataTypes.STRING,
//         allowNull: false
//     },
//     category: {
//         type: DataTypes.ENUM('Electrical', 'Plumbing', 'Painting', 'Carpentry', 'Cleaning', 'Internet', 'Furniture', 'Pest Control', 'Other'),
//         allowNull: false
//     },
//     studentId: {
//         type: DataTypes.STRING,
//         allowNull: false
//     },
//     timeCreated: {
//         type: DataTypes.DATE,
//         defaultValue: DataTypes.NOW
//     },
//     status: {
//         type: DataTypes.ENUM('Pending', 'Resolved', 'Rejected'),
//         allowNull: false
//     },
//     timeResolved: {
//         type: DataTypes.DATE,
//         allowNull: true,
//         defaultValue: null,
//     }
// }, {
//     timestamps: true
// });

// module.exports = hostelProblem;

const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema({
    problemTitle: {
        type: String,
        required: true
    },
    problemDescription: {
        type: String,
        required: true
    },
    problemImage: {
        type: String,
        required: true
    },
    hostel: {
        type: String,
        required: true
    },
    roomNo: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['Electrical', 'Plumbing', 'Painting', 'Carpentry', 'Cleaning', 'Internet', 'Furniture', 'Pest Control', 'Other'],
        required: true
    },
    studentId: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Resolved', 'Rejected'],
        default: 'Pending'
    },
    studentStatus: {
        type: Boolean,
        default: false
    },
    timeResolved: {
        type: Date,
        default: null
    },
    timeCreated: {
        type: Date,
        default: Date.now
    },
}, {
    timestamps: true
});

module.exports = mongoose.model('Problem', problemSchema);