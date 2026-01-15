// routes/admin.js
const express = require('express');
const router = express.Router();
const { User, Session, Review, Message } = require('../models');
const { isAuthenticated, isAdmin } = require('../middleware');

// middleware to check admin
router.use(isAuthenticated);
router.use((req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        return next();
    }
    req.flash('error', 'Admin access required');
    res.redirect('/dashboard');
});

// GET /admin
router.get('/', async (req, res) => {
    try {
        const stats = {
            totalUsers: await User.countDocuments(),
            totalSessions: await Session.countDocuments(),
            totalReviews: await Review.countDocuments(),
            newUsersThisWeek: await User.countDocuments({
                createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            }),
            sessionsThisWeek: await Session.countDocuments({
                createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            }),
            averageRating: 4.5,
            activeSkills: 25
        };

        res.render('pages/admin/dashboard', {
            title: 'Admin Dashboard',
            stats,
            recentActivity: [],
            topSkills: []
        });
    } catch (err) {
        console.error(err);
        res.redirect('/dashboard');
    }
});

// GET /admin/users
router.get('/users', async (req, res) => {
    try {
        const users = await User.find().sort('-createdAt').limit(50);
        res.render('pages/admin/users', { title: 'Manage Users', users });
    } catch (err) {
        res.redirect('/admin');
    }
});

// GET /admin/sessions
router.get('/sessions', async (req, res) => {
    try {
        const sessions = await Session.find().populate('tutor student').sort('-createdAt').limit(50);
        res.render('pages/admin/sessions', { title: 'Manage Sessions', sessions });
    } catch (err) {
        res.redirect('/admin');
    }
});

// GET /admin/reviews
router.get('/reviews', async (req, res) => {
    try {
        const reviews = await Review.find().populate('reviewer reviewee').sort('-createdAt').limit(50);
        res.render('pages/admin/reviews', { title: 'Manage Reviews', reviews });
    } catch (err) {
        res.redirect('/admin');
    }
});

// GET /admin/reports
router.get('/reports', async (req, res) => {
    res.render('pages/admin/reports', { title: 'Reports' });
});

// GET /admin/audit
router.get('/audit', async (req, res) => {
    res.render('pages/admin/audit', { title: 'Audit Logs', logs: [] });
});

// POST /admin/users/:id/toggle
router.post('/users/:id/toggle', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        user.isActive = !user.isActive;
        await user.save();
        req.flash('success', 'User updated');
    } catch (err) {
        req.flash('error', 'Failed');
    }
    res.redirect('/admin/users');
});

// DELETE /admin/users/:id
router.delete('/users/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

module.exports = router;
