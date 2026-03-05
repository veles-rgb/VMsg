const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");

const { prisma } = require('../../lib/prisma.mjs');

async function createUser(req, res, next) {
    try {
        const { username, displayName, password } = req.body;

        if (!username || !displayName || !password) {
            return res.status(400).json({ error: "username, displayName, and password are required" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                username,
                displayName,
                hashedPassword,
            },
            select: { id: true, username: true, displayName: true, createdAt: true },
        });

        const accessToken = jwt.sign(
            {
                sub: user.id,
                username: user.username,
                displayName: user.displayName,
            },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "1h" }
        );

        return res.status(201).json({ accessToken, user });
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

        const token = jwt.sign(
            {
                sub: user.id,
                username: user.username,
                displayName: user.displayName
            },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "1h" }
        );

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