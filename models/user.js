const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    role: {
        type: DataTypes.ENUM('student', 'admin', 'warden'),
        allowNull: false,
        defaultValue: 'student'
    },
    userId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    rollNo: {
        type: DataTypes.STRING,
        allowNull: function () {
            return this.role !== 'student';
        },
        unique: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    year: {
        type: DataTypes.ENUM('UG-1', 'UG-2', 'UG-3', 'UG-4'),
        allowNull: function () {
            return this.role !== 'student';
        },
    },
    hostel: {
        type: DataTypes.ENUM('BH-1', 'BH-2', 'BH-3', 'BH-4'),
        allowNull: false
    },
    roomNo: {
        type: DataTypes.STRING,
        allowNull: function () {
            return this.role !== 'student';
        },
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    timestamps: true
});

module.exports = User;