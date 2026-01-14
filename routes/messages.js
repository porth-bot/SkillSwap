/**
 * Messages Routes
 * Conversation and messaging functionality
 * 
 * @module routes/messages
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { isAuthenticated } = require('../middleware/auth');
const { validateMessage, validateMongoId } = require('../middleware/validation');
const { Message, Conversation, User, AuditLog } = require('../models');

/**
 * GET /messages
 * List all conversations
 */
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        
        // Get all conversations for user
        const conversations = await Conversation.find({
            participants: userId,
            [`archived.${userId}`]: { $ne: true }
        })
        .populate('participants', 'firstName lastName username avatar')
        .populate('lastMessage')
        .sort('-updatedAt');
        
        // Calculate unread counts
        const conversationsWithUnread = conversations.map(conv => {
            const other = conv.participants.find(p => p._id.toString() !== userId.toString());
            return {
                ...conv.toObject(),
                otherUser: other,
                unreadCount: conv.unreadCount?.get(userId.toString()) || 0
            };
        });
        
        // Total unread count
        const totalUnread = conversationsWithUnread.reduce((sum, c) => sum + c.unreadCount, 0);
        
        res.render('pages/messages/index', {
            title: 'Messages',
            conversations: conversationsWithUnread,
            totalUnread
        });
        
    } catch (error) {
        console.error('Messages list error:', error);
        req.flash('error', 'Failed to load messages');
        res.redirect('/dashboard');
    }
});

/**
 * GET /messages/new/:userId
 * Start new conversation with user
 */
router.get('/new/:userId', isAuthenticated, validateMongoId('userId'), async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.session.userId;
        
        // Can't message yourself
        if (userId === currentUserId.toString()) {
            req.flash('error', 'You cannot message yourself');
            return res.redirect('/messages');
        }
        
        // Check if user exists and allows messaging
        const targetUser = await User.findById(userId)
            .select('firstName lastName username avatar privacy');
        
        if (!targetUser) {
            req.flash('error', 'User not found');
            return res.redirect('/messages');
        }
        
        if (targetUser.privacy?.allowMessaging === false) {
            req.flash('error', 'This user has disabled messaging');
            return res.redirect(`/profile/${targetUser.username}`);
        }
        
        // Check if conversation already exists
        const existingConv = await Conversation.findOne({
            participants: { $all: [currentUserId, userId] }
        });
        
        if (existingConv) {
            return res.redirect(`/messages/${existingConv._id}`);
        }
        
        res.render('pages/messages/new', {
            title: `Message ${targetUser.displayName}`,
            targetUser
        });
        
    } catch (error) {
        console.error('New message error:', error);
        req.flash('error', 'Failed to start conversation');
        res.redirect('/messages');
    }
});

/**
 * POST /messages/new/:userId
 * Send first message to start conversation
 */
router.post('/new/:userId', isAuthenticated, validateMongoId('userId'), validateMessage, async (req, res) => {
    try {
        const { userId: targetUserId } = req.params;
        const currentUserId = req.session.userId;
        const { content } = req.body;
        
        // Validation checks
        if (targetUserId === currentUserId.toString()) {
            req.flash('error', 'You cannot message yourself');
            return res.redirect('/messages');
        }
        
        const targetUser = await User.findById(targetUserId);
        if (!targetUser || targetUser.privacy?.allowMessaging === false) {
            req.flash('error', 'Cannot send message to this user');
            return res.redirect('/messages');
        }
        
        // Create or get conversation
        let conversation = await Conversation.findOne({
            participants: { $all: [currentUserId, targetUserId] }
        });
        
        if (!conversation) {
            conversation = await Conversation.create({
                participants: [currentUserId, targetUserId],
                unreadCount: new Map([[targetUserId.toString(), 1]])
            });
        }
        
        // Create message
        const message = await Message.create({
            conversation: conversation._id,
            sender: currentUserId,
            content: content.trim(),
            messageType: 'text'
        });
        
        // Update conversation
        conversation.lastMessage = message._id;
        conversation.unreadCount.set(targetUserId.toString(), 
            (conversation.unreadCount.get(targetUserId.toString()) || 0) + 1
        );
        await conversation.save();
        
        // Log activity
        await AuditLog.log(currentUserId, 'message_sent', 'message', message._id, {
            conversationId: conversation._id,
            recipientId: targetUserId
        }, req);
        
        req.flash('success', 'Message sent');
        res.redirect(`/messages/${conversation._id}`);
        
    } catch (error) {
        console.error('Send first message error:', error);
        req.flash('error', 'Failed to send message');
        res.redirect('/messages');
    }
});

/**
 * GET /messages/:conversationId
 * View conversation
 */
router.get('/:conversationId', isAuthenticated, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.session.userId;
        
        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
            req.flash('error', 'Invalid conversation');
            return res.redirect('/messages');
        }
        
        // Get conversation
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId
        }).populate('participants', 'firstName lastName username avatar');
        
        if (!conversation) {
            req.flash('error', 'Conversation not found');
            return res.redirect('/messages');
        }
        
        // Get messages with pagination
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = 50;
        const skip = (page - 1) * limit;
        
        const [messages, total] = await Promise.all([
            Message.find({ 
                conversation: conversationId,
                'deletedFor.user': { $ne: userId }
            })
            .populate('sender', 'firstName lastName username avatar')
            .sort('-createdAt')
            .skip(skip)
            .limit(limit),
            
            Message.countDocuments({ 
                conversation: conversationId,
                'deletedFor.user': { $ne: userId }
            })
        ]);
        
        // Mark messages as read
        await Message.updateMany(
            {
                conversation: conversationId,
                sender: { $ne: userId },
                'readBy.user': { $ne: userId }
            },
            {
                $push: { readBy: { user: userId, readAt: new Date() } }
            }
        );
        
        // Clear unread count
        conversation.unreadCount.set(userId.toString(), 0);
        await conversation.save();
        
        // Get other participant
        const otherUser = conversation.participants.find(
            p => p._id.toString() !== userId.toString()
        );
        
        const totalPages = Math.ceil(total / limit);
        
        res.render('pages/messages/conversation', {
            title: `Chat with ${otherUser.displayName}`,
            conversation,
            messages: messages.reverse(), // Show oldest first in view
            otherUser,
            pagination: {
                current: page,
                total: totalPages,
                hasMore: page < totalPages
            }
        });
        
    } catch (error) {
        console.error('View conversation error:', error);
        req.flash('error', 'Failed to load conversation');
        res.redirect('/messages');
    }
});

/**
 * POST /messages/:conversationId
 * Send message in conversation
 */
router.post('/:conversationId', isAuthenticated, validateMessage, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.session.userId;
        const { content, messageType = 'text' } = req.body;
        
        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
            return res.status(400).json({ success: false, error: 'Invalid conversation' });
        }
        
        // Get conversation
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId
        });
        
        if (!conversation) {
            return res.status(404).json({ success: false, error: 'Conversation not found' });
        }
        
        // Get other participant
        const otherUserId = conversation.participants.find(
            p => p.toString() !== userId.toString()
        );
        
        // Check if other user allows messaging
        const otherUser = await User.findById(otherUserId).select('privacy');
        if (otherUser?.privacy?.allowMessaging === false) {
            return res.status(403).json({ 
                success: false, 
                error: 'This user has disabled messaging' 
            });
        }
        
        // Create message
        const message = await Message.create({
            conversation: conversationId,
            sender: userId,
            content: content.trim(),
            messageType,
            deliveredTo: [{ user: userId, deliveredAt: new Date() }]
        });
        
        // Update conversation
        conversation.lastMessage = message._id;
        conversation.unreadCount.set(otherUserId.toString(), 
            (conversation.unreadCount.get(otherUserId.toString()) || 0) + 1
        );
        conversation.updatedAt = new Date();
        await conversation.save();
        
        // Populate sender for response
        await message.populate('sender', 'firstName lastName username avatar');
        
        // Return JSON for AJAX requests
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.json({
                success: true,
                message: {
                    _id: message._id,
                    content: message.content,
                    sender: message.sender,
                    createdAt: message.createdAt,
                    messageType: message.messageType
                }
            });
        }
        
        res.redirect(`/messages/${conversationId}`);
        
    } catch (error) {
        console.error('Send message error:', error);
        
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, error: 'Failed to send message' });
        }
        
        req.flash('error', 'Failed to send message');
        res.redirect(`/messages/${req.params.conversationId}`);
    }
});

/**
 * POST /messages/:conversationId/read
 * Mark all messages as read
 */
router.post('/:conversationId/read', isAuthenticated, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.session.userId;
        
        // Validate conversation access
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId
        });
        
        if (!conversation) {
            return res.status(404).json({ success: false, error: 'Conversation not found' });
        }
        
        // Mark all messages as read
        await Message.updateMany(
            {
                conversation: conversationId,
                sender: { $ne: userId },
                'readBy.user': { $ne: userId }
            },
            {
                $push: { readBy: { user: userId, readAt: new Date() } }
            }
        );
        
        // Clear unread count
        conversation.unreadCount.set(userId.toString(), 0);
        await conversation.save();
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ success: false, error: 'Failed to mark as read' });
    }
});

/**
 * DELETE /messages/:conversationId/message/:messageId
 * Delete a message (soft delete for sender)
 */
router.delete('/:conversationId/message/:messageId', isAuthenticated, async (req, res) => {
    try {
        const { conversationId, messageId } = req.params;
        const userId = req.session.userId;
        
        // Find message
        const message = await Message.findOne({
            _id: messageId,
            conversation: conversationId,
            sender: userId
        });
        
        if (!message) {
            return res.status(404).json({ 
                success: false, 
                error: 'Message not found or you cannot delete it' 
            });
        }
        
        // Check if within edit window (5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (message.createdAt < fiveMinutesAgo) {
            return res.status(403).json({ 
                success: false, 
                error: 'Messages can only be deleted within 5 minutes of sending' 
            });
        }
        
        // Soft delete
        await message.softDelete(userId);
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete message' });
    }
});

/**
 * PUT /messages/:conversationId/message/:messageId
 * Edit a message
 */
router.put('/:conversationId/message/:messageId', isAuthenticated, validateMessage, async (req, res) => {
    try {
        const { conversationId, messageId } = req.params;
        const userId = req.session.userId;
        const { content } = req.body;
        
        // Find message
        const message = await Message.findOne({
            _id: messageId,
            conversation: conversationId,
            sender: userId
        });
        
        if (!message) {
            return res.status(404).json({ 
                success: false, 
                error: 'Message not found or you cannot edit it' 
            });
        }
        
        // Check if editable
        if (!message.canModify) {
            return res.status(403).json({ 
                success: false, 
                error: 'Messages can only be edited within 5 minutes of sending' 
            });
        }
        
        // Edit message
        await message.edit(content.trim());
        
        res.json({ 
            success: true,
            message: {
                _id: message._id,
                content: message.content,
                isEdited: message.isEdited,
                editedAt: message.editedAt
            }
        });
        
    } catch (error) {
        console.error('Edit message error:', error);
        res.status(500).json({ success: false, error: 'Failed to edit message' });
    }
});

/**
 * POST /messages/:conversationId/archive
 * Archive conversation
 */
router.post('/:conversationId/archive', isAuthenticated, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.session.userId;
        
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId
        });
        
        if (!conversation) {
            return res.status(404).json({ success: false, error: 'Conversation not found' });
        }
        
        await conversation.archive(userId);
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Archive conversation error:', error);
        res.status(500).json({ success: false, error: 'Failed to archive' });
    }
});

/**
 * POST /messages/:conversationId/unarchive
 * Unarchive conversation
 */
router.post('/:conversationId/unarchive', isAuthenticated, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.session.userId;
        
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId
        });
        
        if (!conversation) {
            return res.status(404).json({ success: false, error: 'Conversation not found' });
        }
        
        conversation.archived.delete(userId.toString());
        await conversation.save();
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Unarchive conversation error:', error);
        res.status(500).json({ success: false, error: 'Failed to unarchive' });
    }
});

/**
 * GET /messages/archived
 * View archived conversations
 */
router.get('/archived', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        
        const conversations = await Conversation.find({
            participants: userId,
            [`archived.${userId}`]: true
        })
        .populate('participants', 'firstName lastName username avatar')
        .populate('lastMessage')
        .sort('-updatedAt');
        
        const conversationsWithUnread = conversations.map(conv => {
            const other = conv.participants.find(p => p._id.toString() !== userId.toString());
            return {
                ...conv.toObject(),
                otherUser: other,
                unreadCount: conv.unreadCount?.get(userId.toString()) || 0
            };
        });
        
        res.render('pages/messages/archived', {
            title: 'Archived Messages',
            conversations: conversationsWithUnread
        });
        
    } catch (error) {
        console.error('Archived messages error:', error);
        req.flash('error', 'Failed to load archived messages');
        res.redirect('/messages');
    }
});

/**
 * GET /messages/unread-count
 * Get total unread message count (for navbar badge)
 */
router.get('/unread-count', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        
        const result = await Conversation.aggregate([
            { $match: { participants: new mongoose.Types.ObjectId(userId) } },
            { $project: { 
                unread: { $ifNull: [`$unreadCount.${userId}`, 0] } 
            }},
            { $group: { _id: null, total: { $sum: '$unread' } } }
        ]);
        
        res.json({ 
            success: true, 
            count: result[0]?.total || 0 
        });
        
    } catch (error) {
        console.error('Unread count error:', error);
        res.status(500).json({ success: false, count: 0 });
    }
});

module.exports = router;
