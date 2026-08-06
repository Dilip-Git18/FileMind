const express = require('express');
const { askQuestion, getChatHistory, deleteChatHistory } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', askQuestion);
router.get('/history', getChatHistory);
router.delete('/history', deleteChatHistory);

module.exports = router;
