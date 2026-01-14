/**
 * Dashboard Routes
 * User dashboard and overview functionality
 * 
 * @module routes/dashboard
 */

const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const { User, Session, Review, Message, Conversation } = require('../models');

/**
 * GET /dashboard
 * Main dashboard page with overview stats and activity
 */
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        
        // Parallel fetch all dashboard data for performance
        const [
            user,
            upcomingSessions,
            recentActivity,
            unreadMessages,
            recentReviews,
            suggestedMatches,
            stats
        ] = await Promise.all([
            // User with skills
            User.findById(userId).select('firstName lastName username avatar skillsOffered skillsSought points level achievements stats'),
            
            // Upcoming sessions (next 7 days)
            Session.find({
                $or: [{ tutor: userId }, { student: userId }],
                status: { $in: ['pending', 'confirmed'] },
                scheduledDate: { 
                    $gte: new Date(),
                    $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                }
            })
            .populate('tutor student', 'firstName lastName username avatar')
            .sort('scheduledDate')
            .limit(5),
            
            // Recent activity - sessions in last 30 days
            Session.find({
                $or: [{ tutor: userId }, { student: userId }],
                updatedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            })
            .populate('tutor student', 'firstName lastName username')
            .sort('-updatedAt')
            .limit(10),
            
            // Unread message count
            Conversation.aggregate([
                { $match: { participants: userId } },
                { $project: { unread: { $ifNull: [`$unreadCount.${userId}`, 0] } } },
                { $group: { _id: null, total: { $sum: '$unread' } } }
            ]),
            
            // Recent reviews received
            Review.find({ reviewee: userId, status: 'approved' })
                .populate('reviewer', 'firstName lastName username avatar')
                .sort('-createdAt')
                .limit(3),
            
            // Suggested skill matches
            getSuggestedMatches(userId),
            
            // Dashboard statistics
            getDashboardStats(userId)
        ]);
        
        res.render('pages/dashboard', {
            title: 'Dashboard',
            user,
            upcomingSessions,
            recentActivity,
            unreadMessages: unreadMessages[0]?.total || 0,
            recentReviews,
            suggestedMatches,
            stats
        });
        
    } catch (error) {
        console.error('Dashboard error:', error);
        req.flash('error', 'Failed to load dashboard');
        res.redirect('/');
    }
});

/**
 * GET /dashboard/activity
 * Detailed activity feed
 */
router.get('/activity', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = 20;
        const skip = (page - 1) * limit;
        
        // Get all session activity
        const [sessions, total] = await Promise.all([
            Session.find({
                $or: [{ tutor: userId }, { student: userId }]
            })
            .populate('tutor student', 'firstName lastName username avatar')
            .sort('-updatedAt')
            .skip(skip)
            .limit(limit),
            
            Session.countDocuments({
                $or: [{ tutor: userId }, { student: userId }]
            })
        ]);
        
        const totalPages = Math.ceil(total / limit);
        
        res.render('pages/dashboard/activity', {
            title: 'Activity Feed',
            sessions,
            pagination: {
                current: page,
                total: totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });
        
    } catch (error) {
        console.error('Activity feed error:', error);
        req.flash('error', 'Failed to load activity');
        res.redirect('/dashboard');
    }
});

/**
 * GET /dashboard/achievements
 * User achievements and progress
 */
router.get('/achievements', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId)
            .select('achievements points level stats');
        
        // All available achievements
        const allAchievements = [
            { id: 'first_skill', name: 'Skill Sharer', description: 'Added your first skill', icon: '🎯', points: 10 },
            { id: 'multi_talented', name: 'Multi-Talented', description: 'Added 5 skills', icon: '🌟', points: 25 },
            { id: 'eager_learner', name: 'Eager Learner', description: 'Set your first learning goal', icon: '📚', points: 10 },
            { id: 'session_seeker', name: 'Session Seeker', description: 'Requested your first session', icon: '🔍', points: 15 },
            { id: 'first_session', name: 'First Exchange', description: 'Completed your first session', icon: '🤝', points: 20 },
            { id: 'five_sessions', name: 'Regular Learner', description: 'Completed 5 sessions', icon: '📈', points: 50 },
            { id: 'ten_sessions', name: 'Dedicated Student', description: 'Completed 10 sessions', icon: '🎓', points: 100 },
            { id: 'first_tutor', name: 'First Teaching', description: 'Hosted your first session as tutor', icon: '👨‍🏫', points: 25 },
            { id: 'five_tutoring', name: 'Rising Mentor', description: 'Hosted 5 tutoring sessions', icon: '⭐', points: 75 },
            { id: 'ten_tutoring', name: 'Expert Mentor', description: 'Hosted 10 tutoring sessions', icon: '🏆', points: 150 },
            { id: 'first_review', name: 'First Review', description: 'Left your first review', icon: '✍️', points: 10 },
            { id: 'ten_reviews', name: 'Dedicated Reviewer', description: 'Left 10 reviews', icon: '📝', points: 50 },
            { id: 'five_star', name: 'Five Star Tutor', description: 'Received a 5-star review', icon: '⭐', points: 30 },
            { id: 'community_helper', name: 'Community Helper', description: 'Helped 10 different students', icon: '🤗', points: 100 }
        ];
        
        // Mark earned achievements
        const earnedIds = new Set(user.achievements.map(a => a.achievementId));
        const achievements = allAchievements.map(a => ({
            ...a,
            earned: earnedIds.has(a.id),
            earnedAt: user.achievements.find(ua => ua.achievementId === a.id)?.earnedAt
        }));
        
        res.render('pages/dashboard/achievements', {
            title: 'Achievements',
            user,
            achievements,
            earnedCount: earnedIds.size,
            totalCount: allAchievements.length,
            progress: Math.round((earnedIds.size / allAchievements.length) * 100)
        });
        
    } catch (error) {
        console.error('Achievements error:', error);
        req.flash('error', 'Failed to load achievements');
        res.redirect('/dashboard');
    }
});

/**
 * GET /dashboard/calendar
 * Calendar view of sessions
 */
router.get('/calendar', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const month = parseInt(req.query.month) || new Date().getMonth();
        const year = parseInt(req.query.year) || new Date().getFullYear();
        
        // Get sessions for the month
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0, 23, 59, 59);
        
        const sessions = await Session.find({
            $or: [{ tutor: userId }, { student: userId }],
            scheduledDate: { $gte: startDate, $lte: endDate },
            status: { $in: ['pending', 'confirmed', 'completed'] }
        })
        .populate('tutor student', 'firstName lastName username')
        .sort('scheduledDate');
        
        // Group sessions by day
        const sessionsByDay = {};
        sessions.forEach(session => {
            const day = session.scheduledDate.getDate();
            if (!sessionsByDay[day]) sessionsByDay[day] = [];
            sessionsByDay[day].push(session);
        });
        
        res.render('pages/dashboard/calendar', {
            title: 'Session Calendar',
            month,
            year,
            sessionsByDay,
            sessions
        });
        
    } catch (error) {
        console.error('Calendar error:', error);
        req.flash('error', 'Failed to load calendar');
        res.redirect('/dashboard');
    }
});

/**
 * GET /dashboard/notifications
 * User notifications and alerts
 */
router.get('/notifications', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        
        // Get recent session updates, reviews, and messages
        const [pendingSessions, newReviews, recentMessages] = await Promise.all([
            // Pending sessions requiring action
            Session.find({
                $or: [
                    { student: userId, status: 'pending' },
                    { tutor: userId, status: 'confirmed', scheduledDate: { $lte: new Date(Date.now() + 24 * 60 * 60 * 1000) } }
                ]
            })
            .populate('tutor student', 'firstName lastName username')
            .sort('scheduledDate')
            .limit(10),
            
            // Reviews in last 7 days
            Review.find({
                reviewee: userId,
                createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            })
            .populate('reviewer', 'firstName lastName username')
            .sort('-createdAt')
            .limit(5),
            
            // Recent unread messages
            Message.find({
                recipient: userId,
                'readBy.user': { $ne: userId }
            })
            .populate('sender', 'firstName lastName username avatar')
            .sort('-createdAt')
            .limit(10)
        ]);
        
        res.render('pages/dashboard/notifications', {
            title: 'Notifications',
            pendingSessions,
            newReviews,
            recentMessages
        });
        
    } catch (error) {
        console.error('Notifications error:', error);
        req.flash('error', 'Failed to load notifications');
        res.redirect('/dashboard');
    }
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get suggested skill matches for user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Suggested users
 */
async function getSuggestedMatches(userId) {
    try {
        const user = await User.findById(userId).select('skillsOffered skillsSought');
        
        if (!user) return [];
        
        // Get skills user wants to learn
        const soughtSkillNames = user.skillsSought.map(s => s.name.toLowerCase());
        
        if (soughtSkillNames.length === 0) return [];
        
        // Find users who offer these skills
        const matches = await User.find({
            _id: { $ne: userId },
            status: 'active',
            'skillsOffered.name': { 
                $regex: soughtSkillNames.join('|'), 
                $options: 'i' 
            }
        })
        .select('firstName lastName username avatar skillsOffered stats.averageRating')
        .sort('-stats.averageRating')
        .limit(5);
        
        return matches;
        
    } catch (error) {
        console.error('Error getting suggested matches:', error);
        return [];
    }
}

/**
 * Get dashboard statistics for user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Statistics object
 */
async function getDashboardStats(userId) {
    try {
        const [sessionStats, reviewStats] = await Promise.all([
            // Session statistics
            Session.aggregate([
                { 
                    $match: { 
                        $or: [{ tutor: userId }, { student: userId }] 
                    } 
                },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        totalHours: { $sum: { $divide: ['$duration', 60] } }
                    }
                }
            ]),
            
            // Review statistics
            Review.aggregate([
                { $match: { reviewee: userId, status: 'approved' } },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 },
                        avgRating: { $avg: '$rating.overall' }
                    }
                }
            ])
        ]);
        
        // Process session stats
        const stats = {
            pending: 0,
            confirmed: 0,
            completed: 0,
            cancelled: 0,
            totalHours: 0,
            reviewCount: reviewStats[0]?.count || 0,
            avgRating: reviewStats[0]?.avgRating?.toFixed(1) || 'N/A'
        };
        
        sessionStats.forEach(s => {
            stats[s._id] = s.count;
            if (s._id === 'completed') {
                stats.totalHours = s.totalHours?.toFixed(1) || 0;
            }
        });
        
        return stats;
        
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        return {
            pending: 0,
            confirmed: 0,
            completed: 0,
            cancelled: 0,
            totalHours: 0,
            reviewCount: 0,
            avgRating: 'N/A'
        };
    }
}

module.exports = router;
