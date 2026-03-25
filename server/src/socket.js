const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;
const onlineUsers = new Map();

function broadcastOnlineUsers() {
    if (!io) return;

    io.emit('presence:online_users', {
        userIds: [...onlineUsers.keys()],
    });
}

function markUserOnline(userId) {
    const current = onlineUsers.get(userId) || 0;
    onlineUsers.set(userId, current + 1);
    broadcastOnlineUsers();
}

function markUserOffline(userId) {
    const current = onlineUsers.get(userId) || 0;

    if (current <= 1) {
        onlineUsers.delete(userId);
    } else {
        onlineUsers.set(userId, current - 1);
    }

    broadcastOnlineUsers();
}

function getOnlineUserIds() {
    return [...onlineUsers.keys()];
}

function initSocket(server) {
    io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL,
            credentials: true,
        },
    });

    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token;

            if (!token) {
                return next(new Error('Unauthorized'));
            }

            const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

            socket.user = {
                id: payload.sub,
                username: payload.username,
                displayName: payload.displayName,
            };

            next();
        } catch (err) {
            next(new Error('Unauthorized'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.user.id;

        socket.join(`user:${userId}`);
        markUserOnline(userId);

        socket.emit('presence:online_users', {
            userIds: getOnlineUserIds(),
        });

        socket.on('chat:join', (chatId) => {
            if (!chatId) return;
            socket.join(`chat:${chatId}`);
        });

        socket.on('chat:leave', (chatId) => {
            if (!chatId) return;
            socket.leave(`chat:${chatId}`);
        });

        socket.on('disconnect', () => {
            markUserOffline(userId);
        });
    });

    return io;
}

function getIo() {
    if (!io) {
        throw new Error('Socket.io has not been initialized');
    }

    return io;
}

function emitToUser(userId, event, payload) {
    if (!io) return;
    io.to(`user:${userId}`).emit(event, payload);
}

function emitToUsers(userIds, event, payload) {
    if (!io) return;

    const uniqueUserIds = [...new Set(userIds)].filter(Boolean);

    uniqueUserIds.forEach((userId) => {
        io.to(`user:${userId}`).emit(event, payload);
    });
}

function emitToChat(chatId, event, payload) {
    if (!io) return;
    io.to(`chat:${chatId}`).emit(event, payload);
}

module.exports = {
    initSocket,
    getIo,
    emitToUser,
    emitToUsers,
    emitToChat,
    getOnlineUserIds,
};