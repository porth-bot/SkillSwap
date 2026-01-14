// auth middleware

const { User } = require('../models');

// check if logged in
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    
    // api request
    if (req.xhr || req.path.startsWith('/api')) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // save where they were trying to go
    req.session.returnTo = req.originalUrl;
    res.redirect('/auth/login');
};

// check if NOT logged in (for login/register pages)
const isNotAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return res.redirect('/dashboard');
    }
    next();
};

// check if admin
const isAdmin = async (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.redirect('/auth/login');
    }
    
    try {
        const user = await User.findById(req.session.userId);
        if (!user || user.role !== 'admin') {
            return res.status(403).render('pages/errors/403', { title: 'Access Denied' });
        }
        next();
    } catch (err) {
        console.error('admin check error:', err);
        res.redirect('/dashboard');
    }
};

// check if tutor (or admin)
const isTutor = async (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.redirect('/auth/login');
    }
    
    try {
        const user = await User.findById(req.session.userId);
        if (!user || (user.role !== 'tutor' && user.role !== 'admin')) {
            req.session.error = 'You need to be a tutor to access this';
            return res.redirect('/dashboard');
        }
        next();
    } catch (err) {
        console.error('tutor check error:', err);
        res.redirect('/dashboard');
    }
};

// load user for all requests (attaches to req.user)
const loadUser = async (req, res, next) => {
    if (req.session && req.session.userId) {
        try {
            const user = await User.findById(req.session.userId);
            if (user && user.status === 'active') {
                req.user = user;
                res.locals.user = user; // make available in templates
            } else {
                // user not found or not active, clear session
                delete req.session.userId;
                delete req.session.userRole;
            }
        } catch (err) {
            console.error('load user error:', err);
        }
    }
    next();
};

module.exports = {
    isAuthenticated,
    isNotAuthenticated,
    isAdmin,
    isTutor,
    loadUser
};
