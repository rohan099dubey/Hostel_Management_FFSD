// models/chatroom.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ChatRoom = sequelize.define('ChatRoom', {
  id: { 
    type: DataTypes.INTEGER, 
    autoIncrement: true, 
    primaryKey: true 
  },
  roomName: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  roomType: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  description: { 
    type: DataTypes.TEXT 
  },
  accessLevel: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  roomIcon: { 
    type: DataTypes.STRING, 
    defaultValue: 'fas fa-comments'
  },
  createdBy: { 
    type: DataTypes.STRING 
  }
}, {
  timestamps: true
});

module.exports = ChatRoom;
