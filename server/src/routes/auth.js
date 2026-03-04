const router = require("express").Router();

// Auth controller
const controller = require('../controllers/auth.js');

router.post('/register', controller.createUser);
router.post("/login", controller.loginUser);

module.exports = router;