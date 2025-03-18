const express = require('express');
require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');
const Problem = require('./models/index.js')
const moment = require('moment');
moment().format();

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to database'))
    .catch((e) => console.log('error in connecting to database', e));

const app = express();
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, "public")));


// routes 
app.get('/', (req, res) => {
    res.render('homepage.ejs')
})

app.get('/about', (req, res) => {
    res.render('about.ejs')
})
app.get('/contact', (req, res) => {
    res.render('contact.ejs')
})
app.get('/services', async (req, res) => {
    const problems = await Problem.find({});
    res.render('services.ejs', { problems });
})

app.get('/login', (req, res) => {
    res.render('login.ejs')
})

app.get('/signup', (req, res) => {
    res.render('signup.ejs')
})

app.get('/problems', async (req, res) => {
    const problems = await Problem.find({});
    res.render('problems.ejs', { problems });
})

app.post('/services/problems', async (req, res) => {

})
app.get('/dashboard', (req, res) => {
    res.render('dashboard.ejs', {
      user: mockUser,
      data: dashboardData[mockUser.role.toLowerCase()],
    })
  })
  const mockUser = {
    name: "John Doe",
    role: "STUDENT", // Change this to "ADMIN" or "WARDEN" to see different dashboards
    email: "john@example.com"
};

// Mock dashboard data
const dashboardData = {
    admin: {
        totalStudents: 450,
        pendingIssues: 15,
        feeDefaulters: 25,
        recentActivities: [
            { type: 'issue', text: 'New complaint registered for Block A', time: '2 hours ago' },
            { type: 'fee', text: 'Fee payment received from Room 203', time: '3 hours ago' },
            { type: 'notice', text: 'Published new mess menu', time: '5 hours ago' }
        ],
        statistics: {
            issuesResolved: 85,
            feeCollection: 92,
            messRating: 4.2
        }
    },
    warden: {
        assignedIssues: 8,
        pendingApprovals: 5,
        todayAttendance: 95,
        recentActivities: [
            { type: 'complaint', text: 'Water issue in Block B resolved', time: '1 hour ago' },
            { type: 'entry', text: 'Late entry request from Room 105', time: '4 hours ago' }
        ]
    },
    student: {
        pendingFees: 12500,
        messCredits: 45,
        activeComplaints: 2,
        notices: [
            { title: 'Hostel Day Celebration', date: '2024-03-25' },
            { title: 'Maintenance Work', date: '2024-03-20' }
        ],
        recentActivities: [
            { type: 'complaint', text: 'Your complaint #123 has been resolved', time: '1 hour ago' },
            { type: 'mess', text: 'Mess menu updated for next week', time: '3 hours ago' }
        ]
    }
};

app.listen(3000, () => {
    console.log("Server is listening");
})