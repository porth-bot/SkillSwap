/**
 * Session Routes - SkillSwap Student Talent Exchange Platform
 * 
 * Handles session scheduling, management, and completion.
 */

const express = require('express');
const router = express.Router();
const { User, Session, AuditLog, Conversation, Message } = require('../models');
const { 
    isAuthenticated,
    canAccessSession,
    validateSession,
    validateMongoId
} = require('../middleware');

/**
 * GET /sessions - List user's sessions
 */
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const { status, page = 1, limit = 10 } = req.query;
        
        const query = {
            $or: [{ tutor: userId }, { student: userId }]
        };
        
        if (status && status !== 'all') {
            query.status = status;
        }
        
        const sessions = await Session.find(query)
            .populate('tutor', 'firstName lastName username avatar')
            .populate('student', 'firstName lastName username avatar')
            .sort({ scheduledDate: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        
        const total = await Session.countDocuments(query);
        
        // Get upcoming sessions for sidebar
        const upcomingSessions = await Session.getUpcoming(userId, 5);
        
        res.render('sessions/list', {
            title: 'My Sessions - SkillSwap',
            sessions,
            upcomingSessions,
            currentFilter: status || 'all',
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('Sessions list error:', error);
        req.session.flash = {
            type: 'error',
            message: 'Failed to load sessions'
        };
        res.redirect('/dashboard');
    }
});

/**
 * GET /sessions/request/:userId - Request session with user
 */
router.get('/request/:userId', isAuthenticated, validateMongoId('userId'), async (req, res) => {
    try {
        const tutor = await User.findById(req.params.userId);
        
        if (!tutor || !tutor.isActive) {
            req.session.flash = {
                type: 'error',
                message: 'User not found'
            };
            return res.redirect('/explore');
        }
        
        if (tutor._id.toString() === req.session.userId) {
            req.session.flash = {
                type: 'error',
                message: 'You cannot request a session with yourself'
            };
            return res.redirect('/explore');
        }
        
        res.render('sessions/request', {
            title: `Request Session with ${tutor.displayName} - SkillSwap`,
            tutor,
            skills: tutor.skillsOffered,
            formData: req.session.formData || {}
        });
        delete req.session.formData;
        
    } catch (error) {
        console.error('Session request page error:', error);
        res.redirect('/explore');
    }
});

/**
 * POST /sessions/request/:userId - Create session request
 */
router.post('/request/:userId', isAuthenticated, validateMongoId('userId'), validateSession, async (req, res) => {
    try {
        const tutorId = req.params.userId;
        const studentId = req.session.userId;
        
        // Validate tutor exists
        const tutor = await User.findById(tutorId);
        if (!tutor || !tutor.isActive) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Create session
        const session = new Session({
            tutor: tutorId,
            student: studentId,
            title: req.body.title,
            description: req.body.description,
            skill: req.body.skill,
            scheduledDate: new Date(req.body.scheduledDate),
            duration: parseInt(req.body.duration),
            format: req.body.format || 'virtual',
            location: req.body.location,
            meetingLink: req.body.meetingLink,
            request: {
                message: req.body.message,
                requestedAt: new Date()
            }
        });
        
        await session.save();
        
        // Log session creation
        await AuditLog.log({
            user: studentId,
            action: 'SESSION_CREATE',
            category: 'session',
            description: `Session requested with ${tutor.email}`,
            targetType: 'Session',
            targetId: session._id,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });
        
        // Create or update conversation with session notification
        const conversation = await Conversation.getOrCreate([studentId, tutorId], session._id);
        
        // Send session request message
        const student = await User.findById(studentId);
        const message = new Message({
            conversation: conversation._id,
            sender: studentId,
            content: `📅 Session Request: ${req.body.title}\n\n${req.body.message || 'I would like to schedule a session with you.'}`,
            messageType: 'session-request',
            relatedSession: session._id
        });
        await message.save();
        
        // Award points for requesting session
        await student.addAchievement({
            name: 'Session Seeker',
            description: 'Requested your first learning session',
            icon: '🔍',
            points: 5
        });
        
        req.session.flash = {
            type: 'success',
            message: 'Session request sent successfully!'
        };
        
        res.redirect(`/sessions/${session._id}`);
        
    } catch (error) {
        console.error('Session create error:', error);
        req.session.flash = {
            type: 'error',
            message: 'Failed to create session request'
        };
        req.session.formData = req.body;
        res.redirect('back');
    }
});

/**
 * GET /sessions/:id - View session details
 */
router.get('/:id', isAuthenticated, validateMongoId(), canAccessSession, async (req, res) => {
    try {
        const session = await Session.findById(req.params.id)
            .populate('tutor', 'firstName lastName username avatar email skillsOffered stats')
            .populate('student', 'firstName lastName username avatar email skillsSought stats');
        
        const userId = req.session.userId;
        const isTutor = session.tutor._id.toString() === userId;
        const isStudent = session.student._id.toString() === userId;
        
        // Get reviews if session is completed
        let reviews = [];
        if (session.status === 'completed') {
            const { Review } = require('../models');
            reviews = await Review.find({ session: session._id })
                .populate('reviewer', 'firstName lastName username avatar');
        }
        
        res.render('sessions/view', {
            title: `${session.title} - SkillSwap`,
            session,
            isTutor,
            isStudent,
            reviews,
            canReview: session.status === 'completed' && !reviews.some(
                r => r.reviewer._id.toString() === userId
            )
        });
        
    } catch (error) {
        console.error('Session view error:', error);
        req.session.flash = {
            type: 'error',
            message: 'Failed to load session'
        };
        res.redirect('/sessions');
    }
});

/**
 * POST /sessions/:id/confirm - Confirm session
 */
router.post('/:id/confirm', isAuthenticated, validateMongoId(), canAccessSession, async (req, res) => {
    try {
        const session = req.sessionDoc;
        const userId = req.session.userId;
        
        // Only tutor can confirm
        if (session.tutor.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Only the tutor can confirm sessions'
            });
        }
        
        await session.confirm(userId);
        
        // Log confirmation
        await AuditLog.log({
            user: userId,
            action: 'SESSION_CONFIRM',
            category: 'session',
            description: `Session confirmed: ${session.title}`,
            targetType: 'Session',
            targetId: session._id
        });
        
        // Send confirmation message
        const conversation = await Conversation.getOrCreate(
            [session.tutor.toString(), session.student.toString()],
            session._id
        );
        
        const message = new Message({
            conversation: conversation._id,
            sender: userId,
            content: `✅ Session Confirmed: ${session.title}\n\nI've confirmed our session for ${new Date(session.scheduledDate).toLocaleString()}. Looking forward to it!`,
            messageType: 'session-update',
            relatedSession: session._id
        });
        await message.save();
        
        res.json({
            success: true,
            message: 'Session confirmed successfully'
        });
        
    } catch (error) {
        console.error('Session confirm error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to confirm session'
        });
    }
});

/**
 * POST /sessions/:id/cancel - Cancel session
 */
router.post('/:id/cancel', isAuthenticated, validateMongoId(), canAccessSession, async (req, res) => {
    try {
        const session = req.sessionDoc;
        const userId = req.session.userId;
        const { reason } = req.body;
        
        await session.cancel(userId, reason);
        
        // Log cancellation
        await AuditLog.log({
            user: userId,
            action: 'SESSION_CANCEL',
            category: 'session',
            description: `Session cancelled: ${session.title}. Reason: ${reason}`,
            targetType: 'Session',
            targetId: session._id
        });
        
        // Send cancellation message
        const conversation = await Conversation.getOrCreate(
            [session.tutor.toString(), session.student.toString()],
            session._id
        );
        
        const message = new Message({
            conversation: conversation._id,
            sender: userId,
            content: `❌ Session Cancelled: ${session.title}\n\nReason: ${reason || 'No reason provided'}`,
            messageType: 'session-update',
            relatedSession: session._id
        });
        await message.save();
        
        res.json({
            success: true,
            message: 'Session cancelled'
        });
        
    } catch (error) {
        console.error('Session cancel error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to cancel session'
        });
    }
});

/**
 * POST /sessions/:id/start - Start session
 */
router.post('/:id/start', isAuthenticated, validateMongoId(), canAccessSession, async (req, res) => {
    try {
        const session = req.sessionDoc;
        
        await session.start();
        
        res.json({
            success: true,
            message: 'Session started'
        });
        
    } catch (error) {
        console.error('Session start error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to start session'
        });
    }
});

/**
 * POST /sessions/:id/complete - Complete session
 */
router.post('/:id/complete', isAuthenticated, validateMongoId(), canAccessSession, async (req, res) => {
    try {
        const session = req.sessionDoc;
        const userId = req.session.userId;
        
        await session.complete(20, 10);
        
        // Update user stats
        const tutor = await User.findById(session.tutor);
        const student = await User.findById(session.student);
        
        tutor.stats.sessionsHosted += 1;
        tutor.stats.totalHoursTaught += session.duration / 60;
        tutor.points += 20;
        await tutor.save();
        
        student.stats.sessionsCompleted += 1;
        student.stats.totalHoursLearned += session.duration / 60;
        student.points += 10;
        await student.save();
        
        // Check for achievements
        if (tutor.stats.sessionsHosted === 1) {
            await tutor.addAchievement({
                name: 'First Session Hosted',
                description: 'Completed your first session as a tutor',
                icon: '🎓',
                points: 25
            });
        }
        
        if (student.stats.sessionsCompleted === 1) {
            await student.addAchievement({
                name: 'First Lesson Learned',
                description: 'Completed your first learning session',
                icon: '📝',
                points: 15
            });
        }
        
        // Log completion
        await AuditLog.log({
            user: userId,
            action: 'SESSION_COMPLETE',
            category: 'session',
            description: `Session completed: ${session.title}`,
            targetType: 'Session',
            targetId: session._id
        });
        
        res.json({
            success: true,
            message: 'Session completed! Please leave a review.',
            redirectUrl: `/sessions/${session._id}?showReview=true`
        });
        
    } catch (error) {
        console.error('Session complete error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to complete session'
        });
    }
});

/**
 * POST /sessions/:id/notes - Update session notes
 */
router.post('/:id/notes', isAuthenticated, validateMongoId(), canAccessSession, async (req, res) => {
    try {
        const session = await Session.findById(req.params.id);
        const userId = req.session.userId;
        const { notes } = req.body;
        
        if (session.tutor.toString() === userId) {
            session.tutorNotes = notes;
        } else {
            session.studentNotes = notes;
        }
        
        await session.save();
        
        res.json({
            success: true,
            message: 'Notes saved'
        });
        
    } catch (error) {
        console.error('Save notes error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save notes'
        });
    }
});

module.exports = router;
