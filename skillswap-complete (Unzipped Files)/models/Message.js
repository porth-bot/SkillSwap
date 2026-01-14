/**
 * Message Model - SkillSwap Student Talent Exchange Platform
 * 
 * Handles direct messaging between users for coordination.
 * Features: Conversations, read receipts, attachment support
 */

const mongoose = require('mongoose');

// Conversation schema for grouping messages
const conversationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    
    // Last message for preview
    lastMessage: {
        content: String,
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        sentAt: Date
    },
    
    // Unread counts per participant
    unreadCounts: {
        type: Map,
        of: Number,
        default: {}
    },
    
    // Related session (optional)
    relatedSession: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session'
    },
    
    // Conversation status
    isActive: {
        type: Boolean,
        default: true
    },
    
    // Archive status per user
    archivedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    
    // Muted by users
    mutedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
    
}, {
    timestamps: true
});

// Indexes for conversations
conversationSchema.index({ participants: 1 });
conversationSchema.index({ 'lastMessage.sentAt': -1 });

// Message schema
const messageSchema = new mongoose.Schema({
    conversation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
        index: true
    },
    
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Message content
    content: {
        type: String,
        required: [true, 'Message content is required'],
        maxlength: 5000
    },
    
    // Message type
    messageType: {
        type: String,
        enum: ['text', 'session-request', 'session-update', 'system'],
        default: 'text'
    },
    
    // Read status
    readBy: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        readAt: { type: Date, default: Date.now }
    }],
    
    // Delivery status
    deliveredTo: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        deliveredAt: { type: Date, default: Date.now }
    }],
    
    // Attachments (file references)
    attachments: [{
        filename: String,
        originalName: String,
        mimeType: String,
        size: Number,
        url: String
    }],
    
    // Message editing
    isEdited: {
        type: Boolean,
        default: false
    },
    editedAt: Date,
    originalContent: String,
    
    // Message deletion (soft delete)
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: Date,
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    // Related entities
    relatedSession: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session'
    },
    
    // Reactions
    reactions: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        emoji: String,
        reactedAt: { type: Date, default: Date.now }
    }]
    
}, {
    timestamps: true
});

// Indexes
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ content: 'text' });

// Virtual for read status check
messageSchema.virtual('isRead').get(function() {
    return this.readBy.length > 0;
});

// Pre-save to update conversation's last message
messageSchema.pre('save', async function(next) {
    if (this.isNew) {
        const Conversation = mongoose.model('Conversation');
        await Conversation.findByIdAndUpdate(this.conversation, {
            lastMessage: {
                content: this.content.substring(0, 100),
                sender: this.sender,
                sentAt: new Date()
            },
            $inc: { [`unreadCounts.${this.sender}`]: 0 } // Initialize if needed
        });
    }
    next();
});

// Method to mark as read
messageSchema.methods.markAsRead = async function(userId) {
    const alreadyRead = this.readBy.some(
        r => r.user.toString() === userId.toString()
    );
    
    if (!alreadyRead && this.sender.toString() !== userId.toString()) {
        this.readBy.push({
            user: userId,
            readAt: new Date()
        });
        await this.save();
        
        // Update conversation unread count
        const Conversation = mongoose.model('Conversation');
        await Conversation.findByIdAndUpdate(this.conversation, {
            $set: { [`unreadCounts.${userId}`]: 0 }
        });
    }
    
    return this;
};

// Method to edit message
messageSchema.methods.edit = async function(newContent) {
    if (!this.originalContent) {
        this.originalContent = this.content;
    }
    this.content = newContent;
    this.isEdited = true;
    this.editedAt = new Date();
    
    return this.save();
};

// Method to soft delete
messageSchema.methods.softDelete = async function(userId) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = userId;
    this.content = '[Message deleted]';
    
    return this.save();
};

// Method to add reaction
messageSchema.methods.addReaction = async function(userId, emoji) {
    const existingIndex = this.reactions.findIndex(
        r => r.user.toString() === userId.toString()
    );
    
    if (existingIndex > -1) {
        if (this.reactions[existingIndex].emoji === emoji) {
            // Remove reaction if same emoji
            this.reactions.splice(existingIndex, 1);
        } else {
            // Update emoji
            this.reactions[existingIndex].emoji = emoji;
            this.reactions[existingIndex].reactedAt = new Date();
        }
    } else {
        // Add new reaction
        this.reactions.push({
            user: userId,
            emoji: emoji
        });
    }
    
    return this.save();
};

// Static method to get or create conversation
conversationSchema.statics.getOrCreate = async function(participants, sessionId = null) {
    // Sort participants for consistent lookup
    const sortedParticipants = participants.sort();
    
    let conversation = await this.findOne({
        participants: { $all: sortedParticipants, $size: sortedParticipants.length }
    });
    
    if (!conversation) {
        conversation = new this({
            participants: sortedParticipants,
            relatedSession: sessionId
        });
        await conversation.save();
    }
    
    return conversation;
};

// Static method to get conversations for a user
conversationSchema.statics.getForUser = function(userId) {
    return this.find({
        participants: userId,
        archivedBy: { $ne: userId },
        isActive: true
    })
    .populate('participants', 'firstName lastName username avatar')
    .populate('lastMessage.sender', 'firstName lastName username')
    .sort({ 'lastMessage.sentAt': -1 });
};

// Method to archive conversation
conversationSchema.methods.archive = async function(userId) {
    if (!this.archivedBy.includes(userId)) {
        this.archivedBy.push(userId);
        await this.save();
    }
    return this;
};

// Method to unarchive
conversationSchema.methods.unarchive = async function(userId) {
    this.archivedBy = this.archivedBy.filter(
        id => id.toString() !== userId.toString()
    );
    await this.save();
    return this;
};

// Method to mute/unmute
conversationSchema.methods.toggleMute = async function(userId) {
    const index = this.mutedBy.indexOf(userId);
    if (index > -1) {
        this.mutedBy.splice(index, 1);
    } else {
        this.mutedBy.push(userId);
    }
    await this.save();
    return this;
};

const Conversation = mongoose.model('Conversation', conversationSchema);
const Message = mongoose.model('Message', messageSchema);

module.exports = { Conversation, Message };
