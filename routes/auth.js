// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { User } = require('../models');

// GET /auth/login
router.get('/login', (req, res) => {
    if (req.session.userId) return res.redirect('/dashboard');
    res.render('pages/auth/login', { title: 'Login' });
});

// POST /auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user || !await bcrypt.compare(password, user.password)) {
            req.flash('error', 'Invalid email or password');
            return res.redirect('/auth/login');
        }

        req.session.userId = user._id;
        req.flash('success', 'Welcome back!');
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Login failed');
        res.redirect('/auth/login');
    }
});

// GET /auth/register
router.get('/register', (req, res) => {
    if (req.session.userId) return res.redirect('/dashboard');
    res.render('pages/auth/register', { title: 'Register' });
});

// POST /auth/register
router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password, grade } = req.body;

        const exists = await User.findOne({ email: email.toLowerCase() });
        if (exists) {
            req.flash('error', 'Email already registered');
            return res.redirect('/auth/register');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const username = email.split('@')[0].toLowerCase() + Math.floor(Math.random() * 1000);

        const user = new User({
            firstName,
            lastName,
            email: email.toLowerCase(),
            password: hashedPassword,
            username,
            grade: grade || '9',
            role: 'student'
        });

        await user.save();
        req.session.userId = user._id;
        req.flash('success', 'Account created!');
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Registration failed');
        res.redirect('/auth/register');
    }
});

// GET /auth/logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = router;
