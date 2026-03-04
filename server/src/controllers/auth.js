const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");

const { prisma } = require('../../lib/prisma.mjs');

function signAccessToken(user) {
    return jwt.sign(
        {
            sub: user.id,
            username: user.username,
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m" }
    );
}

async function createUser(req, res, next) {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        const user = await prisma.user.create({
            data: {
                username: req.body.username,
                displayName: req.body.displayName,
                hashedPassword
            },
            select: { id: true, username: true, displayName: true, createdAt: true }
        });

        return res.status(201).json({ user });
    } catch (err) {
        if (err.code === "P2002") {
            return res.status(409).json({ error: "Username already taken" });
        }
        return next(err);
    }
}

async function loginUser(req, res, next) {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required" });
        }

        const user = await prisma.user.findUnique({
            where: { username },
            select: { id: true, username: true, displayName: true, hashedPassword: true }
        });

        if (!user) return res.status(401).json({ error: "Invalid credentials" });

        const ok = await bcrypt.compare(password, user.hashedPassword);

        if (!ok) return res.status(401).json({ error: "Invalid credentials" });

        const token = signAccessToken(user);

        return res.json({
            accessToken: token,
            user: { id: user.id, username: user.username, displayName: user.displayName }
        });
    } catch (err) {
        return next(err);
    }
}

module.exports = {
    createUser,
    loginUser
};