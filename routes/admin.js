/**
 * Admin Routes - SkillSwap Student Talent Exchange Platform
 * 
 * Comprehensive admin panel for monitoring and management.
 */

const express = require('express');
const router = express.Router();
const { User, Session, Review, AuditLog, Conversation, Message } = require('../models');
const { isAdmin, validateAdminUserEdit, validateMongoId } = require('../middleware');

// All admin routes require admin role
router.use(isAdmin);

/**
 * GET /admin - Admin dashboard
 */
router.get('/', async (req, res) => {
    try {
        // Get overview stats
        const userCount = await User.countDocuments();
        const activeUsers = await User.countDocuments({ isActive: true });
        const sessionCount = await Session.countDocuments();
        const completedSessions = await Session.countDocuments({ status: 'completed' });
        const reviewCount = await Review.countDocuments();
        
        // Get recent activity
        const recentUsers = await User.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('firstName lastName email createdAt');
        
        const recentSessions = await Session.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('tutor', 'firstName lastName username')
            .populate('student', 'firstName lastName username');
        
        // Get audit log summary
        const auditSummary = await AuditLog.getSummary(
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            new Date()
        );
        
        // Get sessions by status
        const sessionsByStatus = await Session.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);
        
        // Get users by role
        const usersByRole = await User.aggregate([
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 }
                }
            }
        ]);
        
        // Get skill category distribution
        const skillDistribution = await User.aggregate([
            { $unwind: '$skillsOffered' },
            {
                $group: {
                    _id: '$skillsOffered.category',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);
        
        // Log admin view
        await AuditLog.logAdmin('ADMIN_USER_VIEW', req.user, null, 'Admin dashboard accessed');
        
        res.render('admin/dashboard', {
            title: 'Admin Dashboard - SkillSwap',
            stats: {
                userCount,
                activeUsers,
                sessionCount,
                completedSessions,
                reviewCount
            },
            recentUsers,
            recentSessions,
            auditSummary,
            sessionsByStatus,
            usersByRole,
            skillDistribution
        });
        
    } catch (error) {
        console.error('Admin dashboard error:', error);
        req.session.flash = {
            type: 'error',
            message: 'Failed to load admin dashboard'
        };
        res.redirect('/dashboard');
    }
});

/**
 * GET /admin/users - User management
 */
router.get('/users', async (req, res) => {
    try {
        const { page = 1, limit = 20, search, role, status } = req.query;
        
        const query = {};
        
        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (role && role !== 'all') {
            query.role = role;
        }
        
        if (status === 'active') {
            query.isActive = true;
        } else if (status === 'inactive') {
            query.isActive = false;
        }
        
        const users = await User.find(query)
            .sort({ createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .select('-password');
        
        const total = await User.countDocuments(query);
        
        res.render('admin/users', {
            title: 'User Management - SkillSwap Admin',
            users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            },
            filters: { search, role, status }
        });
        
    } catch (error) {
        console.error('Admin users error:', error);
        req.session.flash = {
            type: 'error',
            message: 'Failed to load users'
        };
        res.redirect('/admin');
    }
});

/**
 * GET /admin/users/:id - View user details
 */
router.get('/users/:id', validateMongoId(), async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        
        if (!user) {
            req.session.flash = {
                type: 'error',
                message: 'User not found'
            };
            return res.redirect('/admin/users');
        }
        
        // Get user's sessions
        const sessions = await Session.find({
            $or: [{ tutor: user._id }, { student: user._id }]
        })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('tutor', 'firstName lastName username')
        .populate('student', 'firstName lastName username');
        
        // Get user's reviews
        const reviewsReceived = await Review.find({ reviewee: user._id })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('reviewer', 'firstName lastName username');
        
        // Get user's audit logs
        const auditLogs = await AuditLog.find({ user: user._id })
            .sort({ createdAt: -1 })
            .limit(20);
        
        // Log admin view
        await AuditLog.logAdmin(
            'ADMIN_USER_VIEW',
            req.user,
            user,
            `Admin viewed user profile: ${user.email}`
        );
        
        res.render('admin/user-detail', {
            title: `${user.fullName} - Admin - SkillSwap`,
            targetUser: user,
            sessions,
            reviewsReceived,
            auditLogs
        });
        
    } catch (error) {
        console.error('Admin user detail error:', error);
        req.session.flash = {
            type: 'error',
            message: 'Failed to load user details'
        };
        res.redirect('/admin/users');
    }
});

/**
 * POST /admin/users/:id - Update user
 */
router.post('/users/:id', validateMongoId(), validateAdminUserEdit, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        const previousValues = {
            role: user.role,
            isActive: user.isActive,
            isVerified: user.isVerified
        };
        
        // Update allowed fields
        if (req.body.role !== undefined) user.role = req.body.role;
        if (req.body.isActive !== undefined) user.isActive = req.body.isActive;
        if (req.body.isVerified !== undefined) user.isVerified = req.body.isVerified;
        
        await user.save();
        
        // Log admin action
        await AuditLog.logAdmin(
            'ADMIN_USER_EDIT',
            req.user,
            user,
            `Admin updated user: ${user.email}`,
            {
                previousValues,
                newValues: req.body
            }
        );
        
        res.json({
            success: true,
            message: 'User updated successfully'
        });
        
    } catch (error) {
        console.error('Admin user update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user'
        });
    }
});

/**
 * DELETE /admin/users/:id - Delete user (soft delete)
 */
router.delete('/users/:id', validateMongoId(), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Prevent deleting self
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'You cannot delete your own account'
            });
        }
        
        // Soft delete (deactivate)
        user.isActive = false;
        await user.save();
        
        // Log admin action
        await AuditLog.logAdmin(
            'ADMIN_USER_DELETE',
            req.user,
            user,
            `Admin deactivated user: ${user.email}`
        );
        
        res.json({
            success: true,
            message: 'User deactivated successfully'
        });
        
    } catch (error) {
        console.error('Admin user delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user'
        });
    }
});

/**
 * GET /admin/sessions - Session management
 */
router.get('/sessions', async (req, res) => {
    try {
        const { page = 1, limit = 20, status, dateFrom, dateTo } = req.query;
        
        const query = {};
        
        if (status && status !== 'all') {
            query.status = status;
        }
        
        if (dateFrom || dateTo) {
            query.scheduledDate = {};
            if (dateFrom) query.scheduledDate.$gte = new Date(dateFrom);
            if (dateTo) query.scheduledDate.$lte = new Date(dateTo);
        }
        
        const sessions = await Session.find(query)
            .sort({ createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .populate('tutor', 'firstName lastName username email')
            .populate('student', 'firstName lastName username email');
        
        const total = await Session.countDocuments(query);
        
        // Get stats
        const stats = {
            total: await Session.countDocuments(),
            pending: await Session.countDocuments({ status: 'pending' }),
            confirmed: await Session.countDocuments({ status: 'confirmed' }),
            completed: await Session.countDocuments({ status: 'completed' }),
            cancelled: await Session.countDocuments({ status: 'cancelled' })
        };
        
        res.render('admin/sessions', {
            title: 'Session Management - SkillSwap Admin',
            sessions,
            stats,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            },
            filters: { status, dateFrom, dateTo }
        });
        
    } catch (error) {
        console.error('Admin sessions error:', error);
        req.session.flash = {
            type: 'error',
            message: 'Failed to load sessions'
        };
        res.redirect('/admin');
    }
});

/**
 * GET /admin/reviews - Review moderation
 */
router.get('/reviews', async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        
        const query = {};
        
        if (status && status !== 'all') {
            query.moderationStatus = status;
        }
        
        const reviews = await Review.find(query)
            .sort({ createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .populate('reviewer', 'firstName lastName username')
            .populate('reviewee', 'firstName lastName username')
            .populate('session', 'title');
        
        const total = await Review.countDocuments(query);
        
        // Get moderation stats
        const stats = {
            total: await Review.countDocuments(),
            pending: await Review.countDocuments({ moderationStatus: 'pending' }),
            approved: await Review.countDocuments({ moderationStatus: 'approved' }),
            flagged: await Review.countDocuments({ moderationStatus: 'flagged' }),
            removed: await Review.countDocuments({ moderationStatus: 'removed' })
        };
        
        res.render('admin/reviews', {
            title: 'Review Moderation - SkillSwap Admin',
            reviews,
            stats,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            },
            filters: { status }
        });
        
    } catch (error) {
        console.error('Admin reviews error:', error);
        req.session.flash = {
            type: 'error',
            message: 'Failed to load reviews'
        };
        res.redirect('/admin');
    }
});

/**
 * POST /admin/reviews/:id/moderate - Moderate review
 */
router.post('/reviews/:id/moderate', validateMongoId(), async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }
        
        const { action, note } = req.body;
        
        if (!['approve', 'remove', 'flag'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid action'
            });
        }
        
        const previousStatus = review.moderationStatus;
        
        switch (action) {
            case 'approve':
                review.moderationStatus = 'approved';
                review.isApproved = true;
                break;
            case 'remove':
                review.moderationStatus = 'removed';
                review.isApproved = false;
                break;
            case 'flag':
                review.moderationStatus = 'flagged';
                review.isApproved = false;
                break;
        }
        
        review.moderationNote = note;
        review.moderatedBy = req.user._id;
        review.moderatedAt = new Date();
        
        await review.save();
        
        // Log moderation action
        await AuditLog.logAdmin(
            'ADMIN_CONTENT_MODERATE',
            req.user,
            review,
            `Review moderated: ${action}`,
            {
                previousStatus,
                newStatus: review.moderationStatus,
                note
            }
        );
        
        res.json({
            success: true,
            message: `Review ${action}d successfully`
        });
        
    } catch (error) {
        console.error('Admin review moderate error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to moderate review'
        });
    }
});

/**
 * GET /admin/reports - Reports and analytics
 */
router.get('/reports', async (req, res) => {
    try {
        const { startDate, endDate, reportType } = req.query;
        
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();
        
        // User growth over time
        const userGrowth = await User.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        // Session activity
        const sessionActivity = await Session.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end }
                }
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        status: '$status'
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.date': 1 } }
        ]);
        
        // Top tutors
        const topTutors = await Session.aggregate([
            {
                $match: {
                    status: 'completed',
                    createdAt: { $gte: start, $lte: end }
                }
            },
            {
                $group: {
                    _id: '$tutor',
                    sessionsCompleted: { $sum: 1 },
                    totalDuration: { $sum: '$duration' }
                }
            },
            { $sort: { sessionsCompleted: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'tutor'
                }
            },
            { $unwind: '$tutor' }
        ]);
        
        // Most requested skills
        const popularSkills = await Session.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end }
                }
            },
            {
                $group: {
                    _id: {
                        name: '$skill.name',
                        category: '$skill.category'
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 15 }
        ]);
        
        // Review statistics
        const reviewStats = await Review.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end },
                    isApproved: true
                }
            },
            {
                $group: {
                    _id: null,
                    totalReviews: { $sum: 1 },
                    averageRating: { $avg: '$ratings.overall' },
                    recommendRate: {
                        $avg: { $cond: ['$wouldRecommend', 1, 0] }
                    }
                }
            }
        ]);
        
        // Log report generation
        await AuditLog.logAdmin(
            'ADMIN_REPORT_GENERATE',
            req.user,
            null,
            `Report generated for ${start.toDateString()} to ${end.toDateString()}`
        );
        
        res.render('admin/reports', {
            title: 'Reports & Analytics - SkillSwap Admin',
            dateRange: { start, end },
            userGrowth,
            sessionActivity,
            topTutors,
            popularSkills,
            reviewStats: reviewStats[0] || {}
        });
        
    } catch (error) {
        console.error('Admin reports error:', error);
        req.session.flash = {
            type: 'error',
            message: 'Failed to generate reports'
        };
        res.redirect('/admin');
    }
});

/**
 * GET /admin/audit-logs - View audit logs
 */
router.get('/audit-logs', async (req, res) => {
    try {
        const { page = 1, limit = 50, category, action, severity, startDate, endDate } = req.query;
        
        const filters = {};
        if (category) filters.category = category;
        if (action) filters.action = action;
        if (severity) filters.severity = severity;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        
        const logs = await AuditLog.getLogs(filters, {
            limit: parseInt(limit),
            skip: (parseInt(page) - 1) * parseInt(limit)
        });
        
        const total = await AuditLog.countDocuments(filters);
        
        // Get unique values for filters
        const categories = await AuditLog.distinct('category');
        const actions = await AuditLog.distinct('action');
        const severities = await AuditLog.distinct('severity');
        
        res.render('admin/audit-logs', {
            title: 'Audit Logs - SkillSwap Admin',
            logs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            },
            filters,
            filterOptions: { categories, actions, severities }
        });
        
    } catch (error) {
        console.error('Admin audit logs error:', error);
        req.session.flash = {
            type: 'error',
            message: 'Failed to load audit logs'
        };
        res.redirect('/admin');
    }
});

/**
 * GET /admin/export/:type - Export data
 */
router.get('/export/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const { format = 'json' } = req.query;
        
        let data;
        let filename;
        
        switch (type) {
            case 'users':
                data = await User.find().select('-password').lean();
                filename = 'users';
                break;
            case 'sessions':
                data = await Session.find()
                    .populate('tutor', 'firstName lastName email')
                    .populate('student', 'firstName lastName email')
                    .lean();
                filename = 'sessions';
                break;
            case 'reviews':
                data = await Review.find()
                    .populate('reviewer', 'firstName lastName email')
                    .populate('reviewee', 'firstName lastName email')
                    .lean();
                filename = 'reviews';
                break;
            case 'audit-logs':
                data = await AuditLog.find().lean();
                filename = 'audit-logs';
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid export type'
                });
        }
        
        // Log export
        await AuditLog.logAdmin(
            'DATA_EXPORT',
            req.user,
            null,
            `Data exported: ${type} (${format})`,
            { recordCount: data.length }
        );
        
        if (format === 'csv') {
            // Convert to CSV (basic implementation)
            const csv = convertToCSV(data);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}-${Date.now()}.csv"`);
            res.send(csv);
        } else {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}-${Date.now()}.json"`);
            res.json(data);
        }
        
    } catch (error) {
        console.error('Admin export error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export data'
        });
    }
});

// Helper function to convert JSON to CSV
function convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];
            const escaped = String(value).replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
}

module.exports = router;
