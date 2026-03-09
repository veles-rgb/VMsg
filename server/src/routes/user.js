const router = require("express").Router();

// Controller
const controller = require('../controllers/user');

router.get('/online', controller.getOnlineUsers);
router.post('/heartbeat', controller.heartbeat);

module.exports = router;