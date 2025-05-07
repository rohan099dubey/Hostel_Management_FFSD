// const { Sequelize } = require('sequelize');

// // In-memory database configuration
// const sequelize = new Sequelize('sqlite::memory:', {
//     logging: false, // Disable SQL logging
//     define: {
//         timestamps: true, // Add createdAt and updatedAt
//         paranoid: true, // Enable soft deletes (adds deletedAt)
//     }
// });
// // Test the connection
// const testConnection = async () => {
//     try {
//         await sequelize.authenticate();
//         console.log('Database connection established successfully.');
//     } catch (error) {
//         console.error('Unable to connect to the database:', error);
//     }
// };

// testConnection();

// module.exports = sequelize;


const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

module.exports = connectDB;