/**
 * Review Model - SkillSwap Student Talent Exchange Platform
 * 
 * Handles ratings and feedback after session completion.
 * Features: Star ratings, detailed feedback, moderation support
 */

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    // Reference to session
    session: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        required: true,
        index: true
    },
    
    // Reviewer and reviewee
    reviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    reviewee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    
    // Review type
    reviewType: {
        type: String,
        enum: ['tutor-review', 'student-review'], // tutor reviewing student, or vice versa
        required: true
    },
    
    // Ratings (1-5 stars)
    ratings: {
        overall: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        communication: {
            type: Number,
            min: 1,
            max: 5
        },
        knowledge: {
            type: Number,
            min: 1,
            max: 5
        },
        punctuality: {
            type: Number,
            min: 1,
            max: 5
        },
        helpfulness: {
            type: Number,
            min: 1,
            max: 5
        }
    },
    
    // Written feedback
    title: {
        type: String,
        trim: true,
        maxlength: 100
    },
    content: {
        type: String,
        required: [true, 'Review content is required'],
        minlength: [10, 'Review must be at least 10 characters'],
        maxlength: 2000
    },
    
    // Tags for quick insights
    tags: [{
        type: String,
        enum: [
            'patient', 'knowledgeable', 'encouraging', 'well-prepared',
            'punctual', 'friendly', 'professional', 'clear-explanations',
            'good-listener', 'asks-good-questions', 'motivated', 'respectful'
        ]
    }],
    
    // Would recommend?
    wouldRecommend: {
        type: Boolean,
        default: true
    },
    
    // Moderation
    isApproved: {
        type: Boolean,
        default: true // Auto-approve by default, can be changed for moderation
    },
    moderationStatus: {
        type: String,
        enum: ['pending', 'approved', 'flagged', 'removed'],
        default: 'approved'
    },
    moderationNote: String,
    moderatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    moderatedAt: Date,
    
    // Visibility
    isPublic: {
        type: Boolean,
        default: true
    },
    
    // Response from reviewee
    response: {
        content: {
            type: String,
            maxlength: 1000
        },
        respondedAt: Date
    },
    
    // Helpful votes
    helpfulVotes: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        votedAt: { type: Date, default: Date.now }
    }],
    helpfulCount: {
        type: Number,
        default: 0
    }
    
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
reviewSchema.index({ reviewee: 1, 'ratings.overall': -1 });
reviewSchema.index({ session: 1, reviewer: 1 }, { unique: true }); // One review per user per session
reviewSchema.index({ content: 'text', title: 'text' });

// Virtual for average rating
reviewSchema.virtual('averageRating').get(function() {
    const ratings = this.ratings;
    const validRatings = [
        ratings.overall,
        ratings.communication,
        ratings.knowledge,
        ratings.punctuality,
        ratings.helpfulness
    ].filter(r => r !== undefined && r !== null);
    
    if (validRatings.length === 0) return 0;
    return (validRatings.reduce((a, b) => a + b, 0) / validRatings.length).toFixed(1);
});

// Pre-save to update helpful count
reviewSchema.pre('save', function(next) {
    this.helpfulCount = this.helpfulVotes.length;
    next();
});

// Post-save to update user's average rating
reviewSchema.post('save', async function() {
    const Review = this.constructor;
    const User = mongoose.model('User');
    
    // Calculate new average for the reviewee
    const stats = await Review.aggregate([
        {
            $match: {
                reviewee: this.reviewee,
                isApproved: true,
                moderationStatus: 'approved'
            }
        },
        {
            $group: {
                _id: '$reviewee',
                averageRating: { $avg: '$ratings.overall' },
                totalReviews: { $sum: 1 }
            }
        }
    ]);
    
    if (stats.length > 0) {
        await User.findByIdAndUpdate(this.reviewee, {
            'stats.averageRating': Math.round(stats[0].averageRating * 10) / 10
        });
    }
});

// Method to add response
reviewSchema.methods.addResponse = async function(content) {
    this.response = {
        content: content,
        respondedAt: new Date()
    };
    return this.save();
};

// Method to vote helpful
reviewSchema.methods.voteHelpful = async function(userId) {
    const alreadyVoted = this.helpfulVotes.some(
        vote => vote.user.toString() === userId.toString()
    );
    
    if (alreadyVoted) {
        // Remove vote
        this.helpfulVotes = this.helpfulVotes.filter(
            vote => vote.user.toString() !== userId.toString()
        );
    } else {
        // Add vote
        this.helpfulVotes.push({ user: userId });
    }
    
    return this.save();
};

// Method to flag for moderation
reviewSchema.methods.flag = async function(reason, moderatorId) {
    this.moderationStatus = 'flagged';
    this.moderationNote = reason;
    this.moderatedBy = moderatorId;
    this.moderatedAt = new Date();
    this.isApproved = false;
    
    return this.save();
};

// Static method to get reviews for a user
reviewSchema.statics.getForUser = function(userId, options = {}) {
    const query = {
        reviewee: userId,
        isApproved: true,
        moderationStatus: 'approved'
    };
    
    if (options.publicOnly) {
        query.isPublic = true;
    }
    
    return this.find(query)
        .populate('reviewer', 'firstName lastName username avatar')
        .populate('session', 'title skill scheduledDate')
        .sort({ createdAt: -1 })
        .limit(options.limit || 20);
};

// Static method to get review statistics for a user
reviewSchema.statics.getStatsForUser = async function(userId) {
    const stats = await this.aggregate([
        {
            $match: {
                reviewee: new mongoose.Types.ObjectId(userId),
                isApproved: true,
                moderationStatus: 'approved'
            }
        },
        {
            $group: {
                _id: null,
                totalReviews: { $sum: 1 },
                averageOverall: { $avg: '$ratings.overall' },
                averageCommunication: { $avg: '$ratings.communication' },
                averageKnowledge: { $avg: '$ratings.knowledge' },
                averagePunctuality: { $avg: '$ratings.punctuality' },
                averageHelpfulness: { $avg: '$ratings.helpfulness' },
                recommendationRate: {
                    $avg: { $cond: ['$wouldRecommend', 1, 0] }
                }
            }
        }
    ]);
    
    // Get tag distribution
    const tagStats = await this.aggregate([
        {
            $match: {
                reviewee: new mongoose.Types.ObjectId(userId),
                isApproved: true
            }
        },
        { $unwind: '$tags' },
        {
            $group: {
                _id: '$tags',
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
    ]);
    
    return {
        ...(stats[0] || {
            totalReviews: 0,
            averageOverall: 0,
            averageCommunication: 0,
            averageKnowledge: 0,
            averagePunctuality: 0,
            averageHelpfulness: 0,
            recommendationRate: 0
        }),
        topTags: tagStats.map(t => ({ tag: t._id, count: t.count }))
    };
};

module.exports = mongoose.model('Review', reviewSchema);
