const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const chatSessionController = require('../controllers/chatSessionController');
const chatMessageController = require('../controllers/chatMessageController');

// get sessions for current user
router.get('/sessions', verifyToken, chatSessionController.getSessions);

// start chat
router.post('/start', verifyToken, chatSessionController.startChatSession);

// end chat
router.put('/:chat_id/end', verifyToken, chatSessionController.endChatSession);

// get messages
router.get('/:chat_id/message', verifyToken, chatMessageController.getMessages);

// send message
router.post('/:chat_id/message', verifyToken, chatMessageController.sendMessage);

module.exports = router;