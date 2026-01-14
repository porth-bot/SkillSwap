// User model

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        enum: ['student', 'tutor', 'admin'],
        default: 'student'
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended', 'pending'],
        default: 'pending'
    },
    bio: {
        type: String,
        maxlength: 500,
        default: ''
    },
    grade: {
        type: String,
        default: ''
    },
    school: {
        type: String,
        default: 'Wayzata High School'
    },
    profilePicture: {
        type: String,
        default: ''
    },
    
    // skills
    skillsOffered: [{
        type: String,
        trim: true
    }],
    skillsWanted: [{
        type: String,
        trim: true
    }],
    
    // availability - object with days as keys
    availability: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    
    // stats
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    reviewCount: {
        type: Number,
        default: 0
    },
    sessionCount: {
        type: Number,
        default: 0
    },
    
    emailVerified: {
        type: Boolean,
        default: false
    },
    lastActive: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true // adds createdAt and updatedAt
});

// hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// get first name (for templates)
userSchema.virtual('firstName').get(function() {
    return this.name.split(' ')[0];
});

// get initials for avatar fallback
userSchema.virtual('initials').get(function() {
    const parts = this.name.split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return this.name.substring(0, 2).toUpperCase();
});

// update rating when a new review comes in
userSchema.methods.updateRating = async function(newRating) {
    // simple average calculation
    const total = this.rating * this.reviewCount + newRating;
    this.reviewCount += 1;
    this.rating = total / this.reviewCount;
    await this.save();
};

// check if user is admin
userSchema.methods.isAdmin = function() {
    return this.role === 'admin';
};

// check if user is tutor
userSchema.methods.isTutor = function() {
    return this.role === 'tutor' || this.role === 'admin';
};

// make virtuals show up in JSON
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

// indexes
userSchema.index({ email: 1 });
userSchema.index({ status: 1 });
userSchema.index({ skillsOffered: 1 });
userSchema.index({ role: 1, status: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
