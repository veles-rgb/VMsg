const router = require("express").Router();
const { requireAuth } = require("../middleware/requireAuth");

// Auth controller
const controller = require('../controllers/auth.js');

router.get('/verify', requireAuth, (req, res) => {
    return res.json({ ok: true, user: req.user });
});
router.post('/register', controller.createUser);
router.post("/login", controller.loginUser);

module.exports = router;