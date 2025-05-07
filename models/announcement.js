// const { DataTypes } = require('sequelize');
// const sequelize = require('../config/database');

// const Announcement = sequelize.define('Announcement', {
//     id: {
//         type: DataTypes.INTEGER,
//         primaryKey: true,
//         autoIncrement: true
//     },
//     title: {
//         type: DataTypes.STRING,
//         allowNull: false
//     },
//     message: {
//         type: DataTypes.TEXT,
//         allowNull: false
//     }
// });

// module.exports = Announcement;

const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

const Announcement = mongoose.model('Announcement', announcementSchema);

module.exports = Announcement;
