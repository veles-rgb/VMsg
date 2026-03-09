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

module.exports = {
    heartbeat,
    getOnlineUsers,
};