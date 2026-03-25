const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");

const { prisma } = require('../../lib/prisma.mjs');

async function verify(req, res, next) {
    try {
        const dbUser = await prisma.user.findUnique({
            where: {
                id: req.user.id,
            },
            select: {
                id: true,
                username: true,
                displayName: true,
                profilePictureUrl: true,
            },
        });

        if (!dbUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.status(200).json({
            ok: true,
            user: dbUser,
        });
    } catch (err) {
        return next(err);
    }
}

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
    verify,
    createUser,
    loginUser
};