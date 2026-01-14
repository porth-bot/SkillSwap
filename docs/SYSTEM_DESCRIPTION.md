# SkillSwap System Description

## Business Professionals of America
## Web Application Team 2025-2026

---

## 1. Executive Summary

SkillSwap is a peer-to-peer tutoring platform designed to connect students who need academic help with fellow students who excel in those subjects. The application addresses the growing need for accessible, affordable, and relatable educational support within school communities.

### Key Objectives
- Facilitate knowledge exchange between students
- Provide a safe, moderated tutoring environment
- Enable flexible scheduling that fits student lives
- Build trust through reviews and verification
- Support administrative oversight and moderation

---

## 2. System Architecture

### 2.1 Overview

SkillSwap follows a traditional three-tier web architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION TIER                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Web Browser (Client)                    │   │
│  │  - HTML5/CSS3 Responsive UI                         │   │
│  │  - JavaScript Client-Side Logic                     │   │
│  │  - EJS Server-Side Rendered Templates               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION TIER                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Node.js / Express.js                    │   │
│  │  - RESTful API Endpoints                            │   │
│  │  - Authentication & Authorization                    │   │
│  │  - Business Logic Processing                        │   │
│  │  - Session Management                               │   │
│  │  - Input Validation                                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATA TIER                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  MongoDB Atlas                       │   │
│  │  - Document-Based Storage                           │   │
│  │  - User Data & Profiles                             │   │
│  │  - Sessions & Scheduling                            │   │
│  │  - Reviews & Ratings                                │   │
│  │  - Messages & Communications                        │   │
│  │  - Audit Logs                                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | HTML5, CSS3, JavaScript | User interface |
| Templating | EJS | Server-side rendering |
| Backend | Node.js (v18+) | Runtime environment |
| Framework | Express.js (v4.18) | Web application framework |
| Database | MongoDB (v6+) | Data persistence |
| ODM | Mongoose (v8.0) | Object modeling |
| Authentication | bcryptjs, express-session | Security |
| Validation | express-validator | Input sanitization |

---

## 3. Database Design

### 3.1 Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    USER      │       │   SESSION    │       │    REVIEW    │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ _id (PK)     │◄──────│ tutor (FK)   │       │ _id (PK)     │
│ name         │◄──────│ student (FK) │──────►│ reviewer(FK) │
│ email        │       │ skill        │       │ reviewee(FK) │
│ password     │       │ scheduledDate│◄──────│ session (FK) │
│ role         │       │ duration     │       │ rating       │
│ status       │       │ status       │       │ comment      │
│ bio          │       │ location     │       │ type         │
│ skillsOffered│       │ notes        │       │ status       │
│ skillsWanted │       │ rating       │       │ helpful      │
│ availability │       │ feedback     │       │ createdAt    │
│ rating       │       │ createdAt    │       └──────────────┘
│ reviewCount  │       └──────────────┘
│ sessionCount │
│ createdAt    │       ┌──────────────┐       ┌──────────────┐
└──────────────┘       │   MESSAGE    │       │  AUDIT_LOG   │
        │              ├──────────────┤       ├──────────────┤
        │              │ _id (PK)     │       │ _id (PK)     │
        └─────────────►│ sender (FK)  │       │ user (FK)    │◄┐
        └─────────────►│ receiver(FK) │       │ action       │ │
                       │ content      │       │ resource     │ │
                       │ read         │       │ resourceId   │ │
                       │ createdAt    │       │ details      │ │
                       └──────────────┘       │ ipAddress    │ │
                                              │ userAgent    │ │
                                              │ createdAt    │ │
                                              └──────────────┘ │
                                                      ▲        │
                                                      └────────┘
```

### 3.2 Collection Descriptions

**Users Collection**
- Stores all user accounts (students, tutors, admins)
- Contains profile information, skills, and availability
- Tracks rating and session statistics

**Sessions Collection**
- Records tutoring session requests and bookings
- Links tutors with students for specific skills
- Manages scheduling and session status

**Reviews Collection**
- Stores feedback between users after sessions
- Supports moderation workflow
- Tracks helpful votes

**Messages Collection**
- Enables direct communication between users
- Supports real-time messaging features
- Tracks read status

**AuditLog Collection**
- Records all significant system actions
- Supports security monitoring
- Enables compliance reporting

---

## 4. User Roles & Permissions

### 4.1 Role Matrix

| Feature | Student | Tutor | Admin |
|---------|:-------:|:-----:|:-----:|
| View explore page | ✓ | ✓ | ✓ |
| Request sessions | ✓ | ✓ | ✓ |
| Offer tutoring | ✗ | ✓ | ✓ |
| Accept/decline requests | ✗ | ✓ | ✓ |
| Write reviews | ✓ | ✓ | ✓ |
| Send messages | ✓ | ✓ | ✓ |
| Access admin panel | ✗ | ✗ | ✓ |
| Manage users | ✗ | ✗ | ✓ |
| Moderate reviews | ✗ | ✗ | ✓ |
| View audit logs | ✗ | ✗ | ✓ |
| Export data | ✗ | ✗ | ✓ |

### 4.2 Authentication Flow

```
┌─────────┐     ┌─────────────┐     ┌──────────────┐
│  User   │────►│ Login Form  │────►│ Validate     │
└─────────┘     └─────────────┘     │ Credentials  │
                                    └──────┬───────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
            ┌───────────────┐    ┌───────────────┐    ┌───────────────┐
            │    Invalid    │    │    Valid      │    │   Account     │
            │  Credentials  │    │  Credentials  │    │   Locked      │
            └───────┬───────┘    └───────┬───────┘    └───────┬───────┘
                    │                    │                    │
                    ▼                    ▼                    ▼
            ┌───────────────┐    ┌───────────────┐    ┌───────────────┐
            │ Error Message │    │Create Session │    │ Contact Admin │
            └───────────────┘    │ Set Cookie    │    └───────────────┘
                                 └───────┬───────┘
                                         │
                                         ▼
                                 ┌───────────────┐
                                 │   Redirect    │
                                 │  to Dashboard │
                                 └───────────────┘
```

---

## 5. Feature Specifications

### 5.1 Session Booking Flow

```
Student                    System                      Tutor
   │                         │                           │
   │  1. Browse Tutors       │                           │
   │────────────────────────►│                           │
   │                         │                           │
   │  2. View Profile        │                           │
   │────────────────────────►│                           │
   │                         │                           │
   │  3. Request Session     │                           │
   │────────────────────────►│                           │
   │                         │  4. Notification          │
   │                         │──────────────────────────►│
   │                         │                           │
   │                         │  5. Accept/Decline        │
   │                         │◄──────────────────────────│
   │  6. Confirmation        │                           │
   │◄────────────────────────│                           │
   │                         │                           │
   │        [ Session Occurs ]                           │
   │                         │                           │
   │  7. Leave Review        │                           │
   │────────────────────────►│                           │
   │                         │  8. Update Rating         │
   │                         │──────────────────────────►│
```

### 5.2 Admin Moderation Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Content   │────►│  Flagged    │────►│   Admin     │
│  Submitted  │     │  for Review │     │   Review    │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌──────────────────────────┼──────────────────────┐
                    │                          │                      │
                    ▼                          ▼                      ▼
            ┌───────────────┐        ┌───────────────┐      ┌───────────────┐
            │    Approve    │        │     Hide      │      │    Delete     │
            └───────┬───────┘        └───────┬───────┘      └───────┬───────┘
                    │                        │                      │
                    ▼                        ▼                      ▼
            ┌───────────────┐        ┌───────────────┐      ┌───────────────┐
            │   Publish     │        │  Remove from  │      │   Permanent   │
            │   Content     │        │    View       │      │   Removal     │
            └───────────────┘        └───────────────┘      └───────────────┘
```

---

## 6. Security Implementation

### 6.1 Security Measures

| Threat | Mitigation |
|--------|------------|
| Password attacks | Bcrypt hashing (10 rounds) |
| Session hijacking | HTTP-only, secure cookies |
| XSS attacks | EJS output escaping, CSP headers |
| CSRF attacks | Token validation |
| Brute force | Rate limiting (100 req/15min) |
| Injection | Input validation, parameterized queries |

### 6.2 Data Protection

- Passwords stored as bcrypt hashes (never plain text)
- Session data stored server-side only
- Sensitive operations logged to audit trail
- Role-based access control on all endpoints
- Input sanitization on all user inputs

---

## 7. Performance Considerations

### 7.1 Optimization Strategies

- **Database Indexing**: Indexes on frequently queried fields (email, status, dates)
- **Pagination**: All list views paginated (20 items default)
- **Caching**: Session data cached server-side
- **Lazy Loading**: Images and non-critical content loaded on demand
- **Minification**: CSS and JS minified for production

### 7.2 Scalability

- Stateless application design enables horizontal scaling
- MongoDB designed for distributed deployment
- Session store can be externalized (Redis ready)
- CDN-ready static assets

---

## 8. Testing Strategy

### 8.1 Test Coverage

| Type | Tools | Coverage |
|------|-------|----------|
| Unit Tests | Jest | Models, utilities |
| Integration Tests | Supertest | API endpoints |
| UI Testing | Manual | All user flows |
| Security Testing | Manual | OWASP Top 10 |
| Performance | Lighthouse | Core Web Vitals |

### 8.2 Quality Assurance

- Code review required for all changes
- Automated linting (ESLint)
- Browser compatibility testing (Chrome, Firefox, Safari, Edge)
- Mobile responsiveness testing

---

## 9. Deployment

### 9.1 Environment Requirements

**Development**
- Node.js v18+
- MongoDB v6+ (local or Atlas)
- 512MB RAM minimum

**Production**
- Node.js v18+ LTS
- MongoDB Atlas (M10+)
- 1GB RAM recommended
- HTTPS required

### 9.2 Deployment Checklist

- [ ] Environment variables configured
- [ ] Database connection verified
- [ ] HTTPS certificate installed
- [ ] Rate limiting enabled
- [ ] Error logging configured
- [ ] Backup strategy implemented
- [ ] Monitoring setup complete

---

## 10. Future Enhancements

### Phase 2 Features (Planned)
- Real-time chat with WebSocket
- Video tutoring integration
- Payment processing for premium tutors
- Mobile application
- AI-powered tutor matching
- Calendar sync (Google, Outlook)

### Technical Improvements
- GraphQL API layer
- Redis session store
- Elasticsearch for advanced search
- Kubernetes deployment
- CI/CD pipeline

---

## 11. Conclusion

SkillSwap demonstrates a complete, production-ready web application that addresses a real educational need. The system showcases:

- **Full-stack development** with modern JavaScript
- **Database-driven architecture** with MongoDB
- **Secure authentication** and authorization
- **Responsive design** for all devices
- **Administrative tools** for content moderation
- **Scalable architecture** for growth

The application meets all BPA Web Application Team requirements while providing genuine value to student communities.

---

*Document Version: 1.0*  
*Last Updated: December 2024*  
*Team: Wayzata High School BPA Chapter*
