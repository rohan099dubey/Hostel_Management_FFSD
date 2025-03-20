const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Problem = sequelize.define('Problem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    phone: {
        type: DataTypes.STRING
    },
    rollnum: {
        type: DataTypes.STRING,
        allowNull: false
    },
    hostel: {
        type: DataTypes.STRING,
        allowNull: false
    },
    roomnum: {
        type: DataTypes.STRING,
        allowNull: false
    },
    category: {
        type: DataTypes.STRING
    },
    text: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    timeCreated: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    isCompleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    timestamps: true
});

module.exports = Problem;