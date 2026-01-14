/**
 * Profile Routes - SkillSwap Student Talent Exchange Platform
 * 
 * Handles user profile viewing, editing, and skill management.
 */

const express = require('express');
const router = express.Router();
const { User, Review, Session, AuditLog } = require('../models');
const { 
    isAuthenticated,
    validateProfileUpdate,
    validateSkill,
    validateMongoId
} = require('../middleware');

/**
 * GET /profile - View own profile
 */
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const reviewStats = await Review.getStatsForUser(user._id);
        const sessionStats = await Session.getStats(user._id);
        const recentReviews = await Review.getForUser(user._id, { limit: 5, publicOnly: true });
        
        res.render('profile/view', {
            title: `${user.displayName} - SkillSwap`,
            profile: user,
            reviewStats,
            sessionStats,
            recentReviews,
            isOwnProfile: true
        });
        
    } catch (error) {
        console.error('Profile view error:', error);
        req.session.flash = {
            type: 'error',
            message: 'Failed to load profile'
        };
        res.redirect('/dashboard');
    }
});

/**
 * GET /profile/setup - Initial profile setup
 */
router.get('/setup', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        res.render('profile/setup', {
            title: 'Complete Your Profile - SkillSwap',
            user,
            categories: [
                { value: 'academics', label: 'Academics', icon: '📚' },
                { value: 'arts', label: 'Arts & Crafts', icon: '🎨' },
                { value: 'technology', label: 'Technology', icon: '💻' },
                { value: 'music', label: 'Music', icon: '🎵' },
                { value: 'sports', label: 'Sports & Fitness', icon: '⚽' },
                { value: 'languages', label: 'Languages', icon: '🌍' },
                { value: 'life-skills', label: 'Life Skills', icon: '🏠' },
                { value: 'other', label: 'Other', icon: '✨' }
            ]
        });
        
    } catch (error) {
        console.error('Profile setup error:', error);
        res.redirect('/dashboard');
    }
});

/**
 * GET /profile/edit - Edit profile page
 */
router.get('/edit', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        res.render('profile/edit', {
            title: 'Edit Profile - SkillSwap',
            user,
            formData: req.session.formData || user
        });
        delete req.session.formData;
        
    } catch (error) {
        console.error('Profile edit error:', error);
        res.redirect('/profile');
    }
});

/**
 * POST /profile/edit - Update profile
 */
router.post('/edit', isAuthenticated, async (req, res) => {    try {
        const user = await User.findById(req.session.userId);
        const previousValues = {
            firstName: user.firstName,
            lastName: user.lastName,
            bio: user.bio,
            grade: user.grade,
            school: user.school
        };
        
        // Update allowed fields
        const allowedFields = ['firstName', 'lastName', 'bio', 'grade', 'school'];
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                user[field] = req.body[field];
            }
        });
        
        // Update privacy settings
        if (req.body.privacySettings) {
            user.privacySettings = {
                ...user.privacySettings,
                ...req.body.privacySettings
            };
        }
        
        await user.save();
        
        // Log profile update
        await AuditLog.log({
            user: user._id,
            userEmail: user.email,
            action: 'PROFILE_UPDATE',
            category: 'user',
            description: `Profile updated for ${user.email}`,
            previousValues,
            newValues: req.body,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });
        
        req.session.flash = {
            type: 'success',
            message: 'Profile updated successfully'
        };
        
        res.redirect('/profile');
        
    } catch (error) {
        console.error('Profile update error:', error);
        req.session.flash = {
            type: 'error',
            message: 'Failed to update profile'
        };
        req.session.formData = req.body;
        res.redirect('/profile/edit');
    }
});

/**
 * GET /profile/:username - View public profile
 */
router.get('/:username', async (req, res) => {
    try {
        const user = await User.findOne({ 
            username: req.params.username,
            isActive: true
        });
        
        if (!user) {
            req.session.flash = {
                type: 'error',
                message: 'User not found'
            };
            return res.redirect('/explore');
        }
        
        // Check privacy settings
        const isOwnProfile = req.session?.userId?.toString() === user._id.toString();
        const isAdmin = req.user?.role === 'admin';
        
        if (user.privacySettings.profileVisibility === 'private' && !isOwnProfile && !isAdmin) {
            req.session.flash = {
                type: 'warning',
                message: 'This profile is private'
            };
            return res.redirect('/explore');
        }
        
        if (user.privacySettings.profileVisibility === 'students-only' && !req.session?.userId && !isAdmin) {
            req.session.flash = {
                type: 'warning',
                message: 'Please log in to view this profile'
            };
            return res.redirect('/auth/login');
        }
        
        const reviewStats = await Review.getStatsForUser(user._id);
        const sessionStats = await Session.getStats(user._id);
        const recentReviews = await Review.getForUser(user._id, { limit: 5, publicOnly: true });
        
        res.render('profile/view', {
            title: `${user.displayName} - SkillSwap`,
            profile: user,
            reviewStats,
            sessionStats,
            recentReviews,
            isOwnProfile
        });
        
    } catch (error) {
        console.error('Profile view error:', error);
        req.session.flash = {
            type: 'error',
            message: 'Failed to load profile'
        };
        res.redirect('/explore');
    }
});

/**
 * POST /profile/skills/offered - Add skill offered
 */
router.post('/skills/offered', isAuthenticated, validateSkill, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        const { name, category, proficiencyLevel, description } = req.body;
        
        // Check for duplicate
        const exists = user.skillsOffered.some(
            s => s.name.toLowerCase() === name.toLowerCase()
        );
        
        if (exists) {
            return res.status(400).json({
                success: false,
                message: 'You already have this skill listed'
            });
        }
        
        user.skillsOffered.push({
            name,
            category,
            proficiencyLevel: proficiencyLevel || 'intermediate',
            description
        });
        
        await user.save();
        
        // Check for achievement
        if (user.skillsOffered.length === 1) {
            await user.addAchievement({
                name: 'Skill Sharer',
                description: 'Added your first skill to offer',
                icon: '🌟',
                points: 15
            });
        } else if (user.skillsOffered.length === 5) {
            await user.addAchievement({
                name: 'Multi-Talented',
                description: 'Added 5 skills to offer',
                icon: '🏆',
                points: 25
            });
        }
        
        res.json({
            success: true,
            message: 'Skill added successfully',
            skill: user.skillsOffered[user.skillsOffered.length - 1]
        });
        
    } catch (error) {
        console.error('Add skill error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add skill'
        });
    }
});

/**
 * DELETE /profile/skills/offered/:index - Remove skill offered
 */
router.delete('/skills/offered/:index', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const index = parseInt(req.params.index);
        
        if (index < 0 || index >= user.skillsOffered.length) {
            return res.status(400).json({
                success: false,
                message: 'Invalid skill index'
            });
        }
        
        user.skillsOffered.splice(index, 1);
        await user.save();
        
        res.json({
            success: true,
            message: 'Skill removed successfully'
        });
        
    } catch (error) {
        console.error('Remove skill error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove skill'
        });
    }
});

/**
 * POST /profile/skills/sought - Add skill sought
 */
router.post('/skills/sought', isAuthenticated, validateSkill, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        
        const { name, category, proficiencyLevel, description } = req.body;
        
        // Check for duplicate
        const exists = user.skillsSought.some(
            s => s.name.toLowerCase() === name.toLowerCase()
        );
        
        if (exists) {
            return res.status(400).json({
                success: false,
                message: 'You already have this skill in your wishlist'
            });
        }
        
        user.skillsSought.push({
            name,
            category,
            proficiencyLevel: proficiencyLevel || 'beginner',
            description
        });
        
        await user.save();
        
        // Check for achievement
        if (user.skillsSought.length === 1) {
            await user.addAchievement({
                name: 'Eager Learner',
                description: 'Added your first skill to learn',
                icon: '📖',
                points: 10
            });
        }
        
        res.json({
            success: true,
            message: 'Skill added to wishlist',
            skill: user.skillsSought[user.skillsSought.length - 1]
        });
        
    } catch (error) {
        console.error('Add skill sought error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add skill'
        });
    }
});

/**
 * DELETE /profile/skills/sought/:index - Remove skill sought
 */
router.delete('/skills/sought/:index', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const index = parseInt(req.params.index);
        
        if (index < 0 || index >= user.skillsSought.length) {
            return res.status(400).json({
                success: false,
                message: 'Invalid skill index'
            });
        }
        
        user.skillsSought.splice(index, 1);
        await user.save();
        
        res.json({
            success: true,
            message: 'Skill removed from wishlist'
        });
        
    } catch (error) {
        console.error('Remove skill sought error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove skill'
        });
    }
});

module.exports = router;
