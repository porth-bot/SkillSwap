// SkillSwap - main server file
// BPA Web App 2025-2026

require('dotenv').config();

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/database');
const { loadUser } = require('./middleware/auth');

const app = express();

// connect to mongodb
connectDB();

// security stuff
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
}));

// rate limiting so people cant spam
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 100
});
app.use('/api/', limiter);

// stricter limit for login
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many login attempts, try again later' }
});
app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);

// parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// static files
app.use(express.static(path.join(__dirname, 'public')));

// view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// sessions
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'dev-secret-change-this',
    resave: false,
    saveUninitialized: false,
    name: 'skillswap.sid',
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
};

// use mongo store if we have a db connection
if (process.env.MONGODB_URI) {
    sessionConfig.store = MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        ttl: 24 * 60 * 60
    });
}

app.use(session(sessionConfig));

// load user for all routes
app.use(loadUser);

// make user available in all templates
app.use((req, res, next) => {
    res.locals.user = req.user || null;
    res.locals.isAuthenticated = !!req.session.userId;
    next();
});

// routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const sessionRoutes = require('./routes/sessions');
const reviewRoutes = require('./routes/reviews');
const adminRoutes = require('./routes/admin');
const dashboardRoutes = require('./routes/dashboard');
const exploreRoutes = require('./routes/explore');
const messageRoutes = require('./routes/messages');
const apiRoutes = require('./routes/api');

// home page
app.get('/', async (req, res) => {
    try {
        if (req.session.userId) {
            return res.redirect('/dashboard');
        }
        
        // get some stats for the landing page
        const User = require('./models/User');
        const Session = require('./models/Session');
        
        const [userCount, sessionCount, skillCount] = await Promise.all([
            User.countDocuments({ status: 'active' }),
            Session.countDocuments({ status: 'completed' }),
            User.aggregate([
                { $match: { status: 'active' } },
                { $project: { skillCount: { $size: { $ifNull: ['$skillsOffered', []] } } } },
                { $group: { _id: null, total: { $sum: '$skillCount' } } }
            ])
        ]);
        
        res.render('pages/home', {
            title: 'SkillSwap',
            stats: {
                users: userCount || 0,
                sessions: sessionCount || 0,
                skills: skillCount[0]?.total || 0
            }
        });
    } catch (err) {
        console.error('home page error:', err);
        // just show the page with 0s if theres an error
        res.render('pages/home', {
            title: 'SkillSwap',
            stats: { users: 0, sessions: 0, skills: 0 }
        });
    }
});

// mount routes
app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);
app.use('/sessions', sessionRoutes);
app.use('/reviews', reviewRoutes);
app.use('/admin', adminRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/explore', exploreRoutes);
app.use('/messages', messageRoutes);
app.use('/api', apiRoutes);

// static pages
app.get('/about', (req, res) => {
    res.render('pages/static/about', { title: 'About' });
});

app.get('/contact', (req, res) => {
    res.render('pages/static/contact', { title: 'Contact' });
});

// TODO: actually handle contact form submissions
app.post('/contact', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        console.log('contact form:', { name, email, subject }); // just log for now
        
        res.render('pages/static/contact', { 
            title: 'Contact',
            success: true
        });
    } catch (err) {
        console.error('contact form error:', err);
        res.render('pages/static/contact', { 
            title: 'Contact',
            error: 'Something went wrong, try again'
        });
    }
});

app.get('/help', (req, res) => {
    res.render('pages/static/help', { title: 'Help' });
});

app.get('/privacy', (req, res) => {
    res.render('pages/static/privacy', { title: 'Privacy Policy' });
});

app.get('/terms', (req, res) => {
    res.render('pages/static/terms', { title: 'Terms of Service' });
});

// 404 handler
app.use((req, res, next) => {
    res.status(404).render('pages/errors/404', {
        title: 'Page Not Found'
    });
});

// error handler
app.use((err, req, res, next) => {
    console.error('error:', err);
    
    const status = err.status || 500;
    
    // dont show error details in production
    if (status === 403) {
        res.status(403).render('pages/errors/403', { title: 'Access Denied' });
    } else if (status === 404) {
        res.status(404).render('pages/errors/404', { title: 'Not Found' });
    } else {
        res.status(status).render('pages/errors/500', {
            title: 'Error',
            error: process.env.NODE_ENV !== 'production' ? err : null,
            errorId: 'ERR-' + Date.now().toString(36).toUpperCase()
        });
    }
});

// start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`
    ███████╗██╗  ██╗██╗██╗     ██╗     ███████╗██╗    ██╗ █████╗ ██████╗ 
    ██╔════╝██║ ██╔╝██║██║     ██║     ██╔════╝██║    ██║██╔══██╗██╔══██╗
    ███████╗█████╔╝ ██║██║     ██║     ███████╗██║ █╗ ██║███████║██████╔╝
    ╚════██║██╔═██╗ ██║██║     ██║     ╚════██║██║███╗██║██╔══██║██╔═══╝ 
    ███████║██║  ██╗██║███████╗███████╗███████║╚███╔███╔╝██║  ██║██║     
    ╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚══════╝ ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝     
    
    server running on http://localhost:${PORT}
    `);
});

module.exports = app;
