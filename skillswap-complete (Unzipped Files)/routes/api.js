/**
 * API Routes
 * REST API endpoints for AJAX requests
 * 
 * @module routes/api
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { User, Session, Review, Message, Conversation, AuditLog } = require('../models');

// =============================================================================
// USERS API
// =============================================================================

/**
 * GET /api/users/search
 * Search users by name or username
 */
router.get('/users/search', isAuthenticated, async (req, res) => {
    try {
        const { q, limit = 10 } = req.query;
        
        if (!q || q.length < 2) {
            return res.json({ success: true, users: [] });
        }
        
        const users = await User.find({
            status: 'active',
            $or: [
                { firstName: { $regex: q, $options: 'i' } },
                { lastName: { $regex: q, $options: 'i' } },
                { username: { $regex: q, $options: 'i' } }
            ]
        })
        .select('firstName lastName username avatar')
        .limit(Math.min(parseInt(limit), 20));
        
        res.json({ success: true, users });
        
    } catch (error) {
        console.error('User search error:', error);
        res.status(500).json({ success: false, error: 'Search failed' });
    }
});

/**
 * GET /api/users/:userId
 * Get user public profile
 */
router.get('/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, error: 'Invalid user ID' });
        }
        
        const user = await User.findById(userId)
            .select('firstName lastName username avatar bio skillsOffered stats.averageRating stats.sessionsHosted');
        
        if (!user || user.status === 'deactivated') {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        res.json({ success: true, user });
        
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ success: false, error: 'Failed to get user' });
    }
});

/**
 * GET /api/users/:userId/availability
 * Get user's availability
 */
router.get('/users/:userId/availability', isAuthenticated, async (req, res) => {
    try {
        const { userId } = req.params;
        const { start, end } = req.query;
        
        // Get user's scheduled sessions in date range
        const sessions = await Session.find({
            $or: [{ tutor: userId }, { student: userId }],
            status: { $in: ['pending', 'confirmed'] },
            scheduledDate: {
                $gte: new Date(start),
                $lte: new Date(end)
            }
        })
        .select('scheduledDate duration');
        
        // Convert to busy slots
        const busySlots = sessions.map(s => ({
            start: s.scheduledDate,
            end: new Date(s.scheduledDate.getTime() + s.duration * 60000)
        }));
        
        res.json({ success: true, busySlots });
        
    } catch (error) {
        console.error('Availability error:', error);
        res.status(500).json({ success: false, error: 'Failed to get availability' });
    }
});

// =============================================================================
// SKILLS API
// =============================================================================

/**
 * GET /api/skills/search
 * Search skills
 */
router.get('/skills/search', async (req, res) => {
    try {
        const { q, category, limit = 20 } = req.query;
        
        const matchStage = { status: 'active' };
        if (category) matchStage['skillsOffered.category'] = category;
        
        const pipeline = [
            { $match: matchStage },
            { $unwind: '$skillsOffered' }
        ];
        
        if (q) {
            pipeline.push({
                $match: {
                    'skillsOffered.name': { $regex: q, $options: 'i' }
                }
            });
        }
        
        pipeline.push(
            { $group: {
                _id: { $toLower: '$skillsOffered.name' },
                name: { $first: '$skillsOffered.name' },
                category: { $first: '$skillsOffered.category' },
                count: { $sum: 1 }
            }},
            { $sort: { count: -1 } },
            { $limit: parseInt(limit) }
        );
        
        const skills = await User.aggregate(pipeline);
        
        res.json({ success: true, skills });
        
    } catch (error) {
        console.error('Skills search error:', error);
        res.status(500).json({ success: false, error: 'Search failed' });
    }
});

/**
 * GET /api/skills/popular
 * Get popular skills
 */
router.get('/skills/popular', async (req, res) => {
    try {
        const { category, limit = 10 } = req.query;
        
        const matchStage = { status: 'active' };
        if (category) matchStage['skillsOffered.category'] = category;
        
        const skills = await User.aggregate([
            { $match: matchStage },
            { $unwind: '$skillsOffered' },
            { $group: {
                _id: { $toLower: '$skillsOffered.name' },
                name: { $first: '$skillsOffered.name' },
                category: { $first: '$skillsOffered.category' },
                tutorCount: { $sum: 1 }
            }},
            { $sort: { tutorCount: -1 } },
            { $limit: parseInt(limit) }
        ]);
        
        res.json({ success: true, skills });
        
    } catch (error) {
        console.error('Popular skills error:', error);
        res.status(500).json({ success: false, error: 'Failed to get skills' });
    }
});

// =============================================================================
// SESSIONS API
// =============================================================================

/**
 * GET /api/sessions
 * Get user's sessions
 */
router.get('/sessions', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const { status, role, page = 1, limit = 10 } = req.query;
        
        const query = {
            $or: [{ tutor: userId }, { student: userId }]
        };
        
        if (status) query.status = status;
        if (role === 'tutor') query.tutor = userId;
        if (role === 'student') query.student = userId;
        
        const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
        
        const [sessions, total] = await Promise.all([
            Session.find(query)
                .populate('tutor student', 'firstName lastName username avatar')
                .sort('-scheduledDate')
                .skip(skip)
                .limit(parseInt(limit)),
            Session.countDocuments(query)
        ]);
        
        res.json({
            success: true,
            sessions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
        
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ success: false, error: 'Failed to get sessions' });
    }
});

/**
 * GET /api/sessions/upcoming
 * Get upcoming sessions
 */
router.get('/sessions/upcoming', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const { days = 7 } = req.query;
        
        const sessions = await Session.find({
            $or: [{ tutor: userId }, { student: userId }],
            status: { $in: ['pending', 'confirmed'] },
            scheduledDate: {
                $gte: new Date(),
                $lte: new Date(Date.now() + parseInt(days) * 24 * 60 * 60 * 1000)
            }
        })
        .populate('tutor student', 'firstName lastName username avatar')
        .sort('scheduledDate')
        .limit(10);
        
        res.json({ success: true, sessions });
        
    } catch (error) {
        console.error('Upcoming sessions error:', error);
        res.status(500).json({ success: false, error: 'Failed to get sessions' });
    }
});

// =============================================================================
// REVIEWS API
// =============================================================================

/**
 * GET /api/reviews/:userId
 * Get reviews for a user
 */
router.get('/reviews/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, error: 'Invalid user ID' });
        }
        
        const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
        
        const [reviews, total, stats] = await Promise.all([
            Review.find({ reviewee: userId, status: 'approved' })
                .populate('reviewer', 'firstName lastName username avatar')
                .sort('-createdAt')
                .skip(skip)
                .limit(parseInt(limit)),
            Review.countDocuments({ reviewee: userId, status: 'approved' }),
            Review.getStatsForUser(userId)
        ]);
        
        res.json({
            success: true,
            reviews,
            stats,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
        
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({ success: false, error: 'Failed to get reviews' });
    }
});

// =============================================================================
// NOTIFICATIONS API
// =============================================================================

/**
 * GET /api/notifications/count
 * Get notification counts
 */
router.get('/notifications/count', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        
        const [unreadMessages, pendingSessions] = await Promise.all([
            // Unread message count
            Conversation.aggregate([
                { $match: { participants: new mongoose.Types.ObjectId(userId) } },
                { $project: { unread: { $ifNull: [`$unreadCount.${userId}`, 0] } } },
                { $group: { _id: null, total: { $sum: '$unread' } } }
            ]),
            
            // Pending sessions requiring action
            Session.countDocuments({
                $or: [
                    { student: userId, status: 'pending' },
                    { tutor: userId, status: 'pending' }
                ]
            })
        ]);
        
        res.json({
            success: true,
            counts: {
                messages: unreadMessages[0]?.total || 0,
                sessions: pendingSessions,
                total: (unreadMessages[0]?.total || 0) + pendingSessions
            }
        });
        
    } catch (error) {
        console.error('Notification count error:', error);
        res.status(500).json({ success: false, error: 'Failed to get counts' });
    }
});

// =============================================================================
// STATS API
// =============================================================================

/**
 * GET /api/stats/overview
 * Get platform overview stats (public)
 */
router.get('/stats/overview', async (req, res) => {
    try {
        const [userCount, sessionCount, skillCount, reviewCount] = await Promise.all([
            User.countDocuments({ status: 'active' }),
            Session.countDocuments({ status: 'completed' }),
            User.aggregate([
                { $match: { status: 'active' } },
                { $project: { count: { $size: { $ifNull: ['$skillsOffered', []] } } } },
                { $group: { _id: null, total: { $sum: '$count' } } }
            ]),
            Review.countDocuments({ status: 'approved' })
        ]);
        
        res.json({
            success: true,
            stats: {
                users: userCount,
                sessions: sessionCount,
                skills: skillCount[0]?.total || 0,
                reviews: reviewCount
            }
        });
        
    } catch (error) {
        console.error('Stats overview error:', error);
        res.status(500).json({ success: false, error: 'Failed to get stats' });
    }
});

/**
 * GET /api/stats/user
 * Get current user's stats
 */
router.get('/stats/user', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        
        const [user, sessionStats, reviewStats] = await Promise.all([
            User.findById(userId).select('points level achievements stats'),
            
            Session.aggregate([
                { $match: { $or: [{ tutor: userId }, { student: userId }] } },
                { $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    hours: { $sum: { $cond: [
                        { $eq: ['$status', 'completed'] },
                        { $divide: ['$duration', 60] },
                        0
                    ]}}
                }}
            ]),
            
            Review.aggregate([
                { $match: { reviewee: userId, status: 'approved' } },
                { $group: {
                    _id: null,
                    count: { $sum: 1 },
                    avgRating: { $avg: '$rating.overall' }
                }}
            ])
        ]);
        
        // Process session stats
        const sessions = {
            pending: 0,
            confirmed: 0,
            completed: 0,
            cancelled: 0,
            totalHours: 0
        };
        
        sessionStats.forEach(s => {
            sessions[s._id] = s.count;
            sessions.totalHours += s.hours || 0;
        });
        
        res.json({
            success: true,
            stats: {
                points: user.points,
                level: user.level,
                achievementCount: user.achievements.length,
                sessions,
                reviews: {
                    count: reviewStats[0]?.count || 0,
                    avgRating: reviewStats[0]?.avgRating?.toFixed(2) || null
                }
            }
        });
        
    } catch (error) {
        console.error('User stats error:', error);
        res.status(500).json({ success: false, error: 'Failed to get stats' });
    }
});

// =============================================================================
// HEALTH CHECK
// =============================================================================

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    res.json({
        success: true,
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: dbStatus,
        uptime: process.uptime()
    });
});

// =============================================================================
// ADMIN API (Requires admin role)
// =============================================================================

/**
 * GET /api/admin/stats
 * Get admin dashboard stats
 */
router.get('/admin/stats', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
        
        const [
            totalUsers,
            newUsersToday,
            newUsersWeek,
            totalSessions,
            sessionsToday,
            sessionsWeek,
            pendingReviews,
            recentAuditLogs
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ createdAt: { $gte: todayStart } }),
            User.countDocuments({ createdAt: { $gte: weekAgo } }),
            Session.countDocuments(),
            Session.countDocuments({ createdAt: { $gte: todayStart } }),
            Session.countDocuments({ createdAt: { $gte: weekAgo } }),
            Review.countDocuments({ status: 'pending' }),
            AuditLog.countDocuments({ createdAt: { $gte: todayStart } })
        ]);
        
        res.json({
            success: true,
            stats: {
                users: { total: totalUsers, today: newUsersToday, week: newUsersWeek },
                sessions: { total: totalSessions, today: sessionsToday, week: sessionsWeek },
                reviews: { pending: pendingReviews },
                auditLogs: { today: recentAuditLogs }
            }
        });
        
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ success: false, error: 'Failed to get stats' });
    }
});

module.exports = router;
