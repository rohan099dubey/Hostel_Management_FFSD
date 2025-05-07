const mongoose = require('mongoose');
const Problem = require('./models/problem');  // Path to your Problem model
const { dataProblems } = require('./config/data');  // Path to your data file
require('dotenv').config();  // To load your environment variables

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

seedProblemData();
