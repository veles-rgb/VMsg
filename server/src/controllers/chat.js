const { prisma } = require('../../lib/prisma.mjs');

async function createDm(req, res, next) {
    try {
        const userId = req.user.id;
        const { targetId } = req.body;

        if (!targetId) {
            return res.status(400).json({ error: "targetId is required" });
        }

        if (targetId === userId) {
            return res.status(400).json({ error: "You cannot create a DM with yourself" });
        }

        // Check for existing chat
        const existing = await prisma.chat.findFirst({
            where: {
                type: 'DM',
                AND: [
                    {
                        participants: {
                            some: {
                                userId,
                                leftAt: null,
                            },
                        },
                    },
                    {
                        participants: {
                            some: {
                                userId: targetId,
                                leftAt: null,
                            },
                        },
                    },
                ],
            },
        });

        // Return chatId if existing
        if (existing) {
            return res.json({ chatId: existing.id });
        }

        // Create new chat
        const chat = await prisma.chat.create({
            data: {
                type: 'DM',
                createdByUserId: userId,
            },
        });

        // Create chat participants
        await prisma.chatParticipant.createMany({
            data: [
                {
                    chatId: chat.id,
                    userId,
                },
                {
                    chatId: chat.id,
                    userId: targetId,
                },
            ],
        });

        return res.status(201).json({ chatId: chat.id });
    } catch (err) {
        return next(err);
    }
}

async function createGroup(req, res, next) {

}

async function getAllChats(req, res, next) {

}

async function getChatById(req, res, next) {

}

async function getChatMessages(req, res, next) {

}

async function sendChatMsg(req, res, next) {

}

module.exports = {
    createDm,
    createGroup,
    getAllChats,
    getChatById,
    getChatMessages,
    sendChatMsg,
};