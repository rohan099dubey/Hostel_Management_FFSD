const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Transit = sequelize.define('Transit', {
    transitId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    studentRollNumber: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    studentName: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "Unknown"
    },
    studentHostel: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "Unknown"
    },
    studentRoomNumber: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "Unknown"
    },
    purpose: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    transitStatus: {
        type: DataTypes.ENUM('ENTRY', 'EXIT'),
        allowNull: false
    },
    date: {
        type: DataTypes.DATEONLY, // Stores only the date (YYYY-MM-DD)
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    time: {
        type: DataTypes.TIME, // Stores only the time (HH:MM:SS)
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: true // Enables createdAt & updatedAt columns
});

module.exports = Transit;
