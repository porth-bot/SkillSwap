// seed the database with test data
// run with: node seeds/seed.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Session = require('../models/Session');
const Review = require('../models/Review');
const Message = require('../models/Message');
const AuditLog = require('../models/AuditLog');

// skills people actually tutor at our school
const skills = [
    'Algebra 2', 'Pre-Calculus', 'AP Calculus AB', 'AP Calculus BC', 'AP Statistics',
    'Geometry', 'AP Physics 1', 'AP Physics C', 'AP Chemistry', 'AP Biology',
    'Honors Chemistry', 'AP Computer Science A', 'Python', 'Java', 
    'AP English Language', 'AP English Literature', 'Essay Writing', 'College App Essays',
    'AP US History', 'AP European History', 'AP World History', 'AP Psychology',
    'Spanish 1-2', 'Spanish 3-4', 'AP Spanish', 'French 1-2', 'French 3-4',
    'Mandarin Chinese', 'Piano', 'Guitar', 'SAT Math', 'SAT Reading/Writing', 
    'ACT Prep', 'Debate', 'Public Speaking'
];

// actual student profiles lol
const students = [
    { first: 'Emma', last: 'Chen', grade: 'Junior', bio: 'junior struggling with physics but pretty good at spanish if anyone needs help! also play volleyball 🏐' },
    { first: 'Marcus', last: 'Johnson', grade: 'Senior', bio: 'Senior, got a 5 on AP Calc BC last year. Happy to help with any calc stuff - I actually like explaining math lol' },
    { first: 'Aisha', last: 'Patel', grade: 'Sophomore', bio: 'soph here! I do debate (PF) and can help with that or essay writing. looking for someone to help me with chem 😅' },
    { first: 'Jake', last: 'Morrison', grade: 'Junior', bio: 'Been coding since middle school, can help with APCSA or Python. Also decent at guitar if anyones interested' },
    { first: 'Sofia', last: 'Rodriguez', grade: 'Senior', bio: 'Native Spanish speaker - can help with any level! Also looking for physics help bc im dying in that class rn' },
    { first: 'Kevin', last: 'Nguyen', grade: 'Junior', bio: 'can help with competition programming or regular CS homework' },
    { first: 'Maya', last: 'Williams', grade: 'Senior', bio: 'english is my thing - helped a bunch of friends with their college essays last year. lmk if you need a second pair of eyes!' },
    { first: 'Ethan', last: 'Kim', grade: 'Junior', bio: 'Piano for 10 years, also do music theory' },
    { first: 'Zoe', last: 'Thompson', grade: 'Sophomore', bio: 'Looking for calc help!! Can trade for bio tutoring - got a 98 in honors bio last year' },
    { first: 'Daniel', last: 'Garcia', grade: 'Senior', bio: 'Chem nerd 🧪 got a 5 on AP Chem, happy to help' },
    { first: 'Lily', last: 'Anderson', grade: 'Junior', bio: 'Art kid who somehow ended up good at math? Can help with geometry/algebra 2' },
    { first: 'Ryan', last: 'OBrien', grade: 'Senior', bio: 'SAT tutor - went from 1380 to 1520, know all the tricks' },
    { first: 'Priya', last: 'Sharma', grade: 'Junior', bio: 'AP Physics C is my jam. Also can help with calc since theyre connected' },
    { first: 'Chris', last: 'Lee', grade: 'Sophomore', bio: 'freshman year i was SO lost in algebra, now I actually get it and want to help others' },
    { first: 'Hannah', last: 'Martinez', grade: 'Senior', bio: 'APUSH got me good at history essays, can help with DBQs' },
    { first: 'Alex', last: 'Taylor', grade: 'Junior', bio: 'I do web dev and can help with HTML/CSS/JS. also need chem help pls' },
    { first: 'Jordan', last: 'Wright', grade: 'Senior', bio: 'varsity basketball + 4.0 gpa, can help with time management lol' },
    { first: 'Mia', last: 'Huang', grade: 'Junior', bio: 'Mandarin is my first language! Can help beginners or advanced' },
    { first: 'Tyler', last: 'Davis', grade: 'Sophomore', bio: 'Just got into coding this year and loving it. can help with basics' },
    { first: 'Chloe', last: 'Brown', grade: 'Senior', bio: 'Psychology nerd, got a 5 on AP Psych' }
];

// reviews that sound like real students wrote them
const goodReviews = [
    "Super helpful! Finally understand derivatives",
    "Really patient even when I asked the same question like 5 times lol",
    "Explained things way better than my teacher tbh",
    "Great session, went through a ton of practice problems",
    "So nice and didnt make me feel dumb",
    "Actually made chem interesting??",
    "Helped me fix my college essay, its so much better now",
    "Best tutor on here! Clear explanations",
    "Helped me go from a C to a B+",
    "Went through my study guide before the AP exam. Lifesaver"
];

const okReviews = [
    "Good session, maybe could go slower on some parts",
    "Helpful but we ran out of time",
    "Pretty good, learned a lot",
    "Solid tutor, knew the material well"
];

// message convos
const convos = [
    [
        { from: 0, text: "hey! saw you tutor calc, are you free this week?" },
        { from: 1, text: "Yeah! Thursday after school or Saturday morning work" },
        { from: 0, text: "thursday works, maybe 4?" },
        { from: 1, text: "Sounds good, library study rooms?" },
        { from: 0, text: "yep see you then" }
    ],
    [
        { from: 0, text: "hi do you still do spanish tutoring" },
        { from: 1, text: "Yep! What level?" },
        { from: 0, text: "spanish 3, we have a speaking test next week" },
        { from: 1, text: "I can help with that! Tomorrow after 5?" },
        { from: 0, text: "perfect tysm" }
    ],
    [
        { from: 0, text: "thanks for yesterday! that helped a lot" },
        { from: 1, text: "Np! Lmk if you have questions before your test" }
    ],
    [
        { from: 0, text: "running 5 min late sorry!!" },
        { from: 1, text: "No worries" }
    ],
    [
        { from: 0, text: "do you do AP physics or just regular" },
        { from: 1, text: "Both! Physics 1 and C" },
        { from: 0, text: "ok cool im in physics 1 and nothing makes sense" },
        { from: 1, text: "Lol felt that. What unit?" },
        { from: 0, text: "kinematics" },
        { from: 1, text: "Oh thats one of the easier ones once it clicks. want to meet this week?" }
    ]
];

// helper funcs
function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomItems(arr, min, max) {
    const count = Math.floor(Math.random() * (max - min + 1)) + min;
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

function randomDate(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - Math.floor(Math.random() * daysAgo));
    return d;
}

function futureDate(minDays, maxDays) {
    const d = new Date();
    d.setDate(d.getDate() + Math.floor(Math.random() * (maxDays - minDays + 1)) + minDays);
    d.setHours(15 + Math.floor(Math.random() * 4), Math.random() > 0.5 ? 0 : 30, 0, 0);
    return d;
}

async function seed() {
    try {
        console.log('connecting to db...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/skillswap');
        
        console.log('clearing old data...');
        await User.deleteMany({});
        await Session.deleteMany({});
        await Review.deleteMany({});
        await Message.deleteMany({});
        await AuditLog.deleteMany({});
        
        // create admin
        console.log('creating admin...');
        const adminPw = await bcrypt.hash('admin123', 10);
        const admin = await User.create({
            name: 'Admin',
            email: 'admin@skillswap.edu',
            password: adminPw,
            role: 'admin',
            status: 'active',
            bio: 'Site admin - contact me if theres any issues',
            grade: 'Staff',
            school: 'Wayzata High School',
            skillsOffered: [],
            skillsWanted: [],
            emailVerified: true
        });
        
        // create users
        console.log('creating users...');
        const users = [];
        const pw = await bcrypt.hash('password123', 10);
        
        for (let i = 0; i < students.length; i++) {
            const s = students[i];
            const email = `${s.first.toLowerCase()}.${s.last.toLowerCase()}@student.wayzata.k12.mn.us`;
            
            // figure out what they tutor based on bio
            let offered = [];
            const bio = s.bio.toLowerCase();
            if (bio.includes('calc')) offered.push(randomItem(['AP Calculus AB', 'AP Calculus BC']));
            if (bio.includes('spanish')) offered.push(randomItem(['Spanish 1-2', 'Spanish 3-4', 'AP Spanish']));
            if (bio.includes('physics') && !bio.includes('need') && !bio.includes('dying')) offered.push('AP Physics 1');
            if (bio.includes('chem') && !bio.includes('need')) offered.push('AP Chemistry');
            if (bio.includes('bio') && !bio.includes('need')) offered.push('AP Biology');
            if (bio.includes('coding') || bio.includes('apcsa') || bio.includes('cs')) offered.push('AP Computer Science A');
            if (bio.includes('python')) offered.push('Python');
            if (bio.includes('essay') || bio.includes('english')) offered.push('Essay Writing');
            if (bio.includes('college essay')) offered.push('College App Essays');
            if (bio.includes('piano')) offered.push('Piano');
            if (bio.includes('guitar')) offered.push('Guitar');
            if (bio.includes('debate')) offered.push('Debate');
            if (bio.includes('sat')) offered.push('SAT Math', 'SAT Reading/Writing');
            if (bio.includes('french')) offered.push(randomItem(['French 1-2', 'French 3-4']));
            if (bio.includes('mandarin') || bio.includes('chinese')) offered.push('Mandarin Chinese');
            if (bio.includes('apush') || bio.includes('history')) offered.push('AP US History');
            if (bio.includes('psych')) offered.push('AP Psychology');
            if (bio.includes('web dev')) offered.push('Java'); // close enough
            if (bio.includes('geometry') || bio.includes('algebra')) offered.push('Algebra 2', 'Geometry');
            
            // what they want help with
            let wanted = [];
            if (bio.includes('need') || bio.includes('looking for') || bio.includes('dying')) {
                if (bio.includes('physics')) wanted.push('AP Physics 1');
                if (bio.includes('chem')) wanted.push('AP Chemistry');
                if (bio.includes('calc')) wanted.push('AP Calculus AB');
            }
            
            if (offered.length === 0) offered = randomItems(skills, 1, 2);
            if (wanted.length === 0) wanted = randomItems(skills.filter(s => !offered.includes(s)), 1, 2);
            
            const user = await User.create({
                name: `${s.first} ${s.last}`,
                email,
                password: pw,
                role: offered.length > 0 ? 'tutor' : 'student',
                status: 'active',
                bio: s.bio,
                grade: s.grade,
                school: 'Wayzata High School',
                skillsOffered: [...new Set(offered)],
                skillsWanted: [...new Set(wanted)],
                availability: {
                    monday: Math.random() > 0.4 ? ['15:30-18:00'] : [],
                    tuesday: Math.random() > 0.4 ? ['15:30-18:00'] : [],
                    wednesday: Math.random() > 0.5 ? ['15:30-17:00'] : [],
                    thursday: Math.random() > 0.4 ? ['15:30-18:00'] : [],
                    friday: Math.random() > 0.6 ? ['15:00-17:00'] : [],
                    saturday: Math.random() > 0.5 ? ['10:00-14:00'] : [],
                    sunday: Math.random() > 0.7 ? ['14:00-17:00'] : []
                },
                emailVerified: true,
                lastActive: randomDate(5),
                createdAt: randomDate(90)
            });
            users.push(user);
        }
        
        console.log(`created ${users.length} users`);
        
        // create sessions
        console.log('creating sessions...');
        const tutors = users.filter(u => u.role === 'tutor');
        const sessions = [];
        const locations = ['Library Study Room', 'Zoom', 'Google Meet', 'Commons', 'Caribou Coffee'];
        
        for (let i = 0; i < 35; i++) {
            const tutor = randomItem(tutors);
            let student = randomItem(users);
            while (student._id.equals(tutor._id)) student = randomItem(users);
            
            const skill = tutor.skillsOffered.length > 0 
                ? randomItem(tutor.skillsOffered) 
                : randomItem(skills);
            
            // most sessions completed, some upcoming
            const roll = Math.random();
            let status;
            if (roll < 0.5) status = 'completed';
            else if (roll < 0.75) status = 'scheduled';
            else if (roll < 0.9) status = 'pending';
            else status = 'cancelled';
            
            const isPast = status === 'completed' || status === 'cancelled';
            const date = isPast ? randomDate(40) : futureDate(1, 20);
            
            const session = await Session.create({
                tutor: tutor._id,
                student: student._id,
                skill,
                scheduledDate: date,
                duration: randomItem([30, 45, 60, 60, 60]), // 60 is most common
                status,
                location: randomItem(locations),
                notes: Math.random() > 0.7 ? 'test prep' : '',
                cancelReason: status === 'cancelled' ? randomItem(['sick', 'schedule conflict', 'something came up']) : '',
                createdAt: new Date(date.getTime() - 5 * 24 * 60 * 60 * 1000)
            });
            sessions.push(session);
        }
        
        console.log(`created ${sessions.length} sessions`);
        
        // create reviews
        console.log('creating reviews...');
        const completedSessions = sessions.filter(s => s.status === 'completed');
        let reviewCount = 0;
        
        for (const sess of completedSessions) {
            if (Math.random() > 0.4) continue; // not everyone leaves reviews
            
            const isGood = Math.random() > 0.15;
            const comment = isGood ? randomItem(goodReviews) : randomItem(okReviews);
            const rating = isGood ? (Math.random() > 0.3 ? 5 : 4) : (Math.random() > 0.5 ? 4 : 3);
            
            await Review.create({
                reviewer: sess.student,
                reviewee: sess.tutor,
                session: sess._id,
                rating,
                comment,
                type: 'tutor',
                status: 'approved',
                createdAt: new Date(sess.scheduledDate.getTime() + 2 * 24 * 60 * 60 * 1000)
            });
            reviewCount++;
        }
        
        console.log(`created ${reviewCount} reviews`);
        
        // create messages
        console.log('creating messages...');
        let msgCount = 0;
        
        for (let i = 0; i < 8; i++) {
            const convo = randomItem(convos);
            const user1 = randomItem(users);
            let user2 = randomItem(users);
            while (user1._id.equals(user2._id)) user2 = randomItem(users);
            
            const participants = [user1, user2];
            const baseTime = randomDate(10);
            
            for (let j = 0; j < convo.length; j++) {
                const msg = convo[j];
                await Message.create({
                    sender: participants[msg.from]._id,
                    receiver: participants[msg.from === 0 ? 1 : 0]._id,
                    content: msg.text,
                    read: j < convo.length - 1,
                    createdAt: new Date(baseTime.getTime() + j * 15 * 60 * 1000)
                });
                msgCount++;
            }
        }
        
        console.log(`created ${msgCount} messages`);
        
        console.log('\n-------------------');
        console.log('done!');
        console.log('admin: admin@skillswap.edu / admin123');
        console.log('users: [firstname].[lastname]@student.wayzata.k12.mn.us / password123');
        console.log('-------------------\n');
        
        await mongoose.disconnect();
        
    } catch (err) {
        console.error('seed error:', err);
        process.exit(1);
    }
}

seed();
