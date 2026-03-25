const router = require("express").Router();
const { requireAuth } = require("../middleware/requireAuth");

// Auth controller
const controller = require('../controllers/auth.js');

router.get('/verify', requireAuth, controller.verify);
router.post('/register', controller.createUser);
router.post("/login", controller.loginUser);

module.exports = router;