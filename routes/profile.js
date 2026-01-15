// routes/profile.js
const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { isAuthenticated } = require('../middleware');

// GET /profile
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        res.render('pages/profile/view', {
            title: 'My Profile',
            profile: user,
            isOwnProfile: true,
            reviewStats: { average: 0, count: 0 },
            sessionStats: { completed: 0, total: 0 },
            recentReviews: []
        });
    } catch (err) {
        console.error(err);
        res.redirect('/dashboard');
    }
});

// GET /profile/edit
router.get('/edit', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        res.render('pages/profile/edit', { title: 'Edit Profile', user });
    } catch (err) {
        res.redirect('/profile');
    }
});

// POST /profile/edit
router.post('/edit', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        ['firstName', 'lastName', 'bio', 'grade', 'school'].forEach(field => {
            if (req.body[field]) user[field] = req.body[field];
        });
        await user.save();
        req.flash('success', 'Profile updated');
        res.redirect('/profile');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Update failed');
        res.redirect('/profile/edit');
    }
});

// GET /profile/:username
router.get('/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username });
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/explore');
        }
        res.render('pages/profile/view', {
            title: user.firstName,
            profile: user,
            isOwnProfile: req.session?.userId?.toString() === user._id.toString(),
            reviewStats: { average: 0, count: 0 },
            sessionStats: { completed: 0, total: 0 },
            recentReviews: []
        });
    } catch (err) {
        res.redirect('/explore');
    }
});

// POST /profile/skills/offered
router.post('/skills/offered', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        user.skillsOffered.push(req.body);
        await user.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// DELETE /profile/skills/offered/:index
router.delete('/skills/offered/:index', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        user.skillsOffered.splice(parseInt(req.params.index), 1);
        await user.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// POST /profile/skills/sought
router.post('/skills/sought', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        user.skillsSought.push(req.body);
        await user.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// DELETE /profile/skills/sought/:index
router.delete('/skills/sought/:index', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        user.skillsSought.splice(parseInt(req.params.index), 1);
        await user.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

module.exports = router;
