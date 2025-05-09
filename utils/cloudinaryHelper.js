const fs = require('fs').promises;
const { cloudinary } = require('../config/cloudinary');

/**
 * Upload a local file to Cloudinary
 * @param {string} filePath - Path to the file on local server
 * @param {string} folder - Cloudinary folder to upload to
 * @param {Object} options - Additional Cloudinary options
 * @returns {Promise<Object>} - Cloudinary upload result
 */
async function uploadLocalFile(filePath, folder = 'general', options = {}) {
    try {
        const uploadOptions = {
            folder,
            ...options
        };

        const result = await cloudinary.uploader.upload(filePath, uploadOptions);

        // Clean up the temporary file
        try {
            await fs.unlink(filePath);
            console.log(`Temporary file deleted: ${filePath}`);
        } catch (unlinkError) {
            console.error(`Error deleting temporary file ${filePath}:`, unlinkError);
            // Continue execution even if file deletion fails
        }

        return result;
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        throw error;
    }
}

/**
 * Upload a base64 image to Cloudinary
 * @param {string} base64Data - Base64 encoded image data
 * @param {string} folder - Cloudinary folder to upload to
 * @param {Object} options - Additional Cloudinary options
 * @returns {Promise<Object>} - Cloudinary upload result
 */
async function uploadBase64Image(base64Data, folder = 'general', options = {}) {
    try {
        if (!base64Data || !base64Data.startsWith('data:image')) {
            throw new Error('Invalid base64 image data');
        }

        const uploadOptions = {
            folder,
            resource_type: 'image',
            ...options
        };

        const result = await cloudinary.uploader.upload(base64Data, uploadOptions);
        return result;
    } catch (error) {
        console.error('Error uploading base64 to Cloudinary:', error);
        throw error;
    }
}

/**
 * Delete an image from Cloudinary
 * @param {string} publicId - Cloudinary public ID of the image
 * @returns {Promise<Object>} - Cloudinary deletion result
 */
async function deleteImage(publicId) {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        console.error('Error deleting from Cloudinary:', error);
        throw error;
    }
}

module.exports = {
    uploadLocalFile,
    uploadBase64Image,
    deleteImage
}; 