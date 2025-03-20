const { Sequelize } = require('sequelize');

// In-memory database configuration
const sequelize = new Sequelize('sqlite::memory:', {
    logging: false, // Disable SQL logging
    define: {
        timestamps: true, // Add createdAt and updatedAt
        paranoid: true, // Enable soft deletes (adds deletedAt)
    }
});
// Test the connection
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connection established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};

testConnection();

module.exports = sequelize;