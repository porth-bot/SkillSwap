// models/Session.js
const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    tutor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    skill: { type: String, required: true },
    scheduledDate: { type: Date },
    duration: { type: Number, default: 60 },
    location: { type: String, default: '' },
    notes: { type: String, default: '' },
    status: {
        type: String,
        enum: ['pending', 'scheduled', 'completed', 'cancelled'],
        default: 'pending'
    }
}, { timestamps: true });

module.exports = mongoose.model('Session', sessionSchema);
