const problems = [
    {
        problemId: 1,
        problemTitle: "Broken Fan cutiya",
        problemDescription: "The ceiling fan in room 203 is not working properly and making unusual noise",
        problemImage: "https://images.unsplash.com/photo-1621274283140-e4450435f2d4",
        studentId: 101,
        roomNumber: 203,
        hostel: "BH-1",
        category: "Electrical",
        status: "Pending"
    },
    {
        problemId: 2,
        problemTitle: "Water Leakage",
        problemDescription: "There is continuous water leakage from bathroom pipe causing water logging",
        problemImage: "https://images.unsplash.com/photo-1585751092218-be8ef3a24d71",
        studentId: 102,
        roomNumber: 204,
        hostel: "BH-2",
        category: "Plumbing",
        status: "Resolved"
    },
    {
        problemId: 3,
        problemTitle: "Broken Chair",
        problemDescription: "The study chair in room 405 is broken and needs immediate replacement",
        problemImage: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237",
        studentId: 103,
        roomNumber: 405,
        hostel: "BH-3",
        category: "Furniture",
        status: "Pending"
    },
    {
        problemId: 4,
        problemTitle: "WiFi Issues",
        problemDescription: "No internet connectivity in the entire 2nd floor since morning",
        problemImage: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31",
        studentId: 104,
        roomNumber: 205,
        hostel: "BH-4",
        category: "Internet",
        status: "Pending"
    },
    {
        problemId: 5,
        problemTitle: "Paint Peeling",
        problemDescription: "The wall paint in room 302 is peeling off due to moisture",
        problemImage: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f",
        studentId: 105,
        roomNumber: 302,
        hostel: "BH-1",
        category: "Painting",
        status: "Rejected"
    }
];

const entryExit = [
    {
        transitId: 1,
        studentRollNumber: 101,
        studentName: "John Doe",
        studentHostel: "BH-2",
        studentRoomNumber: 203,
        purpose: "going to home",
        transitStatus: "ENTRY",
        date: "2025-03-23",
        time: "10:00:00",
    },
    {
        transitId: 2,
        studentRollNumber: 102,
        studentName: "Jane Doe",
        studentHostel: "BH-1",
        studentRoomNumber: 204,
        purpose: "coming back to hostel",
        transitStatus: "EXIT",
        date: "2025-03-23",
        time: "10:00:00",
    },
    {
        transitId: 3,
        studentRollNumber: 103,
        studentName: "Vikas",
        studentHostel: "BH-1",
        studentRoomNumber: 203,
        purpose: "going to chennai",
        transitStatus: "ENTRY",
        date: "2025-03-23",
        time: "10:00:00",
    },
    {
        transitId: 4,
        studentRollNumber: 104,
        studentName: "Raj",
        studentHostel: "BH-1",
        studentRoomNumber: 204,
        purpose: "coming back to hostel",
        transitStatus: "EXIT",
        date: "2025-03-23",
        time: "10:00:00",
    },
    {
        transitId: 5,
        studentRollNumber: 183,
        studentName: "Pratyush",
        studentHostel: "BH-1",
        studentRoomNumber: 423,
        purpose: "going to sullurpeta",
        transitStatus: "EXIT",
        date: "2025-03-14",
        time: "08:30:00",
    }
];

module.exports = { problems, entryExit };
