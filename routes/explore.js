/**
 * Explore Routes
 * Browse skills, find tutors, and search functionality
 * 
 * @module routes/explore
 */

const express = require('express');
const router = express.Router();
const { isAuthenticated, loadUser } = require('../middleware/auth');
const { validateSearch } = require('../middleware/validation');
const { User, Session, Review } = require('../models');

/**
 * Skill categories for filtering
 */
const SKILL_CATEGORIES = [
    { id: 'academic', name: 'Academic', icon: '📚', color: '#3B82F6' },
    { id: 'music', name: 'Music', icon: '🎵', color: '#8B5CF6' },
    { id: 'arts', name: 'Arts & Crafts', icon: '🎨', color: '#EC4899' },
    { id: 'sports', name: 'Sports & Fitness', icon: '⚽', color: '#10B981' },
    { id: 'technology', name: 'Technology', icon: '💻', color: '#6366F1' },
    { id: 'languages', name: 'Languages', icon: '🌍', color: '#F59E0B' },
    { id: 'cooking', name: 'Cooking', icon: '🍳', color: '#EF4444' },
    { id: 'other', name: 'Other', icon: '✨', color: '#6B7280' }
];

/**
 * GET /explore
 * Main explore page with featured content
 */
router.get('/', async (req, res) => {
    try {
        const userId = req.session?.userId;
        
        // Parallel fetch featured content
        const [
            topTutors,
            popularSkills,
            recentSessions,
            categoryStats
        ] = await Promise.all([
            // Top-rated tutors
            User.find({
                status: 'active',
                'skillsOffered.0': { $exists: true },
                'stats.averageRating': { $gte: 4 }
            })
            .select('firstName lastName username avatar skillsOffered stats.averageRating stats.sessionsHosted')
            .sort('-stats.averageRating -stats.sessionsHosted')
            .limit(6),
            
            // Popular skills
            User.aggregate([
                { $match: { status: 'active' } },
                { $unwind: '$skillsOffered' },
                { $group: { 
                    _id: { $toLower: '$skillsOffered.name' },
                    count: { $sum: 1 },
                    category: { $first: '$skillsOffered.category' }
                }},
                { $sort: { count: -1 } },
                { $limit: 12 }
            ]),
            
            // Recent completed sessions
            Session.find({ status: 'completed' })
                .populate('tutor student', 'firstName lastName username avatar')
                .sort('-completedAt')
                .limit(5),
            
            // Category statistics
            User.aggregate([
                { $match: { status: 'active' } },
                { $unwind: '$skillsOffered' },
                { $group: { 
                    _id: '$skillsOffered.category',
                    count: { $sum: 1 }
                }},
                { $sort: { count: -1 } }
            ])
        ]);
        
        // Merge category stats with category info
        const categories = SKILL_CATEGORIES.map(cat => {
            const stat = categoryStats.find(s => s._id === cat.id);
            return { ...cat, count: stat?.count || 0 };
        });
        
        res.render('pages/explore/index', {
            title: 'Explore Skills',
            topTutors,
            popularSkills,
            recentSessions,
            categories,
            isLoggedIn: !!userId
        });
        
    } catch (error) {
        console.error('Explore page error:', error);
        req.flash('error', 'Failed to load explore page');
        res.redirect('/');
    }
});

/**
 * GET /explore/search
 * Search for skills and tutors
 */
router.get('/search', validateSearch, async (req, res) => {
    try {
        const {
            q: query = '',
            category = '',
            minRating = 0,
            maxRate = '',
            availability = '',
            sort = 'relevance',
            page = 1
        } = req.query;
        
        const limit = 12;
        const skip = (Math.max(1, parseInt(page)) - 1) * limit;
        
        // Build search query
        const searchQuery = {
            status: 'active',
            'skillsOffered.0': { $exists: true }
        };
        
        // Text search
        if (query) {
            searchQuery.$or = [
                { 'skillsOffered.name': { $regex: query, $options: 'i' } },
                { 'skillsOffered.description': { $regex: query, $options: 'i' } },
                { firstName: { $regex: query, $options: 'i' } },
                { lastName: { $regex: query, $options: 'i' } },
                { username: { $regex: query, $options: 'i' } },
                { bio: { $regex: query, $options: 'i' } }
            ];
        }
        
        // Category filter
        if (category && category !== 'all') {
            searchQuery['skillsOffered.category'] = category;
        }
        
        // Rating filter
        if (minRating && parseFloat(minRating) > 0) {
            searchQuery['stats.averageRating'] = { $gte: parseFloat(minRating) };
        }
        
        // Determine sort order
        let sortOption = {};
        switch (sort) {
            case 'rating':
                sortOption = { 'stats.averageRating': -1 };
                break;
            case 'sessions':
                sortOption = { 'stats.sessionsHosted': -1 };
                break;
            case 'newest':
                sortOption = { createdAt: -1 };
                break;
            case 'name':
                sortOption = { firstName: 1, lastName: 1 };
                break;
            default:
                // Relevance - use text score if available
                sortOption = { 'stats.averageRating': -1, 'stats.sessionsHosted': -1 };
        }
        
        // Execute search
        const [users, total] = await Promise.all([
            User.find(searchQuery)
                .select('firstName lastName username avatar bio skillsOffered stats.averageRating stats.sessionsHosted')
                .sort(sortOption)
                .skip(skip)
                .limit(limit),
            User.countDocuments(searchQuery)
        ]);
        
        const totalPages = Math.ceil(total / limit);
        
        res.render('pages/explore/search', {
            title: query ? `Search: ${query}` : 'Search Skills',
            users,
            query,
            filters: { category, minRating, maxRate, availability, sort },
            categories: SKILL_CATEGORIES,
            pagination: {
                current: parseInt(page),
                total: totalPages,
                totalResults: total,
                hasNext: parseInt(page) < totalPages,
                hasPrev: parseInt(page) > 1
            }
        });
        
    } catch (error) {
        console.error('Search error:', error);
        req.flash('error', 'Search failed. Please try again.');
        res.redirect('/explore');
    }
});

/**
 * GET /explore/category/:category
 * Browse skills by category
 */
router.get('/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = 12;
        const skip = (page - 1) * limit;
        
        // Validate category
        const categoryInfo = SKILL_CATEGORIES.find(c => c.id === category);
        if (!categoryInfo) {
            req.flash('error', 'Invalid category');
            return res.redirect('/explore');
        }
        
        // Get users with skills in this category
        const [users, total, topSkills] = await Promise.all([
            User.find({
                status: 'active',
                'skillsOffered.category': category
            })
            .select('firstName lastName username avatar skillsOffered stats.averageRating stats.sessionsHosted')
            .sort('-stats.averageRating -stats.sessionsHosted')
            .skip(skip)
            .limit(limit),
            
            User.countDocuments({
                status: 'active',
                'skillsOffered.category': category
            }),
            
            // Top skills in this category
            User.aggregate([
                { $match: { status: 'active' } },
                { $unwind: '$skillsOffered' },
                { $match: { 'skillsOffered.category': category } },
                { $group: { 
                    _id: { $toLower: '$skillsOffered.name' },
                    count: { $sum: 1 }
                }},
                { $sort: { count: -1 } },
                { $limit: 10 }
            ])
        ]);
        
        const totalPages = Math.ceil(total / limit);
        
        res.render('pages/explore/category', {
            title: `${categoryInfo.name} Skills`,
            category: categoryInfo,
            users,
            topSkills,
            pagination: {
                current: page,
                total: totalPages,
                totalResults: total,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });
        
    } catch (error) {
        console.error('Category browse error:', error);
        req.flash('error', 'Failed to load category');
        res.redirect('/explore');
    }
});

/**
 * GET /explore/skill/:skillName
 * View all tutors for a specific skill
 */
router.get('/skill/:skillName', async (req, res) => {
    try {
        const { skillName } = req.params;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = 12;
        const skip = (page - 1) * limit;
        
        // Find users with this skill
        const [users, total] = await Promise.all([
            User.find({
                status: 'active',
                'skillsOffered.name': { $regex: new RegExp(`^${skillName}$`, 'i') }
            })
            .select('firstName lastName username avatar skillsOffered stats.averageRating stats.sessionsHosted bio')
            .sort('-stats.averageRating -stats.sessionsHosted')
            .skip(skip)
            .limit(limit),
            
            User.countDocuments({
                status: 'active',
                'skillsOffered.name': { $regex: new RegExp(`^${skillName}$`, 'i') }
            })
        ]);
        
        // Get skill details from first user
        let skillDetails = null;
        if (users.length > 0) {
            skillDetails = users[0].skillsOffered.find(
                s => s.name.toLowerCase() === skillName.toLowerCase()
            );
        }
        
        const totalPages = Math.ceil(total / limit);
        
        res.render('pages/explore/skill', {
            title: `${skillName} Tutors`,
            skillName,
            skillDetails,
            users,
            pagination: {
                current: page,
                total: totalPages,
                totalResults: total,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });
        
    } catch (error) {
        console.error('Skill browse error:', error);
        req.flash('error', 'Failed to load skill');
        res.redirect('/explore');
    }
});

/**
 * GET /explore/tutor/:username
 * View tutor profile (public view)
 */
router.get('/tutor/:username', async (req, res) => {
    try {
        const { username } = req.params;
        
        // Get tutor profile
        const tutor = await User.findOne({ 
            username, 
            status: 'active' 
        }).select('-password -loginAttempts -lockUntil -encryptedPhone');
        
        if (!tutor) {
            req.flash('error', 'Tutor not found');
            return res.redirect('/explore');
        }
        
        // Check privacy settings
        const isOwnProfile = req.session?.userId?.toString() === tutor._id.toString();
        const isPublic = tutor.privacy?.profileVisibility !== 'private';
        
        if (!isPublic && !isOwnProfile) {
            req.flash('error', 'This profile is private');
            return res.redirect('/explore');
        }
        
        // Get reviews and session stats
        const [reviews, sessionStats, recentSessions] = await Promise.all([
            Review.find({ reviewee: tutor._id, status: 'approved' })
                .populate('reviewer', 'firstName lastName username avatar')
                .sort('-createdAt')
                .limit(5),
            
            Session.aggregate([
                { $match: { tutor: tutor._id, status: 'completed' } },
                { $group: {
                    _id: null,
                    count: { $sum: 1 },
                    totalHours: { $sum: { $divide: ['$duration', 60] } },
                    uniqueStudents: { $addToSet: '$student' }
                }}
            ]),
            
            // Only show recent sessions if logged in
            req.session?.userId ? Session.find({
                tutor: tutor._id,
                status: 'completed'
            })
            .populate('student', 'firstName lastName')
            .sort('-completedAt')
            .limit(3) : []
        ]);
        
        const stats = sessionStats[0] || { count: 0, totalHours: 0, uniqueStudents: [] };
        
        res.render('pages/explore/tutor', {
            title: `${tutor.displayName} - Tutor Profile`,
            tutor,
            reviews,
            stats: {
                sessionsCompleted: stats.count,
                totalHours: stats.totalHours?.toFixed(1) || 0,
                uniqueStudents: stats.uniqueStudents?.length || 0
            },
            recentSessions,
            isOwnProfile,
            canMessage: req.session?.userId && !isOwnProfile && tutor.privacy?.allowMessaging !== false,
            canRequestSession: req.session?.userId && !isOwnProfile
        });
        
    } catch (error) {
        console.error('Tutor profile error:', error);
        req.flash('error', 'Failed to load profile');
        res.redirect('/explore');
    }
});

/**
 * GET /explore/leaderboard
 * Top tutors leaderboard
 */
router.get('/leaderboard', async (req, res) => {
    try {
        const timeframe = req.query.timeframe || 'all';
        
        let dateFilter = {};
        const now = new Date();
        
        switch (timeframe) {
            case 'week':
                dateFilter = { completedAt: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } };
                break;
            case 'month':
                dateFilter = { completedAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } };
                break;
            case 'year':
                dateFilter = { completedAt: { $gte: new Date(now - 365 * 24 * 60 * 60 * 1000) } };
                break;
        }
        
        // Get top tutors by various metrics
        const [topByRating, topBySessions, topByPoints, risingStars] = await Promise.all([
            // Top rated
            User.find({
                status: 'active',
                'stats.sessionsHosted': { $gte: 3 }
            })
            .select('firstName lastName username avatar stats.averageRating stats.sessionsHosted')
            .sort('-stats.averageRating')
            .limit(10),
            
            // Most sessions
            User.find({
                status: 'active',
                'stats.sessionsHosted': { $gte: 1 }
            })
            .select('firstName lastName username avatar stats.sessionsHosted stats.averageRating')
            .sort('-stats.sessionsHosted')
            .limit(10),
            
            // Most points
            User.find({
                status: 'active',
                points: { $gte: 1 }
            })
            .select('firstName lastName username avatar points level achievements')
            .sort('-points')
            .limit(10),
            
            // Rising stars (new users with good ratings)
            User.find({
                status: 'active',
                createdAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) },
                'stats.sessionsHosted': { $gte: 1 }
            })
            .select('firstName lastName username avatar stats.averageRating stats.sessionsHosted createdAt')
            .sort('-stats.averageRating')
            .limit(5)
        ]);
        
        res.render('pages/explore/leaderboard', {
            title: 'Top Tutors',
            timeframe,
            topByRating,
            topBySessions,
            topByPoints,
            risingStars
        });
        
    } catch (error) {
        console.error('Leaderboard error:', error);
        req.flash('error', 'Failed to load leaderboard');
        res.redirect('/explore');
    }
});

/**
 * GET /explore/categories
 * List all skill categories
 */
router.get('/categories', async (req, res) => {
    try {
        // Get category statistics
        const categoryStats = await User.aggregate([
            { $match: { status: 'active' } },
            { $unwind: '$skillsOffered' },
            { $group: { 
                _id: '$skillsOffered.category',
                tutorCount: { $addToSet: '$_id' },
                skillCount: { $sum: 1 }
            }},
            { $project: {
                _id: 1,
                tutorCount: { $size: '$tutorCount' },
                skillCount: 1
            }}
        ]);
        
        // Merge with category info
        const categories = SKILL_CATEGORIES.map(cat => {
            const stat = categoryStats.find(s => s._id === cat.id) || { tutorCount: 0, skillCount: 0 };
            return { 
                ...cat, 
                tutorCount: stat.tutorCount,
                skillCount: stat.skillCount
            };
        });
        
        res.render('pages/explore/categories', {
            title: 'Skill Categories',
            categories
        });
        
    } catch (error) {
        console.error('Categories error:', error);
        req.flash('error', 'Failed to load categories');
        res.redirect('/explore');
    }
});

// Export categories for use in other modules
router.SKILL_CATEGORIES = SKILL_CATEGORIES;

module.exports = router;
