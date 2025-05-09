# Cloudinary Integration for Hostel Management System

This project uses Cloudinary for image storage. Follow these steps to set up Cloudinary integration:

## 1. Create a Cloudinary Account

- Go to [Cloudinary](https://cloudinary.com/) and sign up for a free account
- After signing up, you'll have access to your dashboard with your account details

## 2. Set Up Environment Variables

Create or edit your `.env` file in the root directory of the project and add the following variables:

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Replace the values with your actual Cloudinary credentials found in your Cloudinary dashboard.

## 3. How It Works

The application uploads images to Cloudinary in the following scenarios:

1. **Problem Reports**: When students report issues, the attached images are temporarily stored locally and then uploaded to Cloudinary.
2. **Chat Messages**: When users send images in chat rooms, they are uploaded directly to Cloudinary as base64 data.

## 4. Dependencies

This implementation uses:

- `cloudinary` (v2.x) for uploading images to Cloudinary
- `multer` for handling file uploads in Express

No need for `multer-storage-cloudinary` as we're handling the upload process manually to avoid dependency conflicts.

## 5. Troubleshooting

If you encounter issues with image uploads:

1. Check your Cloudinary credentials in the `.env` file
2. Ensure the temporary upload directory exists (`public/uploads/temp`)
3. Check the console logs for any specific error messages
4. Verify your Cloudinary account has sufficient storage and credits

For any persistent issues, please refer to the [Cloudinary documentation](https://cloudinary.com/documentation).
