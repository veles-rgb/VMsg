const { prisma } = require('../../lib/prisma.mjs');
const { emitToUsers, emitToChat } = require('../socket');

async function createDm(req, res, next) {
    try {
        const userId = req.user.id;
        const { targetId } = req.body;

        if (!targetId) {
            return res.status(400).json({ error: 'targetId is required' });
        }

        if (targetId === userId) {
            return res.status(400).json({ error: 'You cannot create a DM with yourself' });
        }

        const targetUser = await prisma.user.findUnique({
            where: {
                id: targetId,
            },
            select: {
                id: true,
            },
        });

        if (!targetUser) {
            return res.status(404).json({ error: 'Target user not found' });
        }

        const existing = await prisma.chat.findFirst({
            where: {
                type: 'DM',
                AND: [
                    {
                        participants: {
                            some: {
                                userId,
                            },
                        },
                    },
                    {
                        participants: {
                            some: {
                                userId: targetId,
                            },
                        },
                    },
                ],
            },
            select: {
                id: true,
            },
        });

        if (existing) {
            await prisma.chatParticipant.updateMany({
                where: {
                    chatId: existing.id,
                    userId,
                },
                data: {
                    leftAt: null,
                    hiddenAt: null,
                },
            });

            emitToUsers([userId, targetId], 'sidebar:refresh', { chatId: existing.id });

            return res.json({ chatId: existing.id });
        }

        const chat = await prisma.chat.create({
            data: {
                type: 'DM',
                createdByUserId: userId,
            },
            select: {
                id: true,
            },
        });

        await prisma.chatParticipant.createMany({
            data: [
                {
                    chatId: chat.id,
                    userId,
                    unreadCount: 0,
                },
                {
                    chatId: chat.id,
                    userId: targetId,
                    unreadCount: 0,
                },
            ],
        });

        emitToUsers([userId, targetId], 'sidebar:refresh', { chatId: chat.id });

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
            select: {
                id: true,
            },
        });

        await prisma.chatParticipant.createMany({
            data: [
                {
                    chatId: chat.id,
                    userId: createdByUserId,
                    unreadCount: 0,
                },
                ...uniqueParticipantIds.map((userId) => ({
                    chatId: chat.id,
                    userId,
                    unreadCount: 0,
                })),
            ],
        });

        emitToUsers([createdByUserId, ...uniqueParticipantIds], 'sidebar:refresh', {
            chatId: chat.id,
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
                        hiddenAt: null,
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
                                profilePictureUrl: true,
                            },
                        },
                    },
                },
            },
        });

        const chatsWithOtherParticipants = chats.map((chat) => {
            const currentParticipant = chat.participants.find(
                (participant) => participant.userId === userId
            );

            const otherParticipants = chat.participants.filter(
                (participant) => participant.userId !== userId
            );

            return {
                ...chat,
                unreadCount: currentParticipant?.unreadCount || 0,
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
                                profilePictureUrl: true,
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

        await prisma.chatParticipant.update({
            where: {
                chatId_userId: {
                    chatId,
                    userId,
                },
            },
            data: {
                unreadCount: 0,
            },
        });

        const messages = await prisma.message.findMany({
            where: {
                chatId,
            },
            orderBy: {
                sentAt: 'asc',
            },
            select: {
                id: true,
                content: true,
                sentAt: true,
                attachmentUrl: true,
                attachmentPublicId: true,
                attachmentType: true,
                attachmentName: true,
                attachmentBytes: true,
                sender: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        profilePictureUrl: true,
                    },
                },
            },
        });

        emitToUsers([userId], 'sidebar:refresh', { chatId });

        return res.json({ messages });
    } catch (err) {
        return next(err);
    }
}

async function sendChatMsg(req, res, next) {
    try {
        const { chatId } = req.params;
        const senderUserId = req.user.id;

        const {
            content,
            attachmentUrl,
            attachmentPublicId,
            attachmentType,
            attachmentName,
            attachmentBytes,
        } = req.body;

        const trimmedContent = content?.trim() || null;

        if (!trimmedContent && !attachmentUrl) {
            return res.status(400).json({
                error: 'Message content or attachment is required',
            });
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
            select: {
                id: true,
            },
        });

        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        const message = await prisma.message.create({
            data: {
                chatId,
                senderUserId,
                content: trimmedContent,
                attachmentUrl: attachmentUrl || null,
                attachmentPublicId: attachmentPublicId || null,
                attachmentType: attachmentType || null,
                attachmentName: attachmentName || null,
                attachmentBytes: attachmentBytes || null,
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        profilePictureUrl: true,
                    },
                },
            },
        });

        await prisma.chatParticipant.updateMany({
            where: {
                chatId,
                leftAt: null,
            },
            data: {
                hiddenAt: null,
            },
        });

        await prisma.chatParticipant.updateMany({
            where: {
                chatId,
                leftAt: null,
                userId: {
                    not: senderUserId,
                },
            },
            data: {
                unreadCount: {
                    increment: 1,
                },
            },
        });

        await prisma.chatParticipant.update({
            where: {
                chatId_userId: {
                    chatId,
                    userId: senderUserId,
                },
            },
            data: {
                unreadCount: 0,
            },
        });

        await prisma.chat.update({
            where: {
                id: chatId,
            },
            data: {
                lastMessageAt: new Date(),
            },
        });

        const participants = await prisma.chatParticipant.findMany({
            where: {
                chatId,
                leftAt: null,
            },
            select: {
                userId: true,
            },
        });

        const participantIds = participants.map((participant) => participant.userId);

        emitToChat(chatId, 'chat:message_created', {
            chatId,
            message,
        });

        emitToUsers(participantIds, 'sidebar:refresh', {
            chatId,
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

        const trimmedTitle = newTitle?.trim();

        if (!trimmedTitle) {
            return res.status(400).json({ error: 'New title is required' });
        }

        if (trimmedTitle.length > 100) {
            return res.status(400).json({ error: 'Chat title must be 100 characters or less' });
        }

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
        });

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        await prisma.chat.update({
            where: {
                id: chatId,
            },
            data: {
                title: trimmedTitle,
            },
        });

        const participants = await prisma.chatParticipant.findMany({
            where: {
                chatId,
                leftAt: null,
            },
            select: {
                userId: true,
            },
        });

        emitToUsers(
            participants.map((participant) => participant.userId),
            'sidebar:refresh',
            { chatId }
        );

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
                unreadCount: 0,
            })),
        });

        const activeParticipants = await prisma.chatParticipant.findMany({
            where: {
                chatId,
                leftAt: null,
            },
            select: {
                userId: true,
            },
        });

        emitToUsers(
            activeParticipants.map((participant) => participant.userId),
            'sidebar:refresh',
            { chatId }
        );

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

        const remainingParticipants = await prisma.chatParticipant.findMany({
            where: {
                chatId,
                leftAt: null,
            },
            select: {
                userId: true,
            },
        });

        emitToUsers(
            [userId, ...remainingParticipants.map((participant) => participant.userId)],
            'sidebar:refresh',
            { chatId }
        );

        return res.status(200).json({ ok: true });
    } catch (err) {
        return next(err);
    }
}

async function hideChat(req, res, next) {
    try {
        const { chatId } = req.params;
        const userId = req.user.id;

        const participant = await prisma.chatParticipant.findFirst({
            where: {
                chatId,
                userId,
                leftAt: null,
            },
            select: {
                chatId: true,
                userId: true,
            },
        });

        if (!participant) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        await prisma.chatParticipant.update({
            where: {
                chatId_userId: {
                    chatId,
                    userId,
                },
            },
            data: {
                hiddenAt: new Date(),
            },
        });

        emitToUsers([userId], 'sidebar:refresh', { chatId });

        return res.json({ ok: true });
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
    leaveGroup,
    hideChat,
};