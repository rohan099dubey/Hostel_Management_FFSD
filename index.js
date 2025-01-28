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

app.listen(3000, () => {
    console.log("Server is listening");
})