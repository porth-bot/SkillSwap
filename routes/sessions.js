// routes/sessions.js
const express = require('express');
const router = express.Router();
const { User, Session } = require('../models');
const { isAuthenticated } = require('../middleware');

// GET /sessions - list user sessions
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const sessions = await Session.find({
            $or: [
                { tutor: req.session.userId },
                { student: req.session.userId }
            ]
        }).populate('tutor student').sort('-createdAt');

        res.render('pages/sessions/index', {
            title: 'My Sessions',
            sessions,
            filter: req.query.filter || 'all'
        });
    } catch (err) {
        console.error(err);
        res.redirect('/dashboard');
    }
});

// GET /sessions/request/:userId - request session form
router.get('/request/:userId', isAuthenticated, async (req, res) => {
    try {
        const tutor = await User.findById(req.params.userId);
        if (!tutor) {
            req.flash('error', 'User not found');
            return res.redirect('/explore');
        }
        res.render('pages/sessions/request', {
            title: 'Request Session',
            tutor
        });
    } catch (err) {
        res.redirect('/explore');
    }
});

// POST /sessions/request/:userId - create session request
router.post('/request/:userId', isAuthenticated, async (req, res) => {
    try {
        const session = new Session({
            tutor: req.params.userId,
            student: req.session.userId,
            skill: req.body.skill,
            scheduledDate: req.body.scheduledDate,
            duration: req.body.duration || 60,
            location: req.body.location,
            notes: req.body.notes,
            status: 'pending'
        });
        await session.save();
        req.flash('success', 'Session requested');
        res.redirect('/sessions');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Failed to create session');
        res.redirect('back');
    }
});

// POST /sessions/:id/accept
router.post('/:id/accept', isAuthenticated, async (req, res) => {
    try {
        const session = await Session.findById(req.params.id);
        if (session.tutor.toString() !== req.session.userId) {
            req.flash('error', 'Not authorized');
            return res.redirect('/sessions');
        }
        session.status = 'scheduled';
        await session.save();
        req.flash('success', 'Session accepted');
        res.redirect('/sessions');
    } catch (err) {
        req.flash('error', 'Failed to accept');
        res.redirect('/sessions');
    }
});

// POST /sessions/:id/decline
router.post('/:id/decline', isAuthenticated, async (req, res) => {
    try {
        const session = await Session.findById(req.params.id);
        session.status = 'cancelled';
        await session.save();
        req.flash('success', 'Session declined');
        res.redirect('/sessions');
    } catch (err) {
        req.flash('error', 'Failed');
        res.redirect('/sessions');
    }
});

// POST /sessions/:id/complete
router.post('/:id/complete', isAuthenticated, async (req, res) => {
    try {
        const session = await Session.findById(req.params.id);
        session.status = 'completed';
        await session.save();
        req.flash('success', 'Session completed');
        res.redirect('/sessions');
    } catch (err) {
        req.flash('error', 'Failed');
        res.redirect('/sessions');
    }
});

// POST /sessions/:id/cancel
router.post('/:id/cancel', isAuthenticated, async (req, res) => {
    try {
        const session = await Session.findById(req.params.id);
        session.status = 'cancelled';
        await session.save();
        req.flash('success', 'Session cancelled');
        res.redirect('/sessions');
    } catch (err) {
        req.flash('error', 'Failed');
        res.redirect('/sessions');
    }
});

module.exports = router;
