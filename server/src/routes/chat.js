const router = require("express").Router();

// Controller
const controller = require('../controllers/chat');

router.post('/dm', controller.createDm);
router.post('/group', controller.createGroup);
router.get('/', controller.getAllChats);
router.get('/:chatId', controller.getChatById);
router.get('/:chatId/messages', controller.getChatMessages);
router.post('/:chatId/messages', controller.sendChatMsg);
router.patch('/:chatId/rename', controller.renameChat);
router.patch('/:chatId/add-to-group', controller.addToGroup);

module.exports = router;