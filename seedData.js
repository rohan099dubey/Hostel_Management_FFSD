const mongoose = require('mongoose');
const Problem = require('./models/problem');  // Path to your Problem model
const { dataProblems } = require('./config/data');  // Path to your data file
require('dotenv').config();  // To load your environment variables
const bcrypt = require('bcrypt')

// Mapping function to change field names in the data before insertion
function mapFields(problemData) {
    return problemData.map((problem) => ({
        problemTitle: problem.problemTitle,
        problemDescription: problem.problemDescription,
        problemImage: problem.problemImage,
        studentId: problem.studentId,
        roomNo: problem.roomNumber,  // Renaming roomNumber to roomNo
        hostel: problem.hostel,
        category: problem.category,
        status: problem.status,
        studentStatus: problem.studentStatus,
        timeCreated: problem.timeCreated,
        timeResolved: problem.timeResolved || null,  // Handle empty strings for timeResolved
    }));
}

async function seedProblemData() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('MongoDB connected successfully');

        // Map and transform the field names
        const transformedData = mapFields(dataProblems);


        // Insert the transformed data
        await Problem.insertMany(transformedData);

        console.log(`${transformedData.length} problem records inserted.`);

        // Close the connection
        await mongoose.connection.close();
    } catch (error) {
        console.error('Error inserting problem data:', error);
        await mongoose.connection.close();
    }
}

const gmail = "rohandubey2023@gmail.com";
const User = require('./models/user'); // Add User model import
const { request } = require('express');

async function deleteUserByGmail() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('MongoDB connected successfully');

        // Delete user with the specified Gmail
        const result = await User.findOneAndDelete({ email: gmail });

        if (result) {
            console.log(`User with email ${gmail} deleted successfully`);
            // Also delete all problems associated with this user
            await Problem.deleteMany({ studentId: gmail });
            console.log(`All problems associated with ${gmail} deleted`);
        } else {
            console.log(`No user found with email ${gmail}`);
        }

        // Close the connection
        await mongoose.connection.close();
    } catch (error) {
        console.error('Error deleting user:', error);
        await mongoose.connection.close();
    }
}
const salt = bcrypt.genSaltSync(10);
const hashedPassword = bcrypt.hashSync('admin123', salt);

async function addAdminUser() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('MongoDB connected successfully');

        // Create admin user object
        const adminUser = new User({
            role: 'admin',
            name: 'Admin 2',
            email: gmail,
            password: hashedPassword, // Add a proper hashed password
        });

        // Save the admin user
        const result = await adminUser.save();

        if (result) {
            console.log(`Admin user created with email ${gmail}`);
        } else {
            console.log('Failed to create admin user');
        }

        // Close the connection
        await mongoose.connection.close();
    } catch (error) {
        console.error('Error creating admin user:', error);
        await mongoose.connection.close();
    }
}

addAdminUser();

