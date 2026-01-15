// seeds/seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User } = require('../models');

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/skillswap');
    console.log('Connected to MongoDB');

    // clear existing data
    await User.deleteMany({});
    console.log('Cleared users');

    const password = await bcrypt.hash('password123', 10);
    const adminPassword = await bcrypt.hash('admin123', 10);

    // create admin
    await User.create({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@skillswap.edu',
        password: adminPassword,
        username: 'admin',
        role: 'admin',
        grade: '12'
    });

    // create test students
    const students = [
        { firstName: 'Emma', lastName: 'Chen', skillsOffered: [{ name: 'AP Calculus', category: 'math' }, { name: 'Piano', category: 'music' }] },
        { firstName: 'Marcus', lastName: 'Johnson', skillsOffered: [{ name: 'Spanish', category: 'languages' }, { name: 'Basketball', category: 'sports' }] },
        { firstName: 'Sarah', lastName: 'Williams', skillsOffered: [{ name: 'Python', category: 'technology' }, { name: 'Biology', category: 'science' }] },
        { firstName: 'James', lastName: 'Brown', skillsOffered: [{ name: 'Essay Writing', category: 'english' }, { name: 'Guitar', category: 'music' }] },
        { firstName: 'Lisa', lastName: 'Davis', skillsOffered: [{ name: 'Chemistry', category: 'science' }, { name: 'Art', category: 'arts' }] }
    ];

    for (let i = 0; i < students.length; i++) {
        const s = students[i];
        await User.create({
            firstName: s.firstName,
            lastName: s.lastName,
            email: `${s.firstName.toLowerCase()}.${s.lastName.toLowerCase()}@student.wayzata.k12.mn.us`,
            password: password,
            username: s.firstName.toLowerCase() + s.lastName.toLowerCase() + i,
            role: 'student',
            grade: String(9 + (i % 4)),
            skillsOffered: s.skillsOffered,
            bio: `Hi, I'm ${s.firstName}! I love helping others learn.`
        });
    }

    console.log('Created users');
    console.log('');
    console.log('Test accounts:');
    console.log('Admin: admin@skillswap.edu / admin123');
    console.log('Student: emma.chen@student.wayzata.k12.mn.us / password123');
    
    await mongoose.disconnect();
    console.log('Done!');
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
