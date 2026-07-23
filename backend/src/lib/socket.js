import { Server } from "socket.io";
import http from "http";
import express from "express";
import User from "../models/user.model.js";
import OfflineMessage from "../models/offlineMessage.model.js";
import GroupMessage from "../models/groupMessage.model.js";
import Group from "../models/group.model.js";


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
    maxHttpBufferSize: 1e8, // 100MB max buffer for binary/fallback file transfers
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

const deliverOfflineMessages = async (userId, socket) => {
    try {
        const offlineMsgs = await OfflineMessage.find({ receiverId: userId }).sort({ createdAt: 1 });
        if (offlineMsgs.length > 0) {
            const payload = offlineMsgs.map(m => ({
                _id: m._id,
                senderId: m.senderId,
                receiverId: m.receiverId,
                messageData: m.messageData
            }));

            // Use Socket.IO acknowledgment callback so messages are only
            // deleted after the client confirms successful receipt.
            socket.emit("offline-messages-deliver", payload, async (acknowledgedIds) => {
                if (!Array.isArray(acknowledgedIds) || acknowledgedIds.length === 0) return;
                try {
                    await OfflineMessage.deleteMany({ _id: { $in: acknowledgedIds } });
                } catch (deleteErr) {
                    console.error("Error deleting acknowledged offline messages:", deleteErr);
                }
            });
        }
    } catch (err) {
        console.error("Error delivering offline messages:", err);
    }
};

io.on("connection", (socket) => {
    console.log(`socket ${socket.id} connected`);

    const userId = socket.handshake.query.userId;
    if (userId) {
        userSocketMap[userId] = socket.id;
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
        updateLastSeen(userId);
        deliverOfflineMessages(userId, socket);
    }

    socket.on("userReconnected", (userId) => {
        if (userId) {
            userSocketMap[userId] = socket.id;
            io.emit("getOnlineUsers", Object.keys(userSocketMap));
            updateLastSeen(userId);
            deliverOfflineMessages(userId, socket);
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

    socket.on("request-profile-backup", async ({ targetUserId }) => {
        if (!userId || !targetUserId) return;
        try {
            const receiverSocketId = getReceiverSocketId(targetUserId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("request-profile-backup", { requesterId: userId });
            }
        } catch (e) {
            console.error("Error routing profile backup request:", e);
        }
    });

    socket.on("restore-profile-backup", async ({ targetUserId, profilePic }) => {
        if (!userId || !targetUserId || !profilePic) return;
        try {
            await User.findByIdAndUpdate(targetUserId, { profilePic });
            const receiverSocketId = getReceiverSocketId(targetUserId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("profile-restored-from-peer", { profilePic });
            }
        } catch (e) {
            console.error("Error restoring profile backup from peer:", e);
        }
    });

    socket.on("webrtc-signal", async ({ to, signal }) => {
        if (!userId) return;
        try {
            const user = await User.findById(userId);
            const isFriend = user?.friends?.some(f => f.toString() === to?.toString());
            const group = signal?.groupId ? await Group.findById(signal.groupId) : null;
            const isSameGroup = group &&
                group.members.some(member => member.toString() === userId.toString()) &&
                group.members.some(member => member.toString() === to?.toString());

            if (user && (isFriend || isSameGroup)) {
                const receiverSocketId = getReceiverSocketId(to);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit("webrtc-signal", {
                        from: userId,
                        fromUser: {
                            _id: user._id.toString(),
                            fullName: user.fullName,
                            username: user.username,
                            profilePic: user.profilePic,
                        },
                        signal
                    });
                } else if (signal.type === "call-offer") {
                    // Recipient is offline, create a missed call system message
                    const systemMessage = {
                        _id: "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9),
                        chatKey: `${to}_${userId}`,
                        senderId: userId,
                        receiverId: to,
                        text: `Missed ${signal.callType || "audio"} call`,
                        isSystem: true,
                        createdAt: new Date().toISOString()
                    };
                    await OfflineMessage.create({
                        senderId: userId,
                        receiverId: to,
                        messageData: systemMessage
                    });
                }
            } else {
                console.log(`Security Block: User ${userId} tried to signal an unauthorized recipient ${to}`);
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
                } else {
                    // Recipient is offline, store temporarily on server
                    await OfflineMessage.create({
                        senderId: userId,
                        receiverId: to,
                        messageData: message
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

    socket.on("clear-chat-history", async ({ to }) => {
        if (!userId || !to) return;
        try {
            // Delete pending offline messages between these two users
            await OfflineMessage.deleteMany({
                $or: [
                    { senderId: userId, receiverId: to },
                    { senderId: to, receiverId: userId }
                ]
            });
            // Forward event to online friend if connected
            const receiverSocketId = getReceiverSocketId(to);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("chat-cleared", { fromUserId: userId });
            }
        } catch (err) {
            console.error("Error clearing chat history offline messages:", err);
        }
    });

    socket.on("join-group-rooms", async (groupIds) => {
        if (!Array.isArray(groupIds)) return;
        groupIds.forEach(id => {
            socket.join(`group_${id}`);
            console.log(`Socket ${socket.id} joined group room: group_${id}`);
        });
    });

    socket.on("group-message", async ({ groupId, message }) => {
        if (!userId) return;
        try {
            const group = await Group.findById(groupId);
            if (group && group.members.some(m => m.toString() === userId)) {
                // Persist to database
                const saved = await GroupMessage.create({
                    groupId,
                    senderId: userId,
                    text: message.text,
                });

                const persistentMessage = {
                    ...message,
                    _id: saved._id.toString(),
                    createdAt: saved.createdAt.toISOString(),
                };

                socket.to(`group_${groupId}`).emit("group-message", {
                    groupId,
                    message: persistentMessage,
                    senderId: userId
                });

                // Also send back to sender with real _id so they can update their local copy
                socket.emit("group-message-ack", {
                    groupId,
                    tempId: message._id,
                    realId: saved._id.toString(),
                    createdAt: saved.createdAt.toISOString(),
                });
            }
        } catch (err) {
            console.error("Error broadcasting group message:", err);
        }
    });

    socket.on("get-group-messages", async ({ groupId }, callback) => {
        if (!userId || !groupId || typeof callback !== "function") return;
        try {
            const group = await Group.findById(groupId);
            if (!group || !group.members.some(member => member.toString() === userId.toString())) {
                callback({ ok: false, message: "Not a member of this group" });
                return;
            }

            const messages = await GroupMessage.find({ groupId })
                .populate("senderId", "fullName username profilePic")
                .sort({ createdAt: 1 })
                .lean();

            callback({
                ok: true,
                messages: messages.map(message => ({
                    _id: message._id.toString(),
                    senderId: message.senderId._id.toString(),
                    text: message.text,
                    createdAt: message.createdAt.toISOString(),
                    sender: {
                        fullName: message.senderId.fullName,
                        username: message.senderId.username,
                    },
                })),
            });
        } catch (err) {
            console.error("Error fetching group messages over socket:", err);
            callback({ ok: false, message: "Failed to load group messages" });
        }
    });

    socket.on("update-group", async ({ groupId, name }, callback) => {
        if (!userId || !groupId || typeof callback !== "function") return;
        try {
            const nextName = typeof name === "string" ? name.trim() : "";
            if (!nextName) {
                callback({ ok: false, message: "Group name is required" });
                return;
            }

            const group = await Group.findById(groupId);
            if (!group) {
                callback({ ok: false, message: "Group not found" });
                return;
            }
            if (!group.admins.some(admin => admin.toString() === userId.toString())) {
                callback({ ok: false, message: "Only admins can update group settings" });
                return;
            }

            group.name = nextName;
            await group.save();
            const populated = await Group.findById(groupId)
                .populate("members", "fullName username profilePic publicKeyJWK")
                .populate("pendingRequests", "fullName username profilePic publicKeyJWK");

            io.to(`group_${groupId}`).emit("group-metadata-updated", { groupId, group: populated });
            callback({ ok: true, group: populated });
        } catch (err) {
            console.error("Error updating group over socket:", err);
            callback({ ok: false, message: "Failed to update group" });
        }
    });

    socket.on("group-key-exchange", async ({ toUserId, payload }) => {
        if (!userId) return;
        try {
            const receiverSocketId = getReceiverSocketId(toUserId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("group-key-exchange", {
                    fromUserId: userId,
                    payload
                });
            }
        } catch (err) {
            console.error("Error in group key exchange routing:", err);
        }
    });

    socket.on("group-key-request", async ({ groupId }) => {
        if (!userId) return;
        try {
            const group = await Group.findById(groupId);
            if (!group || !group.members.some(m => m.toString() === userId)) return;

            // Forward request to all online admins
            for (const adminId of group.admins) {
                const adminIdStr = adminId.toString();
                if (adminIdStr === userId.toString()) continue;
                const adminSocketId = getReceiverSocketId(adminIdStr);
                if (adminSocketId) {
                    io.to(adminSocketId).emit("group-key-request", {
                        groupId,
                        requesterId: userId
                    });
                }
            }
        } catch (err) {
            console.error("Error routing group key request:", err);
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
