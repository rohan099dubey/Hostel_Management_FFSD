
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    message: {
        type: String,
        default: ''
    },
    imageData: {
        type: String,
        default: null
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

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
        type: String,
        default: ''
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
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    messages: [messageSchema],
    deleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, {
    timestamps: true
});

// Add index for better query performance
chatRoomSchema.index({ deleted: 1 });

const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);

module.exports = ChatRoom;
