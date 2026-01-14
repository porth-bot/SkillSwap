/**
 * Validation Middleware - SkillSwap Student Talent Exchange Platform
 * 
 * Comprehensive input validation for all forms and API endpoints.
 * Features: Client-side and server-side validation, sanitization
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => ({
            field: err.path,
            message: err.msg
        }));
        
        // For API requests
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errorMessages
            });
        }
        
        // For form submissions, redirect back with errors
        req.session.flash = {
            type: 'error',
            message: 'Please correct the errors below',
            errors: errorMessages
        };
        req.session.formData = req.body;
        return res.redirect('back');
    }
    
    next();
};

/**
 * User Registration Validation
 */
const validateRegistration = [
    body('email')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail()
        .custom(async (email) => {
            const { User } = require('../models');
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                throw new Error('This email is already registered');
            }
            return true;
        }),
    
    body('username')
        .trim()
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores')
        .custom(async (username) => {
            const { User } = require('../models');
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                throw new Error('This username is already taken');
            }
            return true;
        }),
    
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        }),
    
    body('firstName')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('First name is required and must be less than 50 characters')
        .escape(),
    
    body('lastName')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Last name is required and must be less than 50 characters')
        .escape(),
    
    body('grade')
        .optional()
        .isInt({ min: 6, max: 12 })
        .withMessage('Grade must be between 6 and 12'),
    
    body('school')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('School name must be less than 100 characters')
        .escape(),
    
    handleValidationErrors
];

/**
 * Login Validation
 */
const validateLogin = [
    body('email')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
    
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    
    handleValidationErrors
];

/**
 * Profile Update Validation
 */
const validateProfileUpdate = [
    body('firstName')
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('First name must be between 1 and 50 characters')
        .escape(),
    
    body('lastName')
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Last name must be between 1 and 50 characters')
        .escape(),
    
    body('bio')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Bio must be less than 500 characters'),
    
    body('grade')
        .optional()
        .isInt({ min: 6, max: 12 })
        .withMessage('Grade must be between 6 and 12'),
    
    body('school')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('School name must be less than 100 characters')
        .escape(),
    
    body('privacySettings.showEmail')
        .optional()
        .isBoolean()
        .withMessage('Invalid privacy setting'),
    
    body('privacySettings.showFullName')
        .optional()
        .isBoolean()
        .withMessage('Invalid privacy setting'),
    
    body('privacySettings.allowMessaging')
        .optional()
        .isBoolean()
        .withMessage('Invalid privacy setting'),
    
    body('privacySettings.profileVisibility')
        .optional()
        .isIn(['public', 'students-only', 'private'])
        .withMessage('Invalid profile visibility setting'),
    
    handleValidationErrors
];

/**
 * Skill Validation
 */
const validateSkill = [
    body('name')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Skill name is required and must be less than 100 characters'),
    
    body('category')
        .isIn(['academics', 'arts', 'technology', 'music', 'sports', 'languages', 'life-skills', 'other'])
        .withMessage('Invalid skill category'),
    
    body('proficiencyLevel')
        .optional()
        .isIn(['beginner', 'intermediate', 'advanced', 'expert'])
        .withMessage('Invalid proficiency level'),
    
    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must be less than 500 characters'),
    
    handleValidationErrors
];

/**
 * Session Creation Validation
 */
const validateSession = [
    body('title')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Session title is required and must be less than 100 characters')
        .escape(),
    
    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Description must be less than 1000 characters'),
    
    body('skill.name')
        .trim()
        .notEmpty()
        .withMessage('Skill name is required'),
    
    body('skill.category')
        .isIn(['academics', 'arts', 'technology', 'music', 'sports', 'languages', 'life-skills', 'other'])
        .withMessage('Invalid skill category'),
    
    body('scheduledDate')
        .isISO8601()
        .withMessage('Please provide a valid date')
        .custom((value) => {
            const date = new Date(value);
            const now = new Date();
            if (date <= now) {
                throw new Error('Session must be scheduled in the future');
            }
            return true;
        }),
    
    body('duration')
        .isInt({ min: 15, max: 180 })
        .withMessage('Duration must be between 15 and 180 minutes'),
    
    body('format')
        .optional()
        .isIn(['in-person', 'virtual', 'hybrid'])
        .withMessage('Invalid session format'),
    
    body('location')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Location must be less than 200 characters')
        .escape(),
    
    body('meetingLink')
        .optional()
        .trim()
        .isURL()
        .withMessage('Please provide a valid meeting URL'),
    
    handleValidationErrors
];

/**
 * Review Validation
 */
const validateReview = [
    body('ratings.overall')
        .isInt({ min: 1, max: 5 })
        .withMessage('Overall rating must be between 1 and 5'),
    
    body('ratings.communication')
        .optional()
        .isInt({ min: 1, max: 5 })
        .withMessage('Communication rating must be between 1 and 5'),
    
    body('ratings.knowledge')
        .optional()
        .isInt({ min: 1, max: 5 })
        .withMessage('Knowledge rating must be between 1 and 5'),
    
    body('ratings.punctuality')
        .optional()
        .isInt({ min: 1, max: 5 })
        .withMessage('Punctuality rating must be between 1 and 5'),
    
    body('ratings.helpfulness')
        .optional()
        .isInt({ min: 1, max: 5 })
        .withMessage('Helpfulness rating must be between 1 and 5'),
    
    body('title')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Title must be less than 100 characters')
        .escape(),
    
    body('content')
        .trim()
        .isLength({ min: 10, max: 2000 })
        .withMessage('Review content must be between 10 and 2000 characters'),
    
    body('tags')
        .optional()
        .isArray({ max: 5 })
        .withMessage('You can select up to 5 tags'),
    
    body('tags.*')
        .optional()
        .isIn([
            'patient', 'knowledgeable', 'encouraging', 'well-prepared',
            'punctual', 'friendly', 'professional', 'clear-explanations',
            'good-listener', 'asks-good-questions', 'motivated', 'respectful'
        ])
        .withMessage('Invalid tag'),
    
    body('wouldRecommend')
        .optional()
        .isBoolean()
        .withMessage('Invalid recommendation value'),
    
    handleValidationErrors
];

/**
 * Message Validation
 */
const validateMessage = [
    body('content')
        .trim()
        .isLength({ min: 1, max: 5000 })
        .withMessage('Message must be between 1 and 5000 characters'),
    
    body('recipientId')
        .optional()
        .isMongoId()
        .withMessage('Invalid recipient'),
    
    handleValidationErrors
];

/**
 * Password Change Validation
 */
const validatePasswordChange = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('New password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
        .custom((value, { req }) => {
            if (value === req.body.currentPassword) {
                throw new Error('New password must be different from current password');
            }
            return true;
        }),
    
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Passwords do not match');
            }
            return true;
        }),
    
    handleValidationErrors
];

/**
 * Search Query Validation
 */
const validateSearch = [
    query('q')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Search query must be less than 100 characters')
        .escape(),
    
    query('category')
        .optional()
        .isIn(['academics', 'arts', 'technology', 'music', 'sports', 'languages', 'life-skills', 'other', 'all'])
        .withMessage('Invalid category'),
    
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Invalid page number'),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Limit must be between 1 and 50'),
    
    handleValidationErrors
];

/**
 * MongoDB ObjectId Validation
 */
const validateMongoId = (paramName = 'id') => [
    param(paramName)
        .isMongoId()
        .withMessage('Invalid ID format'),
    
    handleValidationErrors
];

/**
 * Admin User Edit Validation
 */
const validateAdminUserEdit = [
    body('role')
        .optional()
        .isIn(['student', 'tutor', 'admin'])
        .withMessage('Invalid role'),
    
    body('isActive')
        .optional()
        .isBoolean()
        .withMessage('Invalid active status'),
    
    body('isVerified')
        .optional()
        .isBoolean()
        .withMessage('Invalid verified status'),
    
    handleValidationErrors
];

module.exports = {
    handleValidationErrors,
    validateRegistration,
    validateLogin,
    validateProfileUpdate,
    validateSkill,
    validateSession,
    validateReview,
    validateMessage,
    validatePasswordChange,
    validateSearch,
    validateMongoId,
    validateAdminUserEdit
};
