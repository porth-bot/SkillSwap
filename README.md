# SkillSwap

Peer tutoring app for students. Find help with classes or help others with stuff you're good at.

Built for BPA Web Application Team 2025-2026.

## What it does

- Students can sign up and list skills they can tutor
- Other students can find tutors and request sessions
- Message tutors to set up times
- Leave reviews after sessions
- Admin panel to manage everything

## Above and Beyond Features

Beyond the basic requirements, we added:

- **Dark Mode** - Toggle between light/dark themes, respects system preference
- **Data Visualization** - Interactive Chart.js charts in admin dashboard
- **CSV Export** - Export data tables to CSV files
- **REST API** - Full API with documentation at /api-docs
- **Keyboard Shortcuts** - Ctrl+K for search, Escape to close modals
- **Accessibility** - Skip links, focus states, reduced motion support
- **Print Styles** - Reports print cleanly without navigation
- **Real-time Validation** - Form validation as you type
- **Loading States** - Skeleton screens for better UX
- **Rate Limiting** - Prevents spam and abuse
- **Audit Logging** - Tracks all admin actions
- **Responsive Design** - Works on mobile, tablet, desktop

## Tech stack

- Node.js + Express
- MongoDB (using Mongoose)
- EJS templates
- Plain CSS (no frameworks)
- Chart.js for data visualization
- bcrypt for password hashing

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/skillswap
SESSION_SECRET=somethingsecret
```

3. Seed the database (optional but recommended):
```bash
npm run seed
```

4. Run it:
```bash
npm run dev
```

5. Go to http://localhost:3000

## Test accounts

After seeding:
- Admin: `admin@skillswap.edu` / `admin123`
- Students: `firstname.lastname@student.wayzata.k12.mn.us` / `password123`

## Documentation

- `/docs/USER_MANUAL.md` - How to use the app
- `/docs/SYSTEM_DESCRIPTION.md` - Technical architecture
- `/docs/WORKS_CITED.md` - All sources cited
- `/api-docs` - API documentation (when running)

## Folder structure

```
skillswap/
├── config/         # database config
├── docs/           # documentation
├── middleware/     # auth, validation
├── models/         # mongoose schemas
├── public/         # css, js, images
├── routes/         # express routes
├── seeds/          # test data
├── views/          # ejs templates
└── server.js       # main file
```

## Features for BPA

- [x] Database driven (MongoDB with 5 collections)
- [x] Server-side scripting (Node/Express)
- [x] User authentication (sessions + bcrypt)
- [x] Different user roles (student/tutor/admin)
- [x] CRUD operations (users, sessions, reviews, messages)
- [x] Form validation (client + server side)
- [x] Admin panel with analytics
- [x] Responsive design
- [x] Security (rate limiting, input sanitization, audit logs)
- [x] Professional documentation

## Security Features

- Password hashing with bcrypt (10 rounds)
- HTTP-only session cookies
- Rate limiting on auth endpoints
- MongoDB query sanitization
- Helmet.js security headers
- CSRF protection via SameSite cookies
- Audit logging for admin actions

## Team

Wayzata High School BPA Chapter

## Notes

- Make sure MongoDB is running before starting
- The seed script clears all data before adding test data
- Change SESSION_SECRET in production
