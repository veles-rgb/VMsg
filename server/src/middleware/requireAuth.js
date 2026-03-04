const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
    try {
        const header = req.headers.authorization;
        const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

        if (!token) return res.status(401).json({ error: "Missing token" });

        const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        req.user = {
            id: payload.sub,
            username: payload.username,
        };

        return next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}

module.exports = { requireAuth };