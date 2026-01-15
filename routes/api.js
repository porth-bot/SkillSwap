// routes/api.js
const express = require('express');
const router = express.Router();
const { User, Session, Review, Message } = require('../models');

// GET /api/users
router.get('/users', async (req, res) => {
    try {
        const users = await User.find({ isActive: true })
            .select('firstName lastName username skillsOffered')
            .limit(20);
        res.json({ success: true, users });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/users/:id
router.get('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ success: false, error: 'Not found' });
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/search
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json({ results: [] });

        const users = await User.find({
            isActive: true,
            $or: [
                { firstName: new RegExp(q, 'i') },
                { lastName: new RegExp(q, 'i') },
                { 'skillsOffered.name': new RegExp(q, 'i') }
            ]
        }).limit(10);

        res.json({
            results: users.map(u => ({
                name: u.firstName + ' ' + u.lastName,
                url: '/profile/' + u.username
            }))
        });
    } catch (err) {
        res.status(500).json({ results: [] });
    }
});

// GET /api/stats
router.get('/stats', async (req, res) => {
    try {
        res.json({
            users: await User.countDocuments(),
            sessions: await Session.countDocuments(),
            reviews: await Review.countDocuments()
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
