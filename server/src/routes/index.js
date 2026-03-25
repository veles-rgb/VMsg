const router = require("express").Router();
const { requireAuth } = require("../middleware/requireAuth");

// Routers
const authRouter = require('./auth.js');
const userRouter = require('./user.js');
const chatRouter = require('./chat.js');
const uploadRouter = require('./upload.js');

router.get('/health', async (req, res) => {
    const healthcheck = {
        uptime: process.uptime(),
        message: 'OK',
        timestamp: Date.now(),
    };

    try {
        res.status(200).json(healthcheck);
    } catch (error) {
        healthcheck.message = error.message;
        res.status(503).json(healthcheck);
    }
});

router.use('/auth', authRouter);
router.use('/user', requireAuth, userRouter);
router.use('/chat', requireAuth, chatRouter);
router.use('/upload', requireAuth, uploadRouter);

module.exports = router;