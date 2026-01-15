// routes/reviews.js
const express = require('express');
const router = express.Router();
const { User, Session, Review } = require('../models');
const { isAuthenticated } = require('../middleware');

router.get('/', isAuthenticated, async (req, res) => {
    try {
        const reviews = await Review.find({
            $or: [{ reviewer: req.session.userId }, { reviewee: req.session.userId }]
        }).populate('reviewer reviewee session').sort('-createdAt');

        res.render('pages/reviews/index', { title: 'Reviews', reviews });
    } catch (err) {
        res.redirect('/dashboard');
    }
});

router.get('/new/:sessionId', isAuthenticated, async (req, res) => {
    try {
        const session = await Session.findById(req.params.sessionId).populate('tutor student');
        if (!session) {
            req.flash('error', 'Session not found');
            return res.redirect('/sessions');
        }
        res.render('pages/reviews/new', { title: 'Leave Review', session });
    } catch (err) {
        res.redirect('/sessions');
    }
});

router.post('/new/:sessionId', isAuthenticated, async (req, res) => {
    try {
        const session = await Session.findById(req.params.sessionId);
        const reviewee = session.tutor.toString() === req.session.userId.toString()
            ? session.student
            : session.tutor;

        const review = new Review({
            reviewer: req.session.userId,
            reviewee,
            session: session._id,
            rating: req.body.rating,
            comment: req.body.comment
        });
        await review.save();
        req.flash('success', 'Review submitted');
        res.redirect('/sessions');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Failed to submit review');
        res.redirect('back');
    }
});

module.exports = router;
