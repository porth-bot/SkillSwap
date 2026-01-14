/**
 * Session Model - SkillSwap Student Talent Exchange Platform
 * 
 * Handles scheduling, session management, and session history.
 * Features: Status tracking, recurring sessions, notifications
 */

const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    // Session participants
    tutor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    
    // Session details
    title: {
        type: String,
        required: [true, 'Session title is required'],
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        maxlength: 1000
    },
    skill: {
        name: {
            type: String,
            required: true
        },
        category: {
            type: String,
            required: true,
            enum: ['academics', 'arts', 'technology', 'music', 'sports', 'languages', 'life-skills', 'other']
        }
    },
    
    // Scheduling
    scheduledDate: {
        type: Date,
        required: [true, 'Scheduled date is required'],
        index: true
    },
    duration: {
        type: Number, // Duration in minutes
        required: true,
        min: 15,
        max: 180,
        default: 60
    },
    timezone: {
        type: String,
        default: 'America/Chicago'
    },
    
    // Session format
    format: {
        type: String,
        enum: ['in-person', 'virtual', 'hybrid'],
        default: 'virtual'
    },
    location: {
        type: String,
        maxlength: 200
    },
    meetingLink: {
        type: String,
        maxlength: 500
    },
    
    // Status tracking
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
        default: 'pending',
        index: true
    },
    statusHistory: [{
        status: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: String
    }],
    
    // Cancellation details
    cancellation: {
        cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: String,
        cancelledAt: Date
    },
    
    // Session notes
    tutorNotes: {
        type: String,
        maxlength: 2000
    },
    studentNotes: {
        type: String,
        maxlength: 2000
    },
    
    // Recurring session support
    isRecurring: {
        type: Boolean,
        default: false
    },
    recurringPattern: {
        frequency: {
            type: String,
            enum: ['daily', 'weekly', 'biweekly', 'monthly']
        },
        endDate: Date,
        parentSession: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' }
    },
    
    // Session request details
    request: {
        message: String,
        requestedAt: Date,
        respondedAt: Date
    },
    
    // Completion tracking
    actualStartTime: Date,
    actualEndTime: Date,
    
    // Points/rewards
    pointsAwarded: {
        tutor: { type: Number, default: 0 },
        student: { type: Number, default: 0 }
    }
    
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for common queries
sessionSchema.index({ tutor: 1, scheduledDate: 1 });
sessionSchema.index({ student: 1, scheduledDate: 1 });
sessionSchema.index({ status: 1, scheduledDate: 1 });
sessionSchema.index({ 'skill.name': 'text', title: 'text' });

// Virtual for actual duration
sessionSchema.virtual('actualDuration').get(function() {
    if (this.actualStartTime && this.actualEndTime) {
        return Math.round((this.actualEndTime - this.actualStartTime) / 60000); // minutes
    }
    return null;
});

// Virtual to check if session is in past
sessionSchema.virtual('isPast').get(function() {
    return new Date(this.scheduledDate) < new Date();
});

// Virtual to check if session can be modified
sessionSchema.virtual('canModify').get(function() {
    const now = new Date();
    const sessionTime = new Date(this.scheduledDate);
    const hoursUntilSession = (sessionTime - now) / (1000 * 60 * 60);
    return hoursUntilSession > 24 && ['pending', 'confirmed'].includes(this.status);
});

// Pre-save middleware to track status changes
sessionSchema.pre('save', function(next) {
    if (this.isModified('status')) {
        this.statusHistory.push({
            status: this.status,
            changedAt: new Date()
        });
    }
    next();
});

// Method to confirm session
sessionSchema.methods.confirm = async function(userId) {
    if (this.status !== 'pending') {
        throw new Error('Only pending sessions can be confirmed');
    }
    
    this.status = 'confirmed';
    this.statusHistory.push({
        status: 'confirmed',
        changedAt: new Date(),
        changedBy: userId
    });
    
    return this.save();
};

// Method to cancel session
sessionSchema.methods.cancel = async function(userId, reason) {
    if (!['pending', 'confirmed'].includes(this.status)) {
        throw new Error('This session cannot be cancelled');
    }
    
    this.status = 'cancelled';
    this.cancellation = {
        cancelledBy: userId,
        reason: reason,
        cancelledAt: new Date()
    };
    this.statusHistory.push({
        status: 'cancelled',
        changedAt: new Date(),
        changedBy: userId,
        reason: reason
    });
    
    return this.save();
};

// Method to complete session
sessionSchema.methods.complete = async function(tutorPoints = 20, studentPoints = 10) {
    if (this.status !== 'in-progress' && this.status !== 'confirmed') {
        throw new Error('Only confirmed or in-progress sessions can be completed');
    }
    
    this.status = 'completed';
    this.actualEndTime = new Date();
    this.pointsAwarded = {
        tutor: tutorPoints,
        student: studentPoints
    };
    
    return this.save();
};

// Method to start session
sessionSchema.methods.start = async function() {
    if (this.status !== 'confirmed') {
        throw new Error('Only confirmed sessions can be started');
    }
    
    this.status = 'in-progress';
    this.actualStartTime = new Date();
    
    return this.save();
};

// Static method to get upcoming sessions for a user
sessionSchema.statics.getUpcoming = function(userId, limit = 10) {
    return this.find({
        $or: [{ tutor: userId }, { student: userId }],
        status: { $in: ['pending', 'confirmed'] },
        scheduledDate: { $gte: new Date() }
    })
    .populate('tutor', 'firstName lastName username avatar')
    .populate('student', 'firstName lastName username avatar')
    .sort({ scheduledDate: 1 })
    .limit(limit);
};

// Static method to get session statistics
sessionSchema.statics.getStats = async function(userId) {
    const stats = await this.aggregate([
        {
            $match: {
                $or: [
                    { tutor: new mongoose.Types.ObjectId(userId) },
                    { student: new mongoose.Types.ObjectId(userId) }
                ]
            }
        },
        {
            $group: {
                _id: null,
                totalSessions: { $sum: 1 },
                completedSessions: {
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                },
                cancelledSessions: {
                    $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
                },
                totalDuration: {
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$duration', 0] }
                },
                tutorSessions: {
                    $sum: { $cond: [{ $eq: ['$tutor', new mongoose.Types.ObjectId(userId)] }, 1, 0] }
                },
                studentSessions: {
                    $sum: { $cond: [{ $eq: ['$student', new mongoose.Types.ObjectId(userId)] }, 1, 0] }
                }
            }
        }
    ]);
    
    return stats[0] || {
        totalSessions: 0,
        completedSessions: 0,
        cancelledSessions: 0,
        totalDuration: 0,
        tutorSessions: 0,
        studentSessions: 0
    };
};

module.exports = mongoose.model('Session', sessionSchema);
