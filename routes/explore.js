// routes/explore.js
const express = require('express');
const router = express.Router();
const { User } = require('../models');

router.get('/', async (req, res) => {
    try {
        const { skill, grade, sort } = req.query;
        let query = { isActive: true, 'skillsOffered.0': { $exists: true } };

        if (skill) {
            query['skillsOffered.name'] = new RegExp(skill, 'i');
        }
        if (grade) {
            query.grade = grade;
        }

        let sortOption = { createdAt: -1 };
        if (sort === 'rating') sortOption = { 'stats.averageRating': -1 };

        const tutors = await User.find(query).sort(sortOption).limit(20);

        res.render('pages/explore/index', {
            title: 'Find Tutors',
            tutors,
            filters: { skill, grade, sort }
        });
    } catch (err) {
        console.error(err);
        res.render('pages/explore/index', { title: 'Find Tutors', tutors: [], filters: {} });
    }
});

module.exports = router;
