const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const hostelProblem = sequelize.define('Problem', {
    problemId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    problemTitle: {
        type: DataTypes.STRING,
        allowNull: false
    },
    problemDescription: {
        type: DataTypes.STRING,
        allowNull: false
    },
    problemImage: {
        type: DataTypes.STRING,
        allowNull: false
    },
    hostel: {
        type: DataTypes.STRING,
        allowNull: false
    },
    roomNo: {
        type: DataTypes.STRING,
        allowNull: false
    },
    category: {
        type: DataTypes.ENUM('Electrical', 'Plumbing', 'Painting', 'Carpentry', 'Cleaning', 'Internet', 'Furniture', 'Pest Control', 'Other'),
        allowNull: false
    },
    studentId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    timeCreated: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    status: {
        type: DataTypes.ENUM('Pending', 'Resolved', 'Rejected'),
        allowNull: false
    },
    timeResolved: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
    }
}, {
    timestamps: true
});

module.exports = hostelProblem;