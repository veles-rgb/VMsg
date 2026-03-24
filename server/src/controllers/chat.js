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
    try {
        const createdByUserId = req.user.id;
        const { title, participants } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Group title is required' });
        }

        if (!Array.isArray(participants) || participants.length === 0) {
            return res.status(400).json({ error: 'At least one participant is required' });
        }

        const uniqueParticipantIds = [...new Set(participants)].filter(
            (id) => id && id !== createdByUserId
        );

        if (uniqueParticipantIds.length === 0) {
            return res.status(400).json({ error: 'At least one other user must be selected' });
        }

        const validUsers = await prisma.user.findMany({
            where: {
                id: {
                    in: uniqueParticipantIds,
                },
            },
            select: {
                id: true,
            },
        });

        if (validUsers.length !== uniqueParticipantIds.length) {
            return res.status(400).json({ error: 'One or more selected users do not exist' });
        }

        const chat = await prisma.chat.create({
            data: {
                type: 'GROUP',
                title: title.trim(),
                createdByUserId,
            },
        });

        await prisma.chatParticipant.createMany({
            data: [
                {
                    chatId: chat.id,
                    userId: createdByUserId,
                },
                ...uniqueParticipantIds.map((userId) => ({
                    chatId: chat.id,
                    userId,
                })),
            ],
        });

        return res.status(201).json({ chatId: chat.id });
    } catch (err) {
        return next(err);
    }
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

async function addToGroup(req, res, next) {
    try {
        const { chatId } = req.params;
        const currentUserId = req.user.id;
        const { participants } = req.body;

        if (!chatId) {
            return res.status(400).json({ error: 'chatId is required' });
        }

        if (!Array.isArray(participants) || participants.length < 1) {
            return res.status(400).json({ error: 'There must be at least one user selected' });
        }

        const chat = await prisma.chat.findFirst({
            where: {
                id: chatId,
                type: 'GROUP',
                participants: {
                    some: {
                        userId: currentUserId,
                        leftAt: null,
                    },
                },
            },
            select: {
                id: true,
                participants: {
                    where: {
                        leftAt: null,
                    },
                    select: {
                        userId: true,
                    },
                },
            },
        });

        if (!chat) {
            return res.status(404).json({ error: 'Group chat not found' });
        }

        const existingUserIds = chat.participants.map((p) => p.userId);

        const uniqueParticipantIds = [...new Set(participants)].filter(
            (id) => id && !existingUserIds.includes(id)
        );

        if (uniqueParticipantIds.length === 0) {
            return res.status(400).json({ error: 'All selected users are already in the group' });
        }

        const validUsers = await prisma.user.findMany({
            where: {
                id: {
                    in: uniqueParticipantIds,
                },
            },
            select: {
                id: true,
            },
        });

        if (validUsers.length !== uniqueParticipantIds.length) {
            return res.status(400).json({ error: 'One or more selected users do not exist' });
        }

        await prisma.chatParticipant.createMany({
            data: uniqueParticipantIds.map((userId) => ({
                chatId,
                userId,
            })),
        });

        return res.status(200).json({ ok: true });
    } catch (error) {
        return next(error);
    }
}

async function leaveGroup(req, res, next) {
    try {
        const userId = req.user.id;
        const { chatId } = req.params;

        if (!chatId) {
            return res.status(400).json({ error: 'chatId is required' });
        }

        const participant = await prisma.chatParticipant.findUnique({
            where: {
                chatId_userId: {
                    chatId,
                    userId,
                },
            },
            select: {
                leftAt: true,
                chat: {
                    select: {
                        type: true,
                    },
                },
            },
        });

        if (!participant || participant.chat.type !== 'GROUP') {
            return res.status(404).json({ error: 'Group chat not found' });
        }

        if (participant.leftAt) {
            return res.status(400).json({ error: 'You have already left this group' });
        }

        await prisma.chatParticipant.update({
            where: {
                chatId_userId: {
                    chatId,
                    userId,
                },
            },
            data: {
                leftAt: new Date(),
            },
        });

        return res.status(200).json({ ok: true });
    } catch (err) {
        return next(err);
    }
}

module.exports = {
    createDm,
    createGroup,
    getAllChats,
    getChatById,
    getChatMessages,
    sendChatMsg,
    renameChat,
    addToGroup,
    leaveGroup
};