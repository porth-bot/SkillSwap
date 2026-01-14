# SkillSwap

Peer tutoring app for students. Find help with classes or help others with stuff you're good at.

Built for BPA Web Application Team 2025-2026.

## What it does

- Students can sign up and list skills they can tutor
- Other students can find tutors and request sessions
- Message tutors to set up times
- Leave reviews after sessions
- Admin panel to manage everything

## Tech stack

- Node.js + Express
- MongoDB (using Mongoose)
- EJS templates
- Plain CSS (no frameworks)

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

## Folder structure

```
skillswap/
├── config/         # database config
├── middleware/     # auth, validation
├── models/         # mongoose schemas
├── routes/         # express routes
├── seeds/          # test data
├── public/         # css, js, images
├── views/          # ejs templates
└── server.js       # main file
```

## Features for BPA

- [x] Database driven (MongoDB)
- [x] Server-side scripting (Node/Express)
- [x] User authentication (sessions + bcrypt)
- [x] Different user roles (student/tutor/admin)
- [x] CRUD operations
- [x] Form validation
- [x] Admin panel
- [x] Responsive design

## Team

Wayzata High School BPA Chapter

## Notes

- Make sure MongoDB is running before starting the app
- The seed script clears all data before adding test data
- Session secret should be changed in production
