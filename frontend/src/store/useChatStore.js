import { create } from "zustand";
import { toast } from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";
import { useAuthStore } from "./useAuthStore.js";
import { playMessageSound } from "../lib/sounds.js";
import { getLocalMessages, saveLocalMessage, deleteLocalMessage } from "../lib/db.js";

const peerConnections = {}; // { friendId: RTCPeerConnection }
const dataChannels = {}; // { friendId: RTCDataChannel }
const fileTransfers = {}; // { fileId: { meta, chunks, receivedSize } }

const peerConfiguration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" }
    ]
};

export const useChatStore = create((set, get) => ({
    messages: [],
    users: [],
    selectedUser: null,
    isUsersLoading: false,
    isMessagesLoading: false,
    isTyping: false,
    p2pStatus: "offline", // "offline" | "connecting" | "connected"
    fileProgress: null, // { fileName, progress, type: "send" | "receive" }

    getUsers: async () => {
        set({ isUsersLoading: true });
        try {
            const res = await axiosInstance.get("/messages/users");
            if (Array.isArray(res.data)) {
                set({ users: res.data });
            } else {
                set({ users: [] });
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to load users");
            set({ users: [] });
        } finally {
            set({ isUsersLoading: false });
        }
    },

    getMessages: async (friendId) => {
        set({ isMessagesLoading: true });
        try {
            const myId = useAuthStore.getState().authUser?._id;
            if (!myId) return;

            // Load from local IndexedDB
            const localMsgs = await getLocalMessages(myId, friendId);
            set({ messages: localMsgs });

            // Connect P2P WebRTC
            get().connectToPeer(friendId);
        } catch (error) {
            console.error("error loading local messages: ", error);
        } finally {
            set({ isMessagesLoading: false });
        }
    },

    connectToPeer: async (friendId) => {
        const socket = useAuthStore.getState().socket;
        const authUser = useAuthStore.getState().authUser;
        if (!socket || !authUser) return;

        const myId = authUser._id;
        const onlineUsers = useAuthStore.getState().onlineUsers;
        const isFriendOnline = onlineUsers.includes(friendId);

        // If friend is offline, show offline status
        if (!isFriendOnline) {
            set({ p2pStatus: "offline" });
            return;
        }

        // Check if connection already exists
        if (peerConnections[friendId]) {
            const pc = peerConnections[friendId];
            if (pc.connectionState === "connected") {
                set({ p2pStatus: "connected" });
                return;
            }
            if (pc.connectionState === "connecting") {
                set({ p2pStatus: "connecting" });
                return;
            }
        }

        set({ p2pStatus: "connecting" });

        const pc = new RTCPeerConnection(peerConfiguration);
        peerConnections[friendId] = pc;

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("webrtc-signal", {
                    to: friendId,
                    signal: { type: "candidate", candidate: event.candidate }
                });
            }
        };

        pc.onconnectionstatechange = () => {
            console.log(`P2P Connection with ${friendId}: ${pc.connectionState}`);
            if (pc.connectionState === "connected") {
                set({ p2pStatus: "connected" });
            } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
                set({ p2pStatus: "offline" });
                delete peerConnections[friendId];
                delete dataChannels[friendId];
            }
        };

        // Determine WebRTC initiator lexicographically to avoid collision
        const isInitiator = myId < friendId;

        if (isInitiator) {
            const dc = pc.createDataChannel("chat");
            get().setupDataChannel(friendId, dc);

            try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.emit("webrtc-signal", {
                    to: friendId,
                    signal: { type: "offer", sdp: offer }
                });
            } catch (err) {
                console.error("Error creating WebRTC offer:", err);
            }
        } else {
            pc.ondatachannel = (event) => {
                get().setupDataChannel(friendId, event.channel);
            };
        }
    },

    setupDataChannel: (friendId, dc) => {
        dc.binaryType = "arraybuffer";
        dataChannels[friendId] = dc;

        dc.onopen = () => {
            console.log(`P2P data channel with ${friendId} is open`);
            set({ p2pStatus: "connected" });
            get().syncHistories(friendId);
        };

        dc.onclose = () => {
            console.log(`P2P data channel with ${friendId} closed`);
            set({ p2pStatus: "offline" });
            delete dataChannels[friendId];
        };

        dc.onmessage = async (event) => {
            if (event.data instanceof ArrayBuffer) {
                get().handleIncomingChunk(friendId, event.data);
            } else {
                try {
                    const data = JSON.parse(event.data);
                    get().handleDataMessage(friendId, data);
                } catch (e) {
                    console.error("Error parsing P2P payload:", e);
                }
            }
        };
    },

    syncHistories: async (friendId) => {
        const dc = dataChannels[friendId];
        if (!dc || dc.readyState !== "open") return;

        const myId = useAuthStore.getState().authUser?._id;
        if (!myId) return;

        const localMsgs = await getLocalMessages(myId, friendId);
        const manifest = localMsgs.map(m => ({
            _id: m._id,
            createdAt: m.createdAt,
            senderId: m.senderId
        }));

        dc.send(JSON.stringify({
            type: "sync-manifest",
            manifest
        }));
    },

    handleDataMessage: async (friendId, data) => {
        const myId = useAuthStore.getState().authUser?._id;
        if (!myId) return;

        const { selectedUser } = get();

        if (data.type === "sync-manifest") {
            const remoteManifest = data.manifest;
            const localMsgs = await getLocalMessages(myId, friendId);
            const localMap = new Map(localMsgs.map(m => [m._id, m]));
            const remoteMap = new Map(remoteManifest.map(m => [m._id, m]));

            const dc = dataChannels[friendId];
            if (!dc || dc.readyState !== "open") return;

            // 1. Sync messages we have but they don't
            for (const localMsg of localMsgs) {
                if (!remoteMap.has(localMsg._id)) {
                    if (localMsg.senderId === myId) {
                        // We are the sender, they need this message
                        dc.send(JSON.stringify({
                            type: "chat-message",
                            message: localMsg
                        }));
                    } else {
                        // They are the sender, but don't have it anymore (meaning they deleted it)
                        await deleteLocalMessage(localMsg._id);
                        if (selectedUser && selectedUser._id === friendId) {
                            set({ messages: get().messages.filter(m => m._id !== localMsg._id) });
                        }
                    }
                }
            }

            // 2. Request messages they have but we don't
            const requestIds = [];
            for (const remoteMsg of remoteManifest) {
                if (!localMap.has(remoteMsg._id)) {
                    requestIds.push(remoteMsg._id);
                }
            }

            if (requestIds.length > 0) {
                dc.send(JSON.stringify({
                    type: "request-messages",
                    ids: requestIds
                }));
            }
        }

        if (data.type === "request-messages") {
            const { ids } = data;
            const dc = dataChannels[friendId];
            if (!dc || dc.readyState !== "open") return;

            const localMsgs = await getLocalMessages(myId, friendId);
            const localMap = new Map(localMsgs.map(m => [m._id, m]));

            for (const id of ids) {
                const msg = localMap.get(id);
                if (msg) {
                    dc.send(JSON.stringify({
                        type: "chat-message",
                        message: msg
                    }));
                }
            }
        }

        if (data.type === "chat-message") {
            const msg = data.message;
            await saveLocalMessage(msg);
            if (selectedUser && selectedUser._id === friendId) {
                set({ messages: [...get().messages, msg] });
            } else {
                playMessageSound();
            }
        }

        if (data.type === "delete-message") {
            const { messageId } = data;
            await deleteLocalMessage(messageId);
            if (selectedUser && selectedUser._id === friendId) {
                set({ messages: get().messages.filter(m => m._id !== messageId) });
            }
        }

        if (data.type === "file-meta") {
            const { fileId, fileName, fileSize, fileType, messageId, senderId, receiverId, createdAt, text } = data.meta;
            fileTransfers[fileId] = {
                meta: data.meta,
                chunks: [],
                receivedSize: 0
            };
            set({ fileProgress: { fileName, progress: 0, type: "receive" } });
        }
    },

    sendFile: async (file, text) => {
        const { selectedUser } = get();
        if (!selectedUser) return;

        const myId = useAuthStore.getState().authUser?._id;
        const friendId = selectedUser._id;
        if (!myId || !friendId) return;

        const dc = dataChannels[friendId];
        if (!dc || dc.readyState !== "open") {
            toast.error("User is offline. Cannot send files.");
            return;
        }

        // Exactly 16-character file ID
        const fileId = Math.random().toString(36).substring(2, 10).padEnd(16, 'x').substring(0, 16);
        const messageId = "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
        const createdAt = new Date().toISOString();

        // Send metadata
        dc.send(JSON.stringify({
            type: "file-meta",
            meta: {
                fileId,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                messageId,
                senderId: myId,
                receiverId: friendId,
                createdAt,
                text
            }
        }));

        set({ fileProgress: { fileName: file.name, progress: 0, type: "send" } });

        const chunkSize = 16384; // 16KB
        let offset = 0;

        const readSlice = (o) => {
            const slice = file.slice(o, o + chunkSize);
            const reader = new FileReader();
            reader.onload = async (e) => {
                const chunkData = e.target.result;

                // Create binary header (16 bytes fileId + 4 bytes chunkIndex)
                const headerBuffer = new ArrayBuffer(20);
                const view = new DataView(headerBuffer);
                for (let i = 0; i < 16; i++) {
                    view.setUint8(i, fileId.charCodeAt(i) || 0);
                }
                const chunkIndex = Math.floor(o / chunkSize);
                view.setUint32(16, chunkIndex, false);

                // Combine header + chunk data
                const chunkBuffer = new Uint8Array(headerBuffer.byteLength + chunkData.byteLength);
                chunkBuffer.set(new Uint8Array(headerBuffer), 0);
                chunkBuffer.set(new Uint8Array(chunkData), headerBuffer.byteLength);

                dc.send(chunkBuffer.buffer);

                const newOffset = o + chunkSize;
                const progress = Math.min(100, Math.round((newOffset / file.size) * 100));
                set({ fileProgress: { fileName: file.name, progress, type: "send" } });

                if (newOffset < file.size) {
                    if (dc.bufferedAmount > 16 * 1024 * 1024) { // WebRTC Backpressure control
                        dc.onbufferedamountlow = () => {
                            dc.onbufferedamountlow = null;
                            readSlice(newOffset);
                        };
                    } else {
                        setTimeout(() => readSlice(newOffset), 1);
                    }
                } else {
                    // Send complete! Save locally as Blob URL
                    const localMsg = {
                        _id: messageId,
                        chatKey: `${myId}_${friendId}`,
                        senderId: myId,
                        receiverId: friendId,
                        text,
                        image: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
                        fileName: file.name,
                        fileSize: file.size,
                        fileType: file.type,
                        createdAt
                    };
                    await saveLocalMessage(localMsg);
                    set({ messages: [...get().messages, localMsg], fileProgress: null });
                }
            };
            reader.readAsArrayBuffer(slice);
        };
        readSlice(0);
    },

    handleIncomingChunk: async (friendId, buffer) => {
        const view = new DataView(buffer);
        let fileId = "";
        for (let i = 0; i < 16; i++) {
            const charCode = view.getUint8(i);
            if (charCode > 0) fileId += String.fromCharCode(charCode);
        }
        const chunkIndex = view.getUint32(16, false);
        const chunkData = buffer.slice(20);

        const transfer = fileTransfers[fileId];
        if (!transfer) return;

        transfer.chunks[chunkIndex] = chunkData;
        transfer.receivedSize += chunkData.byteLength;

        const progress = Math.min(100, Math.round((transfer.receivedSize / transfer.meta.fileSize) * 100));
        set({ fileProgress: { fileName: transfer.meta.fileName, progress, type: "receive" } });

        if (transfer.receivedSize >= transfer.meta.fileSize) {
            // Reassemble chunks into a single Blob
            const blob = new Blob(transfer.chunks, { type: transfer.meta.fileType });

            const localMsg = {
                _id: transfer.meta.messageId,
                chatKey: `${transfer.meta.senderId}_${transfer.meta.receiverId}`,
                senderId: transfer.meta.senderId,
                receiverId: transfer.meta.receiverId,
                text: transfer.meta.text,
                image: transfer.meta.fileType.startsWith("image/") ? URL.createObjectURL(blob) : null,
                fileName: transfer.meta.fileName,
                fileSize: transfer.meta.fileSize,
                fileType: transfer.meta.fileType,
                createdAt: transfer.meta.createdAt
            };

            await saveLocalMessage(localMsg);
            const { selectedUser } = get();
            if (selectedUser && selectedUser._id === friendId) {
                set({ messages: [...get().messages, localMsg] });
            } else {
                playMessageSound();
            }

            delete fileTransfers[fileId];
            set({ fileProgress: null });
        }
    },

    sendMessage: async (messageData) => {
        const { selectedUser, messages } = get();
        const myId = useAuthStore.getState().authUser?._id;
        const friendId = selectedUser?._id;
        if (!myId || !friendId) return;

        if (messageData.file) {
            get().sendFile(messageData.file, messageData.text);
            return;
        }

        const createdAt = new Date().toISOString();
        const messageId = "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);

        const localMsg = {
            _id: messageId,
            chatKey: `${myId}_${friendId}`,
            senderId: myId,
            receiverId: friendId,
            text: messageData.text,
            image: messageData.image,
            createdAt
        };

        // Save in IndexedDB
        await saveLocalMessage(localMsg);
        set({ messages: [...messages, localMsg] });

        // Send via P2P if active
        const dc = dataChannels[friendId];
        if (dc && dc.readyState === "open") {
            dc.send(JSON.stringify({
                type: "chat-message",
                message: localMsg
            }));
        }
    },

    deleteMessage: async (messageId) => {
        const { selectedUser, messages } = get();
        if (!selectedUser) return;
        const friendId = selectedUser._id;

        // Delete from local IndexedDB
        await deleteLocalMessage(messageId);
        set({ messages: messages.filter(m => m._id !== messageId) });

        // Send P2P delete event
        const dc = dataChannels[friendId];
        if (dc && dc.readyState === "open") {
            dc.send(JSON.stringify({
                type: "delete-message",
                messageId
            }));
        }
    },

    handleTyping: (receiverId) => {
        const socket = useAuthStore.getState().socket;
        if (socket) socket.emit("typing", { receiverId });
    },

    handleStopTyping: (receiverId) => {
        const socket = useAuthStore.getState().socket;
        if (socket) socket.emit("stop typing", { receiverId });
    },

    subscribeToMessages: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) return;

        socket.on("webrtc-signal", async ({ from, signal }) => {
            let pc = peerConnections[from];
            if (!pc) {
                pc = new RTCPeerConnection(peerConfiguration);
                peerConnections[from] = pc;

                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        socket.emit("webrtc-signal", {
                            to: from,
                            signal: { type: "candidate", candidate: event.candidate }
                        });
                    }
                };

                pc.onconnectionstatechange = () => {
                    if (pc.connectionState === "connected") {
                        set({ p2pStatus: "connected" });
                    } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
                        set({ p2pStatus: "offline" });
                        delete peerConnections[from];
                        delete dataChannels[from];
                    }
                };

                pc.ondatachannel = (event) => {
                    get().setupDataChannel(from, event.channel);
                };
            }

            try {
                if (signal.type === "offer") {
                    await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    socket.emit("webrtc-signal", {
                        to: from,
                        signal: { type: "answer", sdp: answer }
                    });
                } else if (signal.type === "answer") {
                    await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                } else if (signal.type === "candidate") {
                    await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
                }
            } catch (err) {
                console.error("Error setting WebRTC description/candidate:", err);
            }
        });

        socket.on("typing", ({ senderId }) => {
            const { selectedUser } = get();
            if (selectedUser && senderId === selectedUser._id) {
                set({ isTyping: true });
            }
        });

        socket.on("stop typing", ({ senderId }) => {
            const { selectedUser } = get();
            if (selectedUser && senderId === selectedUser._id) {
                set({ isTyping: false });
            }
        });
    },

    unSubscribeToMessages: () => {
        const socket = useAuthStore.getState().socket;
        if (socket) {
            socket.off("webrtc-signal");
            socket.off("typing");
            socket.off("stop typing");
        }
    },

    setSelectedUser: (selectedUser) => set({ selectedUser }),
}));
