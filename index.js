//modules imported
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
require('dotenv').config();
const path = require('path');
const moment = require('moment');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const multer = require("multer");


//Databse connection
const { dataProblems, dataEntryExit, userData } = require('./config/data.js');
const connectDB = require('./config/database.js');
connectDB(); // Connect to MongoDB

// Import models
const User = require('./models/user.js');
const hostelProblem = require('./models/problem.js');
const Announcement = require('./models/announcement.js');
const { MenuItems, Feedback } = require('./models/menu.js');
const ChatRoom = require('./models/chatroom');
const Transit = require('./models/transit');


// Multer configuration remains the same
const storage = multer.diskStorage({
    destination: "./public/uploads/",
    filename: (req, file, cb) => {
        cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const fileTypes = /jpeg|jpg|png/;
        const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());
        const mimeType = fileTypes.test(file.mimetype);

        if (mimeType && extName) {
            return cb(null, true);
        } else {
            cb(new Error("Images only!"));
        }
    }
});

// Express configuration remains the same
app.set('view engine', 'ejs');
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

moment().format();

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
};

// Auth middleware remains the same
const authMiddleware = (req, res, next) => {
    const publicRoutes = ['/auth/login', '/auth/logout', '/signup', '/about', '/contact', '/', '/login'];
    if (!req.cookies.jwt && !publicRoutes.includes(req.path)) {
        return res.redirect('/login');
    }
    next();
}

// Public routes (no auth required)
app.get('/', (req, res) => {
    const isLoggedIn = Boolean(req.cookies.jwt);
    res.render('homepage.ejs', { loggedIn: isLoggedIn });
});

app.get('/about', (req, res) => {
    const isLoggedIn = Boolean(req.cookies.jwt);
    res.render('about.ejs', { loggedIn: isLoggedIn });
});

app.get('/contact', (req, res) => {
    const isLoggedIn = Boolean(req.cookies.jwt);
    res.render('contact.ejs', { loggedIn: isLoggedIn });
});

app.get('/login', (req, res) => {
    res.render('login.ejs');
});

app.get('/signup', (req, res) => {
    res.render('signup.ejs');
});

//routes for login and signup
//signup
const signup = async (req, res) => {
    try {
        console.log("Received signup request with data:", req.body);

        const { name, rollNo, email, hostel, roomNo, year, password } = req.body;

        // Validate required fields
        if (!name || !rollNo || !email || !hostel || !roomNo || !year || !password) {
            return res.status(400).json({ message: "All fields are required." });
        }

        // Check for existing user
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({ message: "User already exists with this email" });
        }

        // Create new user
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            name,
            rollNo,
            email,
            hostel,
            roomNo,
            year,
            password: hashedPassword,
            role: 'student'
        });

        generateToken(newUser._id, res);
        res.cookie("userid", newUser._id);
        res.cookie("role", newUser.role);

        return res.status(201).json({
            success: true,
            user: {
                userId: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        });

    } catch (error) {
        console.error("Signup error:", error);
        return res.status(500).json({
            success: false,
            message: "Error creating user",
            error: error.message
        });
    }
};
app.post("/auth/signup", signup);

//login
const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const user = await User.findOne({ email });

        if (!user) {
            console.log("invalid user");
            return res.status(400).json({ message: "Invalid Credentials" });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            console.log("incorrect password");
            return res.status(400).json({ message: "Invalid Credentials" });
        }


        generateToken(user._id, res);
        res.cookie("role", user.role)
        res.cookie("userid", user._id)

        console.log("user found");
        console.log(user);

        return res.status(200).json({
            userId: user._id,
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
        res.cookie("role", "", { maxAge: 0 })
        res.cookie("userid", "", { maxAge: 0 })
        res.clearCookie("jwt")
        res.clearCookie("role")
        res.clearCookie("userid")
        res.redirect('/');
    } catch (error) {
        console.log("ERROR in log-out controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
app.post("/auth/logout", logout)


app.get("/services/announcements", authMiddleware, async (req, res) => {
    try {
        const isLoggedIn = Boolean(req.cookies.jwt);
        let announcements = await Announcement.find().sort({ createdAt: -1 });
        const { role } = req.cookies;

        res.render("announcements", { announcements, role, loggedIn: isLoggedIn });
    } catch (error) {
        console.error("Error fetching announcements:", error);
        res.status(500).send("Error fetching announcements");
    }
});


app.post("/services/announcement", async (req, res) => {
    const { title, message } = req.body;

    if (!title || !message) {
        return res.status(400).send("No title or message provided");
    }

    try {

        const newAnnouncement = await Announcement.create({
            title,
            message,
            date: new Date()
        });

        console.log("Announcement Created:", newAnnouncement);


        res.redirect("/services/announcements");

    } catch (error) {
        console.error("Error creating announcement:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.delete("/announcements/delete/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await Announcement.findByIdAndDelete(id);
        res.status(200).send("Deleted Successfully");
    } catch (error) {
        console.error("Error deleting announcement:", error);
        res.status(500).send("Failed to delete");
    }
});


app.get('/services/problems', authMiddleware, async (req, res) => {
    const isLoggedIn = Boolean(req.cookies.jwt);
    const role = req.cookies.role;
    const userID = req.cookies.userid;

    try {
        // First try to find the user in MongoDB
        let user = await User.findById(userID).select('-password');


        // If still no user found, return error
        if (!user) {
            return res.status(404).send("User not found");
        }

        let userProblems1 = [];

        if (role !== 'admin') {
            // Changed findAll to find for MongoDB and sort by createdAt descending
            userProblems1 = await hostelProblem.find({ hostel: user.hostel }).sort({ createdAt: -1 });

            if (userProblems1.length > 0) {
                userProblems1 = userProblems1.map(problem => ({
                    ...problem.toObject(), // Changed toJSON to toObject for MongoDB
                    roomNumber: problem.roomNo,
                    createdAt: problem.createdAt || new Date()
                }));
            }

        } else {
            // For admin, get all problems
            userProblems1 = await hostelProblem.find().sort({ createdAt: -1 });
        }

        const problems = userProblems1;

        res.render('problems.ejs', {
            problems,
            role,
            userID,
            loggedIn: isLoggedIn,
            user
        });
    } catch (error) {
        console.error("Error fetching problems:", error);
        res.status(500).send("Error fetching problems");
    }
});

app.post("/services/problems/add", upload.single("problemImage"), async (req, res) => {
    try {
        const { problemTitle, problemDescription, roomNo, category, studentId, hostel } = req.body;
        if (!req.file) {
            return res.status(400).json({ message: "Image upload is required" });
        }

        const problemImage = `/uploads/${req.file.filename}`; // Store image path relative to public folder

        console.log("Received data:", req.body);
        console.log("Uploaded file:", req.file);

        if (!problemTitle || !problemDescription || !problemImage || !studentId || !hostel || !roomNo || !category) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const newProblem = {
            problemTitle,
            problemDescription,
            problemImage,
            studentId,
            hostel,
            roomNo,
            category,
            status: "Pending"
        };

        await hostelProblem.create(newProblem);
        console.log("Problem created:", newProblem);
        res.status(201).json(newProblem);
    } catch (error) {
        console.error("ERROR in creating problem:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
})

app.post('/services/problems/statusChange', async (req, res) => {
    const { problemId, status } = req.body;
    try {
        const problem = await hostelProblem.findById(problemId);
        if (!problem) {
            return res.status(404).json({ message: "Problem not found" });
        }

        problem.status = status;
        problem.timeResolved = new Date();
        await problem.save();
        res.status(200).json({ message: "Status updated successfully" });
    } catch (error) {
        console.error("ERROR in status change:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

app.post('/services/problems/student-confirmation', async (req, res) => {
    try {
        const { problemId, studentStatus } = req.body;
        console.log('Received student confirmation request:', { problemId, studentStatus });

        if (!problemId || studentStatus === undefined) {
            return res.status(400).json({
                success: false,
                message: "Problem ID and status are required"
            });
        }

        // Find and update the problem
        const problem = await hostelProblem.findById(problemId);

        if (!problem) {
            return res.status(404).json({
                success: false,
                message: "Problem not found"
            });
        }

        if (problem.status !== 'Resolved') {
            return res.status(400).json({
                success: false,
                message: "Can only confirm resolved problems"
            });
        }

        if (studentStatus === 'Resolved') {
            console.log('Setting studentStatus to true');
            problem.studentStatus = true;
        } else if (studentStatus === 'Not Resolved') {
            console.log('Setting status to Pending and studentStatus to false');
            problem.status = 'Pending';
            problem.timeResolved = null;
            problem.studentStatus = false;
        } else {
            return res.status(400).json({
                success: false,
                message: "Invalid status value"
            });
        }

        console.log('Saving problem with updated status:', problem);
        await problem.save();

        console.log('Problem successfully updated');
        res.status(200).json({
            success: true,
            message: "Problem resolution confirmation updated successfully"
        });

    } catch (error) {
        console.error("Error in student confirmation:", error);
        res.status(500).json({
            success: false,
            message: "Error confirming problem resolution"
        });
    }
});

app.get("/services/register", authMiddleware, async (req, res) => {
    try {
        const isLoggedIn = Boolean(req.cookies.jwt);
        const transitEntries = await Transit.find().sort({ createdAt: -1 });

        const formattedEntries = transitEntries.map(entry => ({
            studentName: entry.studentName,
            studentHostel: entry.studentHostel,
            studentRoomNumber: entry.studentRoomNumber,
            studentRollNumber: entry.studentRollNumber,
            purpose: entry.purpose,
            transitStatus: entry.transitStatus,
            date: entry.createdAt.toISOString().split("T")[0], // Extract YYYY-MM-DD
            time: entry.createdAt.toISOString().split("T")[1].split(".")[0] // Extract HH:MM:SS
        }));
        const mergedData = formattedEntries;

        res.render("register.ejs", { entryExit: mergedData, loggedIn: isLoggedIn });

    } catch (error) {
        console.error("Error fetching transit data:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.post('/services/transit', async (req, res) => {
    try {
        const { studentRollNumber, purpose, transitStatus, studentName, studentHostel, studentRoomNumber } = req.body;

        if (!studentRollNumber || !purpose || !transitStatus) {
            return res.status(400).send("All fields are required.");
        }

        await Transit.create({
            studentRollNumber,
            purpose,
            transitStatus,
            studentName,
            studentHostel,
            studentRoomNumber
        });

        res.redirect('/services/register'); // Redirect back to the transit page
    } catch (error) {
        console.error("Error adding transit entry:", error);
        res.status(500).send("Internal Server Error");
    }
});


app.get('/dashboard', authMiddleware, async (req, res) => {
    try {
        const isLoggedIn = Boolean(req.cookies.jwt);
        const role = req.cookies.role;
        const userId = req.cookies.userid;

        const userInfo = await User.findById(userId).select('-password');

        if (!userInfo) {
            return res.status(404).send("User not found");
        }

        if (role === "student") {
            const userProblems = await hostelProblem.find({
                hostel: userInfo.hostel,
                studentId: userInfo.rollNo
            }).lean();

            const problems = userProblems.map(problem => ({
                ...problem,
                roomNumber: problem.roomNo
            }));

            res.render('partials/dashboard/student.ejs', {
                userInfo,
                problems,
                loggedIn: isLoggedIn
            });

        } else if (role === "warden") {
            const userProblems = await hostelProblem.find({
                hostel: userInfo.hostel
            }).lean();

            const problems = userProblems.map(problem => ({
                ...problem,
                roomNumber: problem.roomNo
            }));

            res.render('partials/dashboard/warden.ejs', {
                userInfo,
                problems,
                loggedIn: isLoggedIn
            });

        } else if (role === "admin") {
            const allUsers = await User.find().select('-password').lean();

            const userProblems = await hostelProblem.find().lean();

            const problems = userProblems.map(problem => ({
                ...problem,
                roomNumber: problem.roomNo
            }));

            res.render('partials/dashboard/admin.ejs', {
                userInfo,
                problems,
                allUsers,
                loggedIn: isLoggedIn
            });
        }
    } catch (error) {
        console.error("Error in dashboard route:", error);
        res.status(500).send("Internal Server Error");
    }
})

app.post('/services/users/add-warden', async (req, res) => {
    try {
        const { name, email, hostel, password } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        const newWarden = await User.create({
            name,
            email,
            hostel,
            password: hashedPassword, // In production, make sure to hash the password
            role: 'warden'
        });

        res.status(201).json({ message: 'Warden added successfully', warden: newWarden });
    } catch (error) {
        console.error('Error adding warden:', error);
        res.status(500).json({ message: 'Error adding warden', error: error.message });
    }
});

// Delete Warden
app.delete('/services/users/delete-warden/:id', async (req, res) => {
    try {
        const wardenId = req.params.id;
        const deletedWarden = await User.findOneAndDelete({
            _id: wardenId,
            role: 'warden'
        });

        if (!deletedWarden) {
            return res.status(404).json({ message: 'Warden not found' });
        }

        res.json({ message: 'Warden deleted successfully', deletedWarden });
    } catch (error) {
        console.error('Error deleting warden:', error);
        res.status(500).json({ message: 'Error deleting warden', error: error.message });
    }
});


const loadMenuData = require('./loadmenuData.js'); // Adjust the path
connectDB().then(async () => {
    try {
        await loadMenuData();
        console.log('Initial menu data loaded');
    } catch (error) {
        console.error('Error loading initial menu data:', error);
    }
});

app.get('/services/mess', async (req, res) => {
    try {
        const isLoggedIn = Boolean(req.cookies.jwt);
        const menuItems = await MenuItems.find();
        
        // Read feedback data from JSON file
        let feedbacks = [];
        try {
            const feedbackData = await fs.readFile(feedbackFilePath, 'utf-8');
            feedbacks = JSON.parse(feedbackData);
        } catch (error) {
            console.error('Error reading feedback data:', error);
            feedbacks = [];
        }

        // Calculate average ratings for each meal type
        const mealRatings = {};
        feedbacks.forEach(feedback => {
            const key = `${feedback.day}-${feedback.mealType}`;
            if (!mealRatings[key]) {
                mealRatings[key] = {
                    total: 0,
                    count: 0
                };
            }
            mealRatings[key].total += parseInt(feedback.rating);
            mealRatings[key].count += 1;
        });

        // Calculate averages
        const averageRatings = {};
        Object.keys(mealRatings).forEach(key => {
            averageRatings[key] = {
                average: (mealRatings[key].total / mealRatings[key].count).toFixed(1),
                count: mealRatings[key].count
            };
        });

        res.render('menu', { 
            menuItems, 
            averageRatings,
            query: req.query, 
            loggedIn: isLoggedIn 
        });
    } catch (error) {
        console.error('Error fetching menu items:', error);
        res.status(500).send('Internal Server Error');
    }
});

const feedbackFilePath = path.join(__dirname, 'feedbackData.json');


//CHECK temporarirly storing the feedback in a json file
app.post('/feedback', async (req, res) => {
    try {
        const { rating, comment, day, mealType } = req.body;
        const sanitizedComment = comment.replace(/[\r\n]+/g, ' ').trim();

        const newFeedback = {
            rating: rating || 'No rating provided',
            comment: sanitizedComment || 'No comment provided',
            day: day || 'Unknown day',
            mealType: mealType || 'Unknown meal type',
            createdAt: new Date().toISOString()
        };

        let feedbackData = [];
        try {
            const data = await fs.readFile(feedbackFilePath, 'utf-8');
            // Check if data is empty; if so, initialize as empty array
            feedbackData = data.trim() ? JSON.parse(data) : [];
        } catch (error) {
            // If the file doesn't exist, set feedbackData as empty array
            if (error.code !== 'ENOENT') {
                throw error;
            }
            feedbackData = [];
        }

        feedbackData.push(newFeedback);

        await fs.writeFile(feedbackFilePath, JSON.stringify(feedbackData, null, 2));
        res.redirect('/services/mess?feedback=success');
    } catch (error) {
        console.error('Error saving feedback:', error);
        res.status(500).send(error.message);
    }
});

app.get('/services/chatRoom', authMiddleware, async (req, res) => {
    try {
        const isLoggedIn = Boolean(req.cookies.jwt);
        const { role } = req.cookies;

        // Build the query based on role and deletion status
        let query = { deleted: { $ne: true } };

        // Only apply access level filtering for students
        // Admin and warden can see all undeleted rooms
        if (role === 'student') {
            query.$or = [
                { accessLevel: 'all' },
                { accessLevel: 'students' },
                { accessLevel: 'admin_student' },
                { accessLevel: 'warden_student' }
            ];
        }

        // Fetch chat rooms with the combined query
        const chatRooms = await ChatRoom.find(query).sort({ createdAt: -1 });

        // Log the query and results for debugging
        console.log('Chat Room Query:', query);
        console.log('Found Chat Rooms:', chatRooms.length);

        res.render('chatRoom.ejs', { role, loggedIn: isLoggedIn, chatRooms });
    } catch (error) {
        console.error("Error loading chat rooms:", error);
        res.status(500).send("Error loading chat rooms");
    }
});

app.post('/services/chatRoom/create', authMiddleware, async (req, res) => {
    try {
        const { role, userid } = req.cookies;
        // Only admin and warden can create a chat room
        if (role !== 'admin' && role !== 'warden') {
            return res.status(403).send('Unauthorized');
        }

        const { roomName, roomType, description, accessLevel, roomIcon } = req.body;
        if (!roomName || !roomType || !accessLevel) {
            return res.status(400).send('Missing required fields');
        }

        const newRoom = await ChatRoom.create({
            roomName,
            roomType,
            description,
            accessLevel,
            roomIcon: roomIcon || 'fas fa-comments', // default icon if not provided
            createdBy: userid
        });

        res.status(201).json(newRoom);
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal server error');
    }
});

app.delete('/services/chatRoom/delete/:id', authMiddleware, async (req, res) => {
    try {
        const { role } = req.cookies;
        if (role !== 'admin' && role !== 'warden') {
            return res.status(403).send('Unauthorized');
        }

        const { id } = req.params;
        
        // First verify the room exists and is not already deleted
        const room = await ChatRoom.findOne({ _id: id, deleted: { $ne: true } });
        if (!room) {
            return res.status(404).send('Chat room not found or already deleted');
        }

        // Mark as deleted
        const deletedRoom = await ChatRoom.findByIdAndUpdate(
            id,
            { 
                deleted: true, 
                deletedAt: new Date(),
                deletedBy: req.cookies.userid // Track who deleted the room
            },
            { new: true }
        );

        // Log the deletion for debugging
        console.log('Chat Room Deleted:', {
            roomId: id,
            roomName: deletedRoom.roomName,
            deletedBy: req.cookies.userid,
            deletedAt: deletedRoom.deletedAt
        });

        // Notify all connected clients about the room deletion
        io.emit('chatRoomDeleted', { 
            roomId: id,
            message: 'Chat room has been deleted by an administrator'
        });
        
        res.status(200).send('Deleted Successfully');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal server error');
    }
});

// Add a route to verify chat room status (for debugging)
app.get('/services/chatRoom/status/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const room = await ChatRoom.findById(id);
        
        if (!room) {
            return res.status(404).json({ message: 'Chat room not found' });
        }

        res.json({
            roomId: room._id,
            roomName: room.roomName,
            deleted: room.deleted,
            deletedAt: room.deletedAt,
            accessLevel: room.accessLevel,
            createdAt: room.createdAt
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal server error');
    }
});

// Chat Room View Route
app.get('/services/chatRoom/:roomId', async (req, res) => {
    try {
        const roomId = req.params.roomId;
        const userId = req.cookies.userid;
        const role = req.cookies.role;

        if (!userId) {
            return res.redirect('/login');
        }

        const room = await ChatRoom.findById(roomId);
        if (!room) {
            return res.status(404).render('error', { message: 'Chat room not found' });
        }

        // Check access level
        const hasAccess = checkRoomAccess(room.accessLevel, role);
        if (!hasAccess) {
            return res.status(403).render('error', { message: 'You do not have access to this chat room' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.redirect('/login');
        }

        res.render('chatRoomView', {
            room,
            userId,
            userName: user.name,
            role,
            loggedIn: true
        });
    } catch (error) {
        console.error('Error accessing chat room:', error);
        res.status(500).render('error', { message: 'Error accessing chat room' });
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('A user connected');

    // Join a chat room
    socket.on('joinRoom', async ({ roomId, userId, role }) => {
        try {
            const chatRoom = await ChatRoom.findById(roomId);
            if (!chatRoom) {
                socket.emit('error', { message: 'Chat room not found' });
                return;
            }

            // Check access level
            const hasAccess = checkRoomAccess(chatRoom.accessLevel, role);
            if (!hasAccess) {
                socket.emit('error', { message: 'You do not have access to this chat room' });
                return;
            }

            // Join the room
            socket.join(roomId);
            socket.emit('roomJoined', { roomId, roomName: chatRoom.roomName });
            
            // Notify others
            socket.to(roomId).emit('userJoined', { userId, roomId });
        } catch (error) {
            socket.emit('error', { message: 'Error joining room' });
        }
    });

    // Handle chat messages
    socket.on('sendMessage', async ({ roomId, userId, message, imageData, userName }) => {
        try {
            const chatRoom = await ChatRoom.findById(roomId);
            if (!chatRoom) {
                socket.emit('error', { message: 'Chat room not found' });
                return;
            }

            // Save message to database
            chatRoom.messages.push({
                userId,
                userName,
                message,
                imageData, // Store the base64 image data
                timestamp: new Date()
            });
            await chatRoom.save();

            // Broadcast message to room
            io.to(roomId).emit('newMessage', {
                userId,
                userName,
                message,
                imageData,
                timestamp: new Date()
            });
        } catch (error) {
            socket.emit('error', { message: 'Error sending message' });
        }
    });

    // Handle room deletion notification
    socket.on('chatRoomDeleted', ({ roomId, message }) => {
        // Leave the room if user is in it
        socket.leave(roomId);
        // Notify the user about the deletion
        socket.emit('roomDeleted', { roomId, message });
    });

    // Leave room
    socket.on('leaveRoom', ({ roomId, userId }) => {
        socket.leave(roomId);
        socket.to(roomId).emit('userLeft', { userId, roomId });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Helper function to check room access
function checkRoomAccess(accessLevel, userRole) {
    switch (accessLevel) {
        case 'all':
            return true;
        case 'students':
            return userRole === 'student';
        case 'wardens':
            return userRole === 'warden';
        case 'admins':
            return userRole === 'admin';
        case 'admin_warden':
            return userRole === 'admin' || userRole === 'warden';
        case 'admin_student':
            return userRole === 'admin' || userRole === 'student';
        case 'warden_student':
            return userRole === 'warden' || userRole === 'student';
        default:
            return false;
    }
}

// Update the server listen call to use http instead of app
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});