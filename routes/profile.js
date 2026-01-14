/**
 * Profile Routes - SkillSwap
 */

const express = require('express');
const router = express.Router();
const { User, Review, Session, AuditLog } = require('../models');
const { isAuthenticated } = require('../middleware');

// GET /profile - View own profile
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
    } catch (error) {
        console.error('Profile error:', error);
        res.redirect('/dashboard');
    }
});

// GET /profile/edit
router.get('/edit', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        res.render('pages/profile/edit', {
            title: 'Edit Profile',
            user
        });
    } catch (error) {
        res.redirect('/profile');
    }
});

// POST /profile/edit
router.post('/edit', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        const allowedFields = ['firstName', 'lastName', 'bio', 'grade', 'school'];
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                user[field] = req.body[field];
            }
        });

        await user.save();
        req.flash('success', 'Profile updated');
        res.redirect('/profile');
    } catch (error) {
        console.error('Profile update error:', error);
        req.flash('error', 'Failed to update profile');
        res.redirect('/profile/edit');
    }
});

// GET /profile/:username - View public profile
router.get('/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username, isActive: true });
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/explore');
        }

        const isOwnProfile = req.session?.userId?.toString() === user._id.toString();

        res.render('pages/profile/view', {
            title: user.firstName + ' ' + user.lastName,
            profile: user,
            isOwnProfile,
            reviewStats: { average: 0, count: 0 },
            sessionStats: { completed: 0, total: 0 },
            recentReviews: []
        });
    } catch (error) {
        res.redirect('/explore');
    }
});

// POST /profile/skills/offered
router.post('/skills/offered', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const { name, category, proficiencyLevel, description } = req.body;

        user.skillsOffered.push({ name, category, proficiencyLevel, description });
        await user.save();

        res.json({ success: true, message: 'Skill added' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to add skill' });
    }
});

// DELETE /profile/skills/offered/:index
router.delete('/skills/offered/:index', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const index = parseInt(req.params.index);
        
        if (index >= 0 && index < user.skillsOffered.length) {
            user.skillsOffered.splice(index, 1);
            await user.save();
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// POST /profile/skills/sought
router.post('/skills/sought', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const { name, category, proficiencyLevel, description } = req.body;

        user.skillsSought.push({ name, category, proficiencyLevel, description });
        await user.save();

        res.json({ success: true, message: 'Skill added' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to add skill' });
    }
});

// DELETE /profile/skills/sought/:index
router.delete('/skills/sought/:index', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const index = parseInt(req.params.index);
        
        if (index >= 0 && index < user.skillsSought.length) {
            user.skillsSought.splice(index, 1);
            await user.save();
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

module.exports = router;