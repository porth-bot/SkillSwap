/**
 * AuditLog Model - SkillSwap Student Talent Exchange Platform
 * 
 * Comprehensive audit logging for security and admin monitoring.
 * Features: Action tracking, IP logging, detailed metadata
 */

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    // Who performed the action
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    userEmail: String, // Stored for historical purposes even if user is deleted
    userRole: String,
    
    // What action was performed
    action: {
        type: String,
        required: true,
        enum: [
            // Authentication actions
            'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_CHANGE', 'PASSWORD_RESET',
            'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED',
            
            // User management
            'USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'USER_DEACTIVATE',
            'USER_ACTIVATE', 'PROFILE_UPDATE', 'ROLE_CHANGE',
            
            // Session actions
            'SESSION_CREATE', 'SESSION_UPDATE', 'SESSION_DELETE',
            'SESSION_CONFIRM', 'SESSION_CANCEL', 'SESSION_COMPLETE',
            
            // Review actions
            'REVIEW_CREATE', 'REVIEW_UPDATE', 'REVIEW_DELETE', 'REVIEW_FLAG',
            
            // Message actions
            'MESSAGE_SEND', 'MESSAGE_DELETE',
            
            // Admin actions
            'ADMIN_USER_VIEW', 'ADMIN_USER_EDIT', 'ADMIN_USER_DELETE',
            'ADMIN_REPORT_GENERATE', 'ADMIN_SETTINGS_CHANGE',
            'ADMIN_CONTENT_MODERATE',
            
            // Security events
            'SUSPICIOUS_ACTIVITY', 'RATE_LIMIT_EXCEEDED', 'INVALID_ACCESS_ATTEMPT',
            
            // System events
            'SYSTEM_ERROR', 'DATA_EXPORT', 'DATA_IMPORT'
        ],
        index: true
    },
    
    // Category for easier filtering
    category: {
        type: String,
        enum: ['auth', 'user', 'session', 'review', 'message', 'admin', 'security', 'system'],
        required: true,
        index: true
    },
    
    // Severity level
    severity: {
        type: String,
        enum: ['info', 'warning', 'error', 'critical'],
        default: 'info'
    },
    
    // Description of the action
    description: {
        type: String,
        required: true,
        maxlength: 1000
    },
    
    // Target resource
    targetType: {
        type: String,
        enum: ['User', 'Session', 'Review', 'Message', 'Conversation', 'System']
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true
    },
    
    // Request metadata
    ipAddress: String,
    userAgent: String,
    requestMethod: String,
    requestPath: String,
    
    // Additional data
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    
    // Before/After for tracking changes
    previousValues: {
        type: mongoose.Schema.Types.Mixed
    },
    newValues: {
        type: mongoose.Schema.Types.Mixed
    },
    
    // Status of the action
    status: {
        type: String,
        enum: ['success', 'failure', 'pending'],
        default: 'success'
    },
    
    // Error details if failed
    errorMessage: String,
    errorStack: String
    
}, {
    timestamps: true
});

// Indexes for efficient querying
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ category: 1, createdAt: -1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });
auditLogSchema.index({ ipAddress: 1, createdAt: -1 });

// TTL index to auto-delete old logs (keep for 90 days)
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Static method to log an action
auditLogSchema.statics.log = async function(data) {
    try {
        const log = new this(data);
        await log.save();
        return log;
    } catch (error) {
        console.error('Failed to create audit log:', error);
        return null;
    }
};

// Static method to log authentication events
auditLogSchema.statics.logAuth = function(action, user, req, status = 'success', error = null) {
    return this.log({
        user: user?._id,
        userEmail: user?.email,
        userRole: user?.role,
        action,
        category: 'auth',
        severity: status === 'failure' ? 'warning' : 'info',
        description: `${action}: ${user?.email || 'Unknown user'}`,
        ipAddress: req?.ip || req?.connection?.remoteAddress,
        userAgent: req?.get('user-agent'),
        requestMethod: req?.method,
        requestPath: req?.originalUrl,
        status,
        errorMessage: error?.message
    });
};

// Static method to log admin actions
auditLogSchema.statics.logAdmin = function(action, admin, target, description, metadata = {}) {
    return this.log({
        user: admin._id,
        userEmail: admin.email,
        userRole: admin.role,
        action,
        category: 'admin',
        severity: 'info',
        description,
        targetType: target?.constructor?.modelName,
        targetId: target?._id,
        metadata
    });
};

// Static method to log security events
auditLogSchema.statics.logSecurity = function(action, req, description, severity = 'warning') {
    return this.log({
        action,
        category: 'security',
        severity,
        description,
        ipAddress: req?.ip || req?.connection?.remoteAddress,
        userAgent: req?.get('user-agent'),
        requestMethod: req?.method,
        requestPath: req?.originalUrl,
        metadata: {
            headers: req?.headers,
            query: req?.query,
            body: req?.body ? Object.keys(req.body) : []
        }
    });
};

// Static method to get logs with filtering
auditLogSchema.statics.getLogs = function(filters = {}, options = {}) {
    const query = {};
    
    if (filters.user) query.user = filters.user;
    if (filters.action) query.action = filters.action;
    if (filters.category) query.category = filters.category;
    if (filters.severity) query.severity = filters.severity;
    if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }
    if (filters.ipAddress) query.ipAddress = filters.ipAddress;
    
    const limit = options.limit || 100;
    const skip = options.skip || 0;
    const sort = options.sort || { createdAt: -1 };
    
    return this.find(query)
        .populate('user', 'firstName lastName email username')
        .sort(sort)
        .skip(skip)
        .limit(limit);
};

// Static method to get summary statistics
auditLogSchema.statics.getSummary = async function(startDate, endDate) {
    const matchStage = {};
    if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) matchStage.createdAt.$gte = new Date(startDate);
        if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }
    
    const summary = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: {
                    category: '$category',
                    action: '$action'
                },
                count: { $sum: 1 },
                successCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
                },
                failureCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] }
                }
            }
        },
        {
            $group: {
                _id: '$_id.category',
                actions: {
                    $push: {
                        action: '$_id.action',
                        count: '$count',
                        successCount: '$successCount',
                        failureCount: '$failureCount'
                    }
                },
                totalCount: { $sum: '$count' }
            }
        },
        { $sort: { totalCount: -1 } }
    ]);
    
    // Get security events specifically
    const securityEvents = await this.aggregate([
        {
            $match: {
                ...matchStage,
                category: 'security'
            }
        },
        {
            $group: {
                _id: '$severity',
                count: { $sum: 1 }
            }
        }
    ]);
    
    // Get unique IPs with suspicious activity
    const suspiciousIPs = await this.aggregate([
        {
            $match: {
                ...matchStage,
                severity: { $in: ['warning', 'error', 'critical'] }
            }
        },
        {
            $group: {
                _id: '$ipAddress',
                count: { $sum: 1 },
                actions: { $addToSet: '$action' }
            }
        },
        { $match: { count: { $gte: 3 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
    ]);
    
    return {
        byCategory: summary,
        securityEvents,
        suspiciousIPs
    };
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
