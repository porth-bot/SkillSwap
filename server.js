// server.js - main entry point
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const path = require('path');

const app = express();

// connect to mongodb
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/skillswap')
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB error:', err));

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// session
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret123',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/skillswap'
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 1 week
}));

// flash messages
app.use(flash());

// load user on each request
const { User } = require('./models');
app.use(async (req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.user = null;
    
    if (req.session.userId) {
        try {
            req.user = await User.findById(req.session.userId);
            res.locals.user = req.user;
        } catch (err) {}
    }
    next();
});

// view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// helper for views
app.locals.include = (file) => path.join(__dirname, 'views', file);

// routes
app.use('/auth', require('./routes/auth'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/explore', require('./routes/explore'));
app.use('/profile', require('./routes/profile'));
app.use('/sessions', require('./routes/sessions'));
app.use('/messages', require('./routes/messages'));
app.use('/reviews', require('./routes/reviews'));
app.use('/admin', require('./routes/admin'));
app.use('/api', require('./routes/api'));

// home page
app.get('/', (req, res) => {
    if (req.session.userId) return res.redirect('/dashboard');
    res.render('pages/home', { title: 'Welcome' });
});

// static pages
app.get('/about', (req, res) => res.render('pages/static/about', { title: 'About' }));
app.get('/help', (req, res) => res.render('pages/static/help', { title: 'Help' }));
app.get('/contact', (req, res) => res.render('pages/static/contact', { title: 'Contact' }));
app.get('/privacy', (req, res) => res.render('pages/static/privacy', { title: 'Privacy' }));
app.get('/terms', (req, res) => res.render('pages/static/terms', { title: 'Terms' }));

// 404
app.use((req, res) => {
    res.status(404).render('pages/errors/404', { title: 'Page Not Found' });
});

// error handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).render('pages/errors/500', { title: 'Server Error' });
});

// start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
