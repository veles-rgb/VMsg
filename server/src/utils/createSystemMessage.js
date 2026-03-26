const { prisma } = require('../../lib/prisma.mjs');
const { emitToUsers, emitToChat } = require('../socket');

async function createSystemMessage({ chatId, content, actorUserId = null }) {
    const sentAt = new Date();

    const message = await prisma.message.create({
        data: {
            chatId,
            content,
            type: 'SYSTEM',
            senderUserId: null,
            sentAt,
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

    await prisma.chat.update({
        where: {
            id: chatId,
        },
        data: {
            lastMessageAt: sentAt,
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

    if (actorUserId) {
        await prisma.chatParticipant.updateMany({
            where: {
                chatId,
                leftAt: null,
                userId: {
                    not: actorUserId,
                },
            },
            data: {
                unreadCount: {
                    increment: 1,
                },
            },
        });

        await prisma.chatParticipant.updateMany({
            where: {
                chatId,
                userId: actorUserId,
            },
            data: {
                unreadCount: 0,
            },
        });
    } else {
        await prisma.chatParticipant.updateMany({
            where: {
                chatId,
                leftAt: null,
            },
            data: {
                unreadCount: {
                    increment: 1,
                },
            },
        });
    }

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

    return message;
}

module.exports = createSystemMessage;