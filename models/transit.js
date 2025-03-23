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
    purpose: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    transitStatus: {
        type: DataTypes.ENUM('ENTRY', 'EXIT'),
        allowNull: false
    },
    timeCreated: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
}, {
    timestamps: true
});

module.exports = Transit;