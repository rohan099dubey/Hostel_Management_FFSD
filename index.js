const express = require('express');
const app = express();
require('dotenv').config();
const path = require('path');
// const mongoose = require('mongoose');
const Problem = require('./models/index.js')
const moment = require('moment');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Database configurations
const sequelize = require('./config/database');
const User = require('./models/user');


// Configure express app
app.set('view engine', 'ejs');
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

moment().format();

// mongoose.connect(process.env.MONGO_URI)
//     .then(() => console.log('Connected to database'))
//     .catch((e) => console.log('error in connecting to database', e));

sequelize.authenticate()
    .then(() => sequelize.sync()) // Sync models with database
    .then(() => console.log('Connected to SQLite in-memory database'))
    .catch(e => console.log('Error connecting to database:', e));

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
//routes for login and signup

const generateToken = (userID, res) => {

    const token = jwt.sign(
        { userID },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    )

    res.cookie("jwt", token, {
        maxAge: 7 * 24 * 60 * 60 * 1000, // in millisecond
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV !== "development"
    })

    return token;
}

//signup
app.get('/signup', (req, res) => {
    res.render('signup.ejs')
})

const signup = async (req, res) => {
    const { name, rollNo, email, hostel, roomNo, year, password } = req.body;
    try {
        if (!name || !rollNo || !email || !hostel || !roomNo || !year || !password) {
            return res.status(400).json({ message: "All fields are required." });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters in length" });
        }

        const user = await User.findOne({
            where: { email }
        });

        if (!!user) {
            return res.status(400).json({ message: "User already exists / Email already in use" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            name,
            rollNo,
            email,
            hostel,
            roomNo,
            year,
            password: hashedPassword
        });

        if (newUser) {
            generateToken(newUser.userId, res);
            await newUser.save();
            console.log("User created successfully")
            console.log(newUser)
            return res.status(201).json({
                userId: newUser.userId,
                name: newUser.name,
                rollNo: newUser.rollNo,
                email: newUser.email,
                hostel: newUser.hostel,
                roomNo: newUser.roomNo,
                year: newUser.year,
                role: newUser.role
            });

        } else {
            return res.status(400).json({ message: "Invalid user data." });
        }

    } catch (error) {
        console.error("ERROR in sign-up controller:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

app.post("/auth/signup", signup);

//login
app.get('/login', (req, res) => {
    res.render('login.ejs')
})

const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const user = await User.findOne({ where: { email } });

        if (!user) {
            console.log("invalid user");
            return res.status(400).json({ message: "Invalid Credentials" });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (!isPasswordCorrect) {
            console.log("incorrect password");
            return res.status(400).json({ message: "Invalid Credentials" });
        }

        generateToken(user.userId, res);

        console.log("user found");
        console.log(user);

        return res.status(200).json({
            userId: user.userId,
            name: user.name,
            rollNo: user.rollNo,
            email: user.email,
            hostel: user.hostel,
            roomNo: user.roomNo,
            year: user.year,
            role: user.role
        });

    } catch (error) {
        console.error("ERROR in log-in controller:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

app.post("/auth/login", login)

//logout
const logout = (req, res) => {
    try {
        res.cookie("jwt", "", { maxAge: 0 })
        res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        console.log("ERROR in log-out controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

app.post("/auth/logout", logout)



app.get('/services', async (req, res) => {
    const problems = await Problem.find({});
    res.render('services.ejs', { problems });
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

app.listen(process.env.PORT, () => {
    console.log(`Server is listening on port ${process.env.PORT}`);
})