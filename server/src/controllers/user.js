const { prisma } = require('../../lib/prisma.mjs');

async function heartbeat(req, res, next) {
    try {
        await prisma.user.update({
            where: {
                id: req.user.id,
            },
            data: {
                lastSeenAt: new Date()
            },
        });

        return res.json({ ok: true });
    } catch (err) {
        return next(err);
    }
}

async function getOnlineUsers(req, res, next) {
    try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        const online = await prisma.user.findMany({
            where: {
                lastSeenAt: {
                    gte: fiveMinutesAgo
                }
            },
            orderBy: {
                displayName: 'asc'
            },
            select: {
                id: true,
                username: true,
                displayName: true,
                lastSeenAt: true
            },
        });

        return res.json({ users: online });
    } catch (err) {
        return next(err);
    }
}

async function searchUsers(req, res, next) {
    try {
        const userId = req.user.id;
        const { q } = req.query;

        if (!q || q.trim().length === 0) {
            return res.json({ users: [] });
        }

        const users = await prisma.user.findMany({
            where: {
                id: {
                    not: userId
                },
                OR: [
                    {
                        username: {
                            contains: q,
                            mode: "insensitive"
                        }
                    },
                    {
                        displayName: {
                            contains: q,
                            mode: "insensitive"
                        }
                    }
                ]
            },
            select: {
                id: true,
                username: true,
                displayName: true
            },
            take: 20,
            orderBy: {
                displayName: "asc"
            }
        });

        return res.json({ users });
    } catch (err) {
        return next(err);
    }
}

module.exports = {
    heartbeat,
    getOnlineUsers,
    searchUsers,
};