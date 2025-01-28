const mongoose = require('mongoose');

//for seeding database
// mongoose.connect('mongodb+srv://abhiraj:abhiraj@cluster0.sbhxt0u.mongodb.net/registry_app?retryWrites=true&w=majority')
//     .then(() => console.log('Connected to database'))
//     .catch(() => console.log('error in connecting to database'));

const problemSchema = new mongoose.Schema({
    name: String,
    phone: String,
    rollnum: String,
    hostel: String,
    roomnum: String,
    category: String,
    text: String,
    timeCreated: String,
    isCompleted: Boolean,
})

const Problem = mongoose.model('Problem', problemSchema);
module.exports = Problem;

//Seeding database
// Problem.insertMany([
//     { name: 'Shivang', rollnum: 'S20230010233', text: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam quae consequatur tempore? Lorem ipsum dolor sit amet.', isCompleted: false },
//     { name: 'Dhairya', rollnum: 'S20230010023', text: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam quae consequatur tempore? Lorem ipsum dolor sit amet.', isCompleted: false },
//     { name: 'Devansh', rollnum: 'S202300100232', text: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam quae consequatur tempore? Lorem ipsum dolor sit amet.', isCompleted: false },
//     { name: 'Vaibhav', rollnum: 'S20230010233', text: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam quae consequatur tempore? Lorem ipsum dolor sit amet.', isCompleted: true },
//     { name: 'Abhishek', rollnum: 'S20230010023', text: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam quae consequatur tempore? Lorem ipsum dolor sit amet.', isCompleted: true },
//     { name: 'Anunay', rollnum: 'S202300100232', text: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam quae consequatur tempore? Lorem ipsum dolor sit amet.', isCompleted: true }
// ])