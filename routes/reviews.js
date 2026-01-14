/**
 * Review Routes - SkillSwap Student Talent Exchange Platform
 * 
 * Handles session reviews and ratings.
 */

const express = require('express');
const router = express.Router();
const { User, Session, Review, AuditLog } = require('../models');
const { 
    isAuthenticated,
    validateReview,
    validateMongoId
} = require('../middleware');

/**
 * GET /reviews - List user's reviews
 */
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        
        // Get reviews written by user
        const writtenReviews = await Review.find({ reviewer: userId })
            .populate('reviewee', 'firstName lastName username avatar')
            .populate('session', 'title skill scheduledDate')
            .sort({ createdAt: -1 });
        
        // Get reviews received
        const receivedReviews = await Review.getForUser(userId, { limit: 20 });
        
        // Get review stats
        const stats = await Review.getStatsForUser(userId);
        
        res.render('reviews/list', {
            title: 'My Reviews - SkillSwap',
            writtenReviews,
            receivedReviews,
            stats
        });
        
    } catch (error) {
        console.error('Reviews list error:', error);
        req.session.flash = {
            type: 'error',
            message: 'Failed to load reviews'
        };
        res.redirect('/dashboard');
    }
});

/**
 * GET /reviews/create/:sessionId - Create review for session
 */
router.get('/create/:sessionId', isAuthenticated, validateMongoId('sessionId'), async (req, res) => {
    try {
        const session = await Session.findById(req.params.sessionId)
            .populate('tutor', 'firstName lastName username avatar')
            .populate('student', 'firstName lastName username avatar');
        
        if (!session) {
            req.session.flash = {
                type: 'error',
                message: 'Session not found'
            };
            return res.redirect('/sessions');
        }
        
        // Verify session is completed
        if (session.status !== 'completed') {
            req.session.flash = {
                type: 'error',
                message: 'You can only review completed sessions'
            };
            return res.redirect(`/sessions/${session._id}`);
        }
        
        const userId = req.session.userId;
        const isTutor = session.tutor._id.toString() === userId;
        const isStudent = session.student._id.toString() === userId;
        
        if (!isTutor && !isStudent) {
            req.session.flash = {
                type: 'error',
                message: 'You are not a participant in this session'
            };
            return res.redirect('/sessions');
        }
        
        // Check if already reviewed
        const existingReview = await Review.findOne({
            session: session._id,
            reviewer: userId
        });
        
        if (existingReview) {
            req.session.flash = {
                type: 'warning',
                message: 'You have already reviewed this session'
            };
            return res.redirect(`/sessions/${session._id}`);
        }
        
        // Determine who is being reviewed
        const reviewee = isTutor ? session.student : session.tutor;
        
        res.render('reviews/create', {
            title: `Review ${reviewee.displayName || reviewee.username} - SkillSwap`,
            session,
            reviewee,
            reviewType: isTutor ? 'tutor-review' : 'student-review',
            tags: [
                { value: 'patient', label: 'Patient', icon: '😌' },
                { value: 'knowledgeable', label: 'Knowledgeable', icon: '🧠' },
                { value: 'encouraging', label: 'Encouraging', icon: '💪' },
                { value: 'well-prepared', label: 'Well Prepared', icon: '📋' },
                { value: 'punctual', label: 'Punctual', icon: '⏰' },
                { value: 'friendly', label: 'Friendly', icon: '😊' },
                { value: 'professional', label: 'Professional', icon: '👔' },
                { value: 'clear-explanations', label: 'Clear Explanations', icon: '💡' },
                { value: 'good-listener', label: 'Good Listener', icon: '👂' },
                { value: 'asks-good-questions', label: 'Asks Good Questions', icon: '❓' },
                { value: 'motivated', label: 'Motivated', icon: '🔥' },
                { value: 'respectful', label: 'Respectful', icon: '🤝' }
            ]
        });
        
    } catch (error) {
        console.error('Review create page error:', error);
        res.redirect('/sessions');
    }
});

/**
 * POST /reviews/create/:sessionId - Submit review
 */
router.post('/create/:sessionId', isAuthenticated, validateMongoId('sessionId'), validateReview, async (req, res) => {
    try {
        const session = await Session.findById(req.params.sessionId);
        
        if (!session || session.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Invalid session'
            });
        }
        
        const userId = req.session.userId;
        const isTutor = session.tutor.toString() === userId;
        const isStudent = session.student.toString() === userId;
        
        if (!isTutor && !isStudent) {
            return res.status(403).json({
                success: false,
                message: 'You are not a participant in this session'
            });
        }
        
        // Check for existing review
        const existingReview = await Review.findOne({
            session: session._id,
            reviewer: userId
        });
        
        if (existingReview) {
            return res.status(400).json({
                success: false,
                message: 'You have already reviewed this session'
            });
        }
        
        const revieweeId = isTutor ? session.student : session.tutor;
        
        const review = new Review({
            session: session._id,
            reviewer: userId,
            reviewee: revieweeId,
            reviewType: isTutor ? 'tutor-review' : 'student-review',
            ratings: req.body.ratings,
            title: req.body.title,
            content: req.body.content,
            tags: req.body.tags || [],
            wouldRecommend: req.body.wouldRecommend !== false
        });
        
        await review.save();
        
        // Log review creation
        await AuditLog.log({
            user: userId,
            action: 'REVIEW_CREATE',
            category: 'review',
            description: `Review submitted for session: ${session.title}`,
            targetType: 'Review',
            targetId: review._id
        });
        
        // Award achievement for first review
        const user = await User.findById(userId);
        const reviewCount = await Review.countDocuments({ reviewer: userId });
        
        if (reviewCount === 1) {
            await user.addAchievement({
                name: 'First Review',
                description: 'Submitted your first review',
                icon: '⭐',
                points: 10
            });
        } else if (reviewCount === 10) {
            await user.addAchievement({
                name: 'Dedicated Reviewer',
                description: 'Submitted 10 reviews',
                icon: '🌟',
                points: 30
            });
        }
        
        req.session.flash = {
            type: 'success',
            message: 'Thank you for your review!'
        };
        
        res.json({
            success: true,
            message: 'Review submitted successfully',
            redirectUrl: `/sessions/${session._id}`
        });
        
    } catch (error) {
        console.error('Review submit error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit review'
        });
    }
});

/**
 * POST /reviews/:id/helpful - Toggle helpful vote
 */
router.post('/:id/helpful', isAuthenticated, validateMongoId(), async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }
        
        await review.voteHelpful(req.session.userId);
        
        res.json({
            success: true,
            helpfulCount: review.helpfulCount
        });
        
    } catch (error) {
        console.error('Helpful vote error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to register vote'
        });
    }
});

/**
 * POST /reviews/:id/respond - Add response to review
 */
router.post('/:id/respond', isAuthenticated, validateMongoId(), async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }
        
        // Only reviewee can respond
        if (review.reviewee.toString() !== req.session.userId) {
            return res.status(403).json({
                success: false,
                message: 'You can only respond to reviews about yourself'
            });
        }
        
        const { content } = req.body;
        
        if (!content || content.length < 5 || content.length > 1000) {
            return res.status(400).json({
                success: false,
                message: 'Response must be between 5 and 1000 characters'
            });
        }
        
        await review.addResponse(content);
        
        res.json({
            success: true,
            message: 'Response added successfully'
        });
        
    } catch (error) {
        console.error('Review respond error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add response'
        });
    }
});

/**
 * POST /reviews/:id/flag - Flag review for moderation
 */
router.post('/:id/flag', isAuthenticated, validateMongoId(), async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }
        
        const { reason } = req.body;
        
        if (!reason || reason.length < 10) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a reason (at least 10 characters)'
            });
        }
        
        // Log the flag action (for admin review)
        await AuditLog.log({
            user: req.session.userId,
            action: 'REVIEW_FLAG',
            category: 'review',
            description: `Review flagged for moderation. Reason: ${reason}`,
            targetType: 'Review',
            targetId: review._id,
            metadata: { reason }
        });
        
        // Set pending status for admin review
        review.moderationStatus = 'pending';
        await review.save();
        
        res.json({
            success: true,
            message: 'Review flagged for moderation'
        });
        
    } catch (error) {
        console.error('Review flag error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to flag review'
        });
    }
});

module.exports = router;
