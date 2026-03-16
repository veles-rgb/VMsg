const router = require("express").Router();

// Controller
const controller = require('../controllers/user');

router.get('/online', controller.getOnlineUsers);
router.post('/heartbeat', controller.heartbeat);
router.get('/search', controller.searchUsers);

module.exports = router;