const express = require('express');
const router = express.Router();

const chatSessionController = require('../controllers/chatSessionController');
const chatMessageController = require('../controllers/chatMessageController');

// get sessions for a user
router.get('/sessions', chatSessionController.getSessions);

// start chat
router.post('/start', chatSessionController.startChatSession);

// end chat
router.put('/:chat_id/end', chatSessionController.endChatSession);

// send message
router.post('/:chat_id/message', chatMessageController.sendMessage);

// get messages
router.get('/:chat_id/message', chatMessageController.getMessages);

module.exports = router;