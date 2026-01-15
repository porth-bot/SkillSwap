// routes/messages.js
const express = require('express');
const router = express.Router();
const { User, Message } = require('../models');
const { isAuthenticated } = require('../middleware');

router.get('/', isAuthenticated, async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [{ sender: req.session.userId }, { receiver: req.session.userId }]
        }).populate('sender receiver').sort('-createdAt');

        // group by conversation
        const conversations = {};
        messages.forEach(msg => {
            const otherId = msg.sender._id.toString() === req.session.userId.toString()
                ? msg.receiver._id.toString()
                : msg.sender._id.toString();
            if (!conversations[otherId]) {
                conversations[otherId] = {
                    user: msg.sender._id.toString() === req.session.userId.toString() ? msg.receiver : msg.sender,
                    messages: [],
                    lastMessage: msg
                };
            }
            conversations[otherId].messages.push(msg);
        });

        res.render('pages/messages/index', {
            title: 'Messages',
            conversations: Object.values(conversations)
        });
    } catch (err) {
        console.error(err);
        res.redirect('/dashboard');
    }
});

router.get('/:userId', isAuthenticated, async (req, res) => {
    try {
        const otherUser = await User.findById(req.params.userId);
        const messages = await Message.find({
            $or: [
                { sender: req.session.userId, receiver: req.params.userId },
                { sender: req.params.userId, receiver: req.session.userId }
            ]
        }).populate('sender receiver').sort('createdAt');

        // mark as read
        await Message.updateMany(
            { sender: req.params.userId, receiver: req.session.userId, read: false },
            { read: true }
        );

        res.render('pages/messages/conversation', {
            title: 'Chat with ' + otherUser.firstName,
            otherUser,
            messages
        });
    } catch (err) {
        res.redirect('/messages');
    }
});

router.post('/send', isAuthenticated, async (req, res) => {
    try {
        const message = new Message({
            sender: req.session.userId,
            receiver: req.body.receiver,
            content: req.body.content
        });
        await message.save();
        res.redirect('/messages/' + req.body.receiver);
    } catch (err) {
        req.flash('error', 'Failed to send');
        res.redirect('back');
    }
});

module.exports = router;
