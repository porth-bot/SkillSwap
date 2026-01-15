// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    role: { type: String, enum: ['student', 'tutor', 'admin'], default: 'student' },
    grade: { type: String, default: '9' },
    school: { type: String, default: '' },
    bio: { type: String, default: '' },
    avatar: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    skillsOffered: [{
        name: String,
        category: String,
        proficiencyLevel: { type: String, default: 'intermediate' },
        description: String
    }],
    skillsSought: [{
        name: String,
        category: String,
        proficiencyLevel: { type: String, default: 'beginner' },
        description: String
    }],
    stats: {
        sessionsCompleted: { type: Number, default: 0 },
        averageRating: { type: Number, default: 0 },
        totalReviews: { type: Number, default: 0 }
    }
}, { timestamps: true });

userSchema.virtual('displayName').get(function() {
    return this.firstName + ' ' + this.lastName;
});

module.exports = mongoose.model('User', userSchema);
