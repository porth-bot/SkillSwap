// auth routes - login, register, logout

const express = require('express');
const router = express.Router();
const { User, AuditLog } = require('../models');
const { isAuthenticated, isNotAuthenticated } = require('../middleware');

// login page
router.get('/login', isNotAuthenticated, (req, res) => {
    res.render('pages/auth/login', {
        title: 'Log In',
        error: req.session.error,
        formData: req.session.formData || {}
    });
    delete req.session.error;
    delete req.session.formData;
});

// handle login
router.post('/login', isNotAuthenticated, async (req, res) => {
    try {
        const { email, password, remember } = req.body;
        
        // find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            req.session.error = 'Invalid email or password';
            req.session.formData = { email };
            return res.redirect('/auth/login');
        }
        
        // check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            req.session.error = 'Invalid email or password';
            req.session.formData = { email };
            return res.redirect('/auth/login');
        }
        
        // check if account is active
        if (user.status !== 'active') {
            req.session.error = 'Your account is not active. Contact admin.';
            return res.redirect('/auth/login');
        }
        
        // create session
        req.session.userId = user._id;
        req.session.userRole = user.role;
        
        // remember me
        if (remember) {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        }
        
        // update last login
        user.lastActive = new Date();
        await user.save();
        
        // log it
        try {
            await AuditLog.create({
                user: user._id,
                action: 'login',
                resource: 'session',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });
        } catch (e) {
            console.log('audit log error:', e); // dont break login if logging fails
        }
        
        res.redirect('/dashboard');
        
    } catch (err) {
        console.error('login error:', err);
        req.session.error = 'Something went wrong, try again';
        res.redirect('/auth/login');
    }
});

// register page
router.get('/register', isNotAuthenticated, (req, res) => {
    res.render('pages/auth/register', {
        title: 'Sign Up',
        error: req.session.error,
        formData: req.session.formData || {}
    });
    delete req.session.error;
    delete req.session.formData;
});

// handle register
router.post('/register', isNotAuthenticated, async (req, res) => {
    try {
        const { name, email, password, confirmPassword, grade } = req.body;
        
        // validate
        if (!name || !email || !password) {
            req.session.error = 'Please fill in all required fields';
            req.session.formData = req.body;
            return res.redirect('/auth/register');
        }
        
        if (password !== confirmPassword) {
            req.session.error = 'Passwords dont match';
            req.session.formData = req.body;
            return res.redirect('/auth/register');
        }
        
        if (password.length < 6) {
            req.session.error = 'Password must be at least 6 characters';
            req.session.formData = req.body;
            return res.redirect('/auth/register');
        }
        
        // check if email already exists
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            req.session.error = 'An account with this email already exists';
            req.session.formData = req.body;
            return res.redirect('/auth/register');
        }
        
        // create user
        const user = new User({
            name,
            email: email.toLowerCase(),
            password, // gets hashed in pre-save hook
            grade: grade || 'Not specified',
            school: 'Wayzata High School', // TODO: make this configurable
            role: 'student',
            status: 'active'
        });
        
        await user.save();
        
        // auto login
        req.session.userId = user._id;
        req.session.userRole = user.role;
        
        console.log('new user registered:', email);
        
        res.redirect('/dashboard');
        
    } catch (err) {
        console.error('register error:', err);
        req.session.error = err.message || 'Registration failed';
        req.session.formData = req.body;
        res.redirect('/auth/register');
    }
});

// logout
router.get('/logout', (req, res) => {
    const userId = req.session.userId;
    
    req.session.destroy((err) => {
        if (err) console.error('logout error:', err);
        res.redirect('/');
    });
    
    // log it (fire and forget)
    if (userId) {
        AuditLog.create({
            user: userId,
            action: 'logout',
            resource: 'session'
        }).catch(() => {}); // ignore errors
    }
});

// change password (if logged in)
router.get('/change-password', isAuthenticated, (req, res) => {
    res.render('pages/auth/change-password', {
        title: 'Change Password',
        error: req.session.error,
        success: req.session.success
    });
    delete req.session.error;
    delete req.session.success;
});

router.post('/change-password', isAuthenticated, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        
        if (newPassword !== confirmPassword) {
            req.session.error = 'New passwords dont match';
            return res.redirect('/auth/change-password');
        }
        
        if (newPassword.length < 6) {
            req.session.error = 'Password must be at least 6 characters';
            return res.redirect('/auth/change-password');
        }
        
        const user = await User.findById(req.session.userId);
        
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            req.session.error = 'Current password is incorrect';
            return res.redirect('/auth/change-password');
        }
        
        user.password = newPassword;
        await user.save();
        
        req.session.success = 'Password changed!';
        res.redirect('/profile');
        
    } catch (err) {
        console.error('password change error:', err);
        req.session.error = 'Something went wrong';
        res.redirect('/auth/change-password');
    }
});

module.exports = router;
