import { Server } from "socket.io";
import http from "http";
import express from "express";
import User from "../models/user.model.js";


const app = express();
const server = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";


const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            const allowedOrigins = [
                process.env.FRONTEND_URL, 
                "https://zync-liart.vercel.app",
                "http://localhost:5173", 
                "http://localhost:3000"
            ].filter(Boolean);
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error("Not allowed by CORS"));
            }
        },
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

const updateLastSeen = async (userId) => {
    if (!userId) return;
    try {
        await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
    } catch (e) {
        console.error("Error updating lastSeen:", e);
    }
};

io.on("connection", (socket) => {
    console.log(`socket ${socket.id} connected`);

    const userId = socket.handshake.query.userId;
    if (userId) {
        userSocketMap[userId] = socket.id;
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
        updateLastSeen(userId);
    }

    socket.on("userReconnected", (userId) => {
        if (userId) {
            userSocketMap[userId] = socket.id;
            io.emit("getOnlineUsers", Object.keys(userSocketMap));
            updateLastSeen(userId);
        }
    });

    socket.on("typing", async ({ receiverId }) => {
        if (!userId) return;
        try {
            const user = await User.findById(userId);
            if (user && user.friends?.some(f => f.toString() === receiverId?.toString())) {
                const receiverSocketId = getReceiverSocketId(receiverId);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit("typing", { senderId: userId });
                }
            }
        } catch (err) {
            console.error("Error in typing check:", err);
        }
    });

    socket.on("stop typing", async ({ receiverId }) => {
        if (!userId) return;
        try {
            const user = await User.findById(userId);
            if (user && user.friends?.some(f => f.toString() === receiverId?.toString())) {
                const receiverSocketId = getReceiverSocketId(receiverId);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit("stop typing", { senderId: userId });
                }
            }
        } catch (err) {
            console.error("Error in stop typing check:", err);
        }
    });

    socket.on("webrtc-signal", async ({ to, signal }) => {
        if (!userId) return;
        try {
            const user = await User.findById(userId);
            if (user && user.friends?.some(f => f.toString() === to?.toString())) {
                const receiverSocketId = getReceiverSocketId(to);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit("webrtc-signal", {
                        from: userId,
                        signal
                    });
                }
            } else {
                console.log(`Security Block: User ${userId} tried to signal non-friend ${to}`);
            }
        } catch (err) {
            console.error("Error in webrtc-signal check:", err);
        }
    });

    socket.on("chat-fallback-message", async ({ to, message }) => {
        if (!userId) return;
        try {
            const user = await User.findById(userId);
            if (user && user.friends?.some(f => f.toString() === to?.toString())) {
                const receiverSocketId = getReceiverSocketId(to);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit("chat-fallback-message", {
                        from: userId,
                        message
                    });
                }
            } else {
                console.log(`Security Block: User ${userId} tried to send fallback message to non-friend ${to}`);
            }
        } catch (err) {
            console.error("Error in chat-fallback-message check:", err);
        }
    });

    socket.on("chat-fallback-delete", async ({ to, messageId }) => {
        if (!userId) return;
        try {
            const user = await User.findById(userId);
            if (user && user.friends?.some(f => f.toString() === to?.toString())) {
                const receiverSocketId = getReceiverSocketId(to);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit("chat-fallback-delete", {
                        from: userId,
                        messageId
                    });
                }
            } else {
                console.log(`Security Block: User ${userId} tried to send fallback delete to non-friend ${to}`);
            }
        } catch (err) {
            console.error("Error in chat-fallback-delete check:", err);
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
            updateLastSeen(userId);
        }
    });
});

export { io, app, server };
