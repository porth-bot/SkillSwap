// routes/dashboard.js
const express = require('express');
const router = express.Router();
const { User, Session, Message } = require('../models');
const { isAuthenticated } = require('../middleware');

router.get('/', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const sessions = await Session.find({
            $or: [{ tutor: user._id }, { student: user._id }]
        }).populate('tutor student').limit(5).sort('-createdAt');

        const unreadMessages = await Message.countDocuments({
            receiver: user._id,
            read: false
        });

        res.render('pages/dashboard/index', {
            title: 'Dashboard',
            user,
            sessions,
            unreadMessages,
            stats: {
                sessionsCompleted: sessions.filter(s => s.status === 'completed').length,
                upcomingSessions: sessions.filter(s => s.status === 'scheduled').length,
                pendingRequests: sessions.filter(s => s.status === 'pending').length
            }
        });
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
});

module.exports = router;
