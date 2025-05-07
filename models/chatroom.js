// // models/chatroom.js
// const { DataTypes } = require('sequelize');
// const sequelize = require('../config/database');

// const ChatRoom = sequelize.define('ChatRoom', {
//   id: { 
//     type: DataTypes.INTEGER, 
//     autoIncrement: true, 
//     primaryKey: true 
//   },
//   roomName: { 
//     type: DataTypes.STRING, 
//     allowNull: false 
//   },
//   roomType: { 
//     type: DataTypes.STRING, 
//     allowNull: false 
//   },
//   description: { 
//     type: DataTypes.TEXT 
//   },
//   accessLevel: { 
//     type: DataTypes.STRING, 
//     allowNull: false 
//   },
//   roomIcon: { 
//     type: DataTypes.STRING, 
//     defaultValue: 'fas fa-comments'
//   },
//   createdBy: { 
//     type: DataTypes.STRING 
//   }
// }, {
//   timestamps: true
// });

// module.exports = ChatRoom;

const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
  roomName: {
    type: String,
    required: true
  },
  roomType: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  accessLevel: {
    type: String,
    required: true
  },
  roomIcon: {
    type: String,
    default: 'fas fa-comments'
  },
  createdBy: {
    type: String
  }
}, {
  timestamps: true
});

const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);

module.exports = ChatRoom;
