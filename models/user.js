// const { DataTypes } = require('sequelize');
// const sequelize = require('../config/database');

// const User = sequelize.define('User', {
//     role: {
//         type: DataTypes.ENUM('student', 'admin', 'warden'),
//         allowNull: false,
//         defaultValue: 'student'
//     },
//     userId: {
//         type: DataTypes.INTEGER,
//         primaryKey: true,
//         autoIncrement: true
//     },
//     name: {
//         type: DataTypes.STRING,
//         allowNull: false
//     },
//     rollNo: {
//         type: DataTypes.STRING,
//         allowNull: function () {
//             return this.role !== 'student';
//         },
//         unique: true
//     },
//     email: {
//         type: DataTypes.STRING,
//         allowNull: false,
//         unique: true,
//         validate: {
//             isEmail: true
//         }
//     },
//     year: {
//         type: DataTypes.ENUM('UG-1', 'UG-2', 'UG-3', 'UG-4'),
//         allowNull: function () {
//             return this.role !== 'student';
//         },
//     },
//     hostel: {
//         type: DataTypes.ENUM('BH-1', 'BH-2', 'BH-3', 'BH-4'),
//         allowNull: false
//     },
//     roomNo: {
//         type: DataTypes.STRING,
//         allowNull: function () {
//             return this.role !== 'student';
//         },
//     },
//     password: {
//         type: DataTypes.STRING,
//         allowNull: false
//     }
// }, {
//     timestamps: true
// });

// module.exports = User;

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['student', 'admin', 'warden'],
        default: 'student',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    rollNo: {
        type: String,
        unique: true,
        sparse: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    year: {
        type: String,
        enum: ['UG-1', 'UG-2', 'UG-3', 'UG-4']
    },
    hostel: {
        type: String,
        enum: ['BH-1', 'BH-2', 'BH-3', 'BH-4']
    },
    roomNo: String,
    password: {
        type: String,
        required: true
    },
    feeStatus: {
        hostelFees: {
            type: Boolean,
            default: false
        },
        messFees: {
            type: Boolean,
            default: false
        }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);