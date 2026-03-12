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
    try {
        const userId = req.user.id;

        const chats = await prisma.chat.findMany({
            where: {
                participants: {
                    some: {
                        userId,
                        leftAt: null,
                    },
                },
            },
            orderBy: {
                lastMessageAt: 'desc',
            },
            include: {
                participants: {
                    where: {
                        leftAt: null,
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                displayName: true,
                            },
                        },
                    },
                },
            },
        });

        const chatsWithOtherParticipants = chats.map((chat) => {
            const otherParticipants = chat.participants.filter(
                (participant) => participant.userId !== userId
            );

            return {
                ...chat,
                otherParticipants,
            };
        });

        return res.json({ chats: chatsWithOtherParticipants });
    } catch (err) {
        return next(err);
    }
}

async function getChatById(req, res, next) {
    try {
        const { chatId } = req.params;
        const userId = req.user.id;

        const chat = await prisma.chat.findFirst({
            where: {
                id: chatId,
                participants: {
                    some: {
                        userId,
                        leftAt: null,
                    },
                },
            },
            include: {
                participants: {
                    where: {
                        leftAt: null,
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                displayName: true,
                            },
                        },
                    },
                },
            },
        });

        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        const otherParticipants = chat.participants.filter(
            (participant) => participant.userId !== userId
        );

        return res.json({ chat, otherParticipants });
    } catch (err) {
        return next(err);
    }
}

async function getChatMessages(req, res, next) {
    try {
        const { chatId } = req.params;
        const userId = req.user.id;

        const chat = await prisma.chat.findFirst({
            where: {
                id: chatId,
                participants: {
                    some: {
                        userId,
                        leftAt: null,
                    },
                },
            },
            select: {
                id: true,
            },
        });

        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        const messages = await prisma.message.findMany({
            where: {
                chatId,
            },
            orderBy: {
                sentAt: 'asc',
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                    },
                },
            },
        });

        return res.json({ messages });
    } catch (err) {
        return next(err);
    }
}

async function sendChatMsg(req, res, next) {
    try {
        const { chatId } = req.params;
        const { content } = req.body;
        const senderUserId = req.user.id;

        if (!content || !content.trim()) {
            return res.status(400).json({ error: "Message content is required" });
        }

        const chat = await prisma.chat.findFirst({
            where: {
                id: chatId,
                participants: {
                    some: {
                        userId: senderUserId,
                        leftAt: null,
                    },
                },
            },
            select: { id: true },
        });

        if (!chat) {
            return res.status(404).json({ error: "Chat not found" });
        }

        const message = await prisma.message.create({
            data: {
                chatId,
                senderUserId,
                content: content.trim(),
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                    },
                },
            },
        });

        await prisma.chat.update({
            where: { id: chatId },
            data: { lastMessageAt: new Date() },
        });

        return res.status(201).json({ message });
    } catch (err) {
        return next(err);
    }
}

async function renameChat(req, res, next) {
    try {
        const { chatId } = req.params;
        const userId = req.user.id;
        const { newTitle } = req.body;

        const chat = await prisma.chat.findFirst({
            where: {
                id: chatId,
                participants: {
                    some: {
                        userId: userId,
                        leftAt: null,
                    },
                },
            },
        });

        if (!chat) {
            return res.status(404).json({ message: "Chat not found" });
        }

        await prisma.chat.update({
            where: {
                id: chatId,
                participants: {
                    some: {
                        userId: userId,
                        leftAt: null,
                    },
                },
            },
            data: {
                title: newTitle
            }
        });

        return res.status(200).json({ message: 'Chat title updated' });
    } catch (err) {
        return next(err);
    }
}

async function leaveChat(params) {

}

module.exports = {
    createDm,
    createGroup,
    getAllChats,
    getChatById,
    getChatMessages,
    sendChatMsg,
    renameChat,
};