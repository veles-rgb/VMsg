import { io } from 'socket.io-client';

let socket = null;
let currentToken = null;

const socketUrl =
    import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_API_URL.replace(/\/api$/, '');

export function connectSocket(token) {
    if (!token) return null;

    if (socket && currentToken === token) {
        return socket;
    }

    if (socket) {
        socket.disconnect();
        socket = null;
    }

    currentToken = token;

    socket = io(socketUrl, {
        auth: {
            token,
        },
        transports: ['websocket'],
    });

    return socket;
}

export function getSocket() {
    return socket;
}

export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }

    currentToken = null;
}