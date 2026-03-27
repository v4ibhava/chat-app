import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const FRONTEND_URL =
  process.env.NODE_ENV === "production"
    ? process.env.FRONTEND_URL
    : "http://localhost:5173";

const io = new Server(server, {
    cors: {
        origin: FRONTEND_URL,
        credentials: true,
    },
    transports: ['websocket', 'polling'], // Fallback for slow connections
});

// used to store online users
const userSocketMap = {};
// {userId: socketId}

export const getReceiverSocketId = (receiverId) => {
    return userSocketMap[receiverId];
};

io.on("connection", (socket) => {
    console.log(`socket ${socket.id} connected`);

    const userId = socket.handshake.query.userId;
    if (userId) {
        userSocketMap[userId] = socket.id;
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    }

    socket.on("typing", ({ receiverId }) => {
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("typing", { senderId: userId });
        }
    });

    socket.on("stop typing", ({ receiverId }) => {
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("stop typing", { senderId: userId });
        }
    });

    socket.on("disconnect", () => {
        console.log(`socket ${socket.id} disconnected`);
        // Find and remove the disconnected user
        const userId = Object.keys(userSocketMap).find(
            key => userSocketMap[key] === socket.id
        );
        if (userId) {
            delete userSocketMap[userId];
            // Emit updated online users list after user disconnects
            io.emit("getOnlineUsers", Object.keys(userSocketMap));
        }
    });
});

export { io, app, server };
