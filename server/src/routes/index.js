const router = require("express").Router();
const { requireAuth } = require("../middleware/requireAuth");
const authRouter = require('./auth.js');

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

module.exports = router;