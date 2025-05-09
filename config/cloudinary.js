const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Set up storage engine for problems
const problemStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "hostel_problems",
        allowed_formats: ["jpg", "jpeg", "png"],
        transformation: [{ width: 1000, height: 800, crop: "limit" }]
    }
});

// Set up storage engine for chat images
const chatStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "hostel_chat",
        allowed_formats: ["jpg", "jpeg", "png"],
        transformation: [{ width: 800, height: 600, crop: "limit" }]
    }
});

// Create multer instances
const problemUpload = multer({
    storage: problemStorage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const chatUpload = multer({
    storage: chatStorage,
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});

module.exports = {
    cloudinary,
    problemUpload,
    chatUpload
}; 