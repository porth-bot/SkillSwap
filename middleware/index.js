// middleware/index.js - all middleware functions

// check if user is logged in
function isAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    req.flash('error', 'Please log in first');
    res.redirect('/auth/login');
}

// check if user is admin
function isAdmin(req, res, next) {
    if (req.session && req.session.userId && req.user && req.user.role === 'admin') {
        return next();
    }
    req.flash('error', 'Admin access required');
    res.redirect('/dashboard');
}

// validate mongodb id parameter
function validateMongoId(paramName) {
    return function(req, res, next) {
        const id = req.params[paramName];
        if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
            req.flash('error', 'Invalid ID');
            return res.redirect('back');
        }
        next();
    };
}

// placeholder validators - just pass through
function validateProfileUpdate(req, res, next) { next(); }
function validateSkill(req, res, next) { next(); }
function validateSession(req, res, next) { next(); }
function validateReview(req, res, next) { next(); }
function validateMessage(req, res, next) { next(); }

module.exports = {
    isAuthenticated,
    isAdmin,
    validateMongoId,
    validateProfileUpdate,
    validateSkill,
    validateSession,
    validateReview,
    validateMessage
};
