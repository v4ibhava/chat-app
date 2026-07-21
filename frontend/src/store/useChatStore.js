import { create } from "zustand";
import { toast } from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";
import { useAuthStore } from "./useAuthStore.js";
import { playMessageSound } from "../lib/sounds.js";
import { getLocalMessages, saveLocalMessage, deleteLocalMessage } from "../lib/db.js";
import { startDialTone, startRingTone, stopTone } from "../lib/ringtone.js";
import { getLocalKeypair, importPublicKey, deriveSharedKey, encryptPayload, decryptPayload } from "../lib/crypto.js";


const peerConnections = {}; // { friendId: RTCPeerConnection }
const dataChannels = {}; // { friendId: RTCDataChannel }
const fileTransfers = {}; // { fileId: { meta, chunks, receivedSize } }
const activeSendFileTransfers = {}; // { fileId: { file, peerId, messageId, createdAt, text, isSync, resume } }
let callIceQueue = [];
let screenAudioMix = null;

const peerConfiguration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun.services.mozilla.com" }
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
    fileProgress: null, // { fileId, fileName, progress, type: "send" | "receive" }
    activeFileTransferId: null,
    isScreenSharing: false,
    isRemoteScreenSharing: false,
    screenStream: null,
    
    // Calling States
    callState: "idle", // "idle" | "ringing" | "incoming" | "connected"
    callType: null, // "audio" | "video"
    activeCallUser: null,
    localStream: null,
    remoteStream: null,
    isMuted: false,
    isCameraOff: false,
    isRemoteCameraOff: false,
    callConnection: null,

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
            
            // Recreate temporary object URLs for images stored as Blobs
            const processedMsgs = localMsgs.map(m => {
                if (m.fileBlob && m.fileType && m.fileType.startsWith("image/")) {
                    try {
                        return {
                            ...m,
                            image: URL.createObjectURL(m.fileBlob)
                        };
                    } catch (e) {
                        console.error("Error creating Object URL for stored fileBlob:", e);
                    }
                }
                return m;
            });

            set({ messages: processedMsgs });

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

                // Auto-reconnect if the user is still online and we are still viewing their chat
                const onlineUsers = useAuthStore.getState().onlineUsers;
                const isFriendOnline = onlineUsers.includes(friendId);
                const selectedUser = get().selectedUser;
                
                if (isFriendOnline && selectedUser && selectedUser._id === friendId) {
                    console.log(`Attempting P2P reconnection with ${friendId}...`);
                    setTimeout(() => {
                        if (get().selectedUser?._id === friendId) {
                            get().connectToPeer(friendId);
                        }
                    }, 3000);
                }
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
            // Send request to initiator to send/re-send the offer
            socket.emit("webrtc-signal", {
                to: friendId,
                signal: { type: "request-offer" }
            });
        }
    },

    setupDataChannel: (friendId, dc) => {
        dc.binaryType = "arraybuffer";
        dc.bufferedAmountLowThreshold = 65536; // 64KB backpressure threshold
        dataChannels[friendId] = dc;

        dc.onopen = () => {
            console.log(`P2P data channel with ${friendId} is open`);
            set({ p2pStatus: "connected" });
            get().syncHistories(friendId);

            // Check for any pending file transfers to this friend to resume
            Object.keys(activeSendFileTransfers).forEach(fId => {
                const tx = activeSendFileTransfers[fId];
                if (tx.peerId === friendId) {
                    console.log(`Resuming file transfer query for ${fId} with ${friendId}`);
                    try {
                        dc.send(JSON.stringify({
                            type: "file-resume-query",
                            fileId: fId
                        }));
                    } catch (e) {
                        console.error("Error sending file-resume-query:", e);
                    }
                }
            });
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
            const remoteMap = new Map(remoteManifest.map(m => [m._id, m]));

            const dc = dataChannels[friendId];
            if (!dc || dc.readyState !== "open") return;

            // 1. Sync messages we have but they don't
            for (const localMsg of localMsgs) {
                if (!remoteMap.has(localMsg._id)) {
                    if (localMsg.fileBlob) {
                        // Send binary file chunk-by-chunk to preserve fileBlob
                        get().sendFile(localMsg.fileBlob, localMsg.text, localMsg._id, localMsg.createdAt);
                    } else {
                        dc.send(JSON.stringify({
                            type: "chat-message",
                            message: localMsg
                        }));
                    }
                }
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
                    if (msg.fileBlob) {
                        get().sendFile(msg.fileBlob, msg.text, msg._id, msg.createdAt);
                    } else {
                        dc.send(JSON.stringify({
                            type: "chat-message",
                            message: msg
                        }));
                    }
                }
            }
        }

        if (data.type === "file-resume-query") {
            const { fileId } = data;
            const transfer = fileTransfers[fileId];
            const dc = dataChannels[friendId];
            if (!dc || dc.readyState !== "open") return;

            if (transfer) {
                console.log(`Received file-resume-query for active transfer ${fileId}, reporting ${transfer.receivedSize} bytes`);
                dc.send(JSON.stringify({
                    type: "file-resume-response",
                    fileId,
                    receivedSize: transfer.receivedSize,
                    needsMeta: false
                }));
                set({ 
                    fileProgress: { 
                        fileId, 
                        peerId: friendId, 
                        fileName: transfer.meta.fileName, 
                        progress: Math.min(100, Math.round((transfer.receivedSize / transfer.meta.fileSize) * 100)), 
                        type: "receive" 
                    } 
                });
            } else {
                console.log(`Received file-resume-query for unknown transfer ${fileId}, reporting 0 bytes and request meta`);
                dc.send(JSON.stringify({
                    type: "file-resume-response",
                    fileId,
                    receivedSize: 0,
                    needsMeta: true
                }));
            }
        }

        if (data.type === "file-resume-response") {
            const { fileId, receivedSize, needsMeta } = data;
            const tx = activeSendFileTransfers[fileId];
            if (tx && typeof tx.resume === "function") {
                console.log(`Received file-resume-response for ${fileId}, resuming from offset ${receivedSize}`);
                const dc = dataChannels[friendId];
                if (!dc || dc.readyState !== "open") return;

                set({ 
                    activeFileTransferId: fileId,
                    fileProgress: { 
                        fileId, 
                        peerId: friendId, 
                        fileName: tx.file.name, 
                        progress: Math.min(100, Math.round((receivedSize / tx.file.size) * 100)), 
                        type: "send" 
                    } 
                });

                if (needsMeta) {
                    dc.send(JSON.stringify({
                        type: "file-meta",
                        meta: {
                            fileId,
                            fileName: tx.file.name,
                            fileSize: tx.file.size,
                            fileType: tx.file.type,
                            messageId: tx.messageId,
                            senderId: myId,
                            receiverId: friendId,
                            createdAt: tx.createdAt,
                            text: tx.text,
                            isSync: tx.isSync
                        }
                    }));
                    setTimeout(() => {
                        tx.resume(receivedSize);
                    }, 200);
                } else {
                    tx.resume(receivedSize);
                }
            }
        }

        if (data.type === "chat-message") {
            const msg = data.message;
            await saveLocalMessage(msg);
            playMessageSound();
            if (selectedUser && selectedUser._id === friendId) {
                const currentMsgs = get().messages;
                if (!currentMsgs.some(m => m._id === msg._id)) {
                    // Recreate object URL if it has a fileBlob
                    const processedMsg = (msg.fileBlob && msg.fileType && msg.fileType.startsWith("image/"))
                        ? { ...msg, image: URL.createObjectURL(msg.fileBlob) }
                        : msg;
                    set({ messages: [...currentMsgs, processedMsg] });
                }
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
            const { fileId, fileName, senderId, isSync } = data.meta;
            fileTransfers[fileId] = {
                meta: data.meta,
                chunks: [],
                receivedSize: 0
            };
            if (!isSync) {
                set({ fileProgress: { fileId, peerId: senderId, fileName, progress: 0, type: "receive" } });
            }
        }

        if (data.type === "file-cancel") {
            const { fileId } = data;
            
            // If we were receiving this file
            if (fileTransfers[fileId]) {
                const fileName = fileTransfers[fileId].meta.fileName;
                delete fileTransfers[fileId];
                set({ fileProgress: null });
                toast.error(`File transfer of "${fileName}" was stopped by the sender.`);
            }
            
            // If we were sending this file
            if (get().activeFileTransferId === fileId) {
                set({ activeFileTransferId: null, fileProgress: null });
                toast.error("File transfer stopped by the receiver.");
            }
        }
    },

    sendFile: async (file, text, existingMessageId = null, existingCreatedAt = null) => {
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
        const messageId = existingMessageId || "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
        const createdAt = existingCreatedAt || new Date().toISOString();

        // Send metadata
        try {
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
                    text,
                    isSync: !!existingMessageId
                }
            }));
        } catch (err) {
            console.error("Error sending file metadata:", err);
            toast.error("Connection error. Could not send file.");
            return;
        }

        if (!existingMessageId) {
            set({ 
                activeFileTransferId: fileId,
                fileProgress: { fileId, peerId: friendId, fileName: file.name, progress: 0, type: "send" } 
            });
        }

        const chunkSize = 16384; // 16KB

        const readSlice = (o) => {
            // Check if transfer was cancelled by user
            if (!existingMessageId && get().activeFileTransferId !== fileId && get().activeFileTransferId !== null) {
                console.log("File sending cancelled by user.");
                delete activeSendFileTransfers[fileId];
                return;
            }

            const activeDc = dataChannels[friendId];
            if (!activeDc || activeDc.readyState !== "open") {
                console.error("Data channel closed during file transfer.");
                toast.error("Connection lost. File transfer paused.");
                if (!existingMessageId) set({ fileProgress: null, activeFileTransferId: null });
                return;
            }

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

                const currentDc = dataChannels[friendId];
                if (!currentDc || currentDc.readyState !== "open") {
                    console.error("Data channel lost before sending chunk.");
                    toast.error("Connection lost. File transfer paused.");
                    if (!existingMessageId) set({ fileProgress: null, activeFileTransferId: null });
                    return;
                }

                try {
                    currentDc.send(chunkBuffer.buffer);
                } catch (err) {
                    console.error("Error sending chunk:", err);
                    toast.error("Failed to send chunk. Connection lost.");
                    if (!existingMessageId) set({ fileProgress: null, activeFileTransferId: null });
                    return;
                }

                const newOffset = o + chunkSize;
                const progress = Math.min(100, Math.round((newOffset / file.size) * 100));
                if (!existingMessageId) {
                    set({ fileProgress: { fileId, peerId: friendId, fileName: file.name, progress, type: "send" } });
                }

                if (newOffset < file.size) {
                    if (currentDc.bufferedAmount > currentDc.bufferedAmountLowThreshold) {
                        currentDc.onbufferedamountlow = () => {
                            currentDc.onbufferedamountlow = null;
                            readSlice(newOffset);
                        };
                    } else {
                        setTimeout(() => readSlice(newOffset), 1);
                    }
                } else {
                    // Send complete! Save locally as Blob URL
                    delete activeSendFileTransfers[fileId];
                    const localMsg = {
                        _id: messageId,
                        chatKey: `${myId}_${friendId}`,
                        senderId: myId,
                        receiverId: friendId,
                        text,
                        fileBlob: file, // Keep actual file/image binary persistently in IndexedDB
                        image: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
                        fileName: file.name,
                        fileSize: file.size,
                        fileType: file.type,
                        createdAt
                    };
                    await saveLocalMessage(localMsg);
                    if (!existingMessageId) {
                        set({ messages: [...get().messages, localMsg], fileProgress: null, activeFileTransferId: null });
                    }
                }
            };
            reader.readAsArrayBuffer(slice);
        };

        activeSendFileTransfers[fileId] = {
            file,
            peerId: friendId,
            messageId,
            createdAt,
            text,
            isSync: !!existingMessageId,
            resume: (offset) => {
                console.log(`Resuming file transfer ${fileId} at offset ${offset}`);
                readSlice(offset);
            }
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

        const isSync = transfer.meta.isSync;

        if (!isSync) {
            const progress = Math.min(100, Math.round((transfer.receivedSize / transfer.meta.fileSize) * 100));
            set({ fileProgress: { fileId, peerId: friendId, fileName: transfer.meta.fileName, progress, type: "receive" } });
        }

        if (transfer.receivedSize >= transfer.meta.fileSize) {
            // Reassemble chunks into a single Blob
            const blob = new Blob(transfer.chunks, { type: transfer.meta.fileType });

            const localMsg = {
                _id: transfer.meta.messageId,
                chatKey: `${transfer.meta.senderId}_${transfer.meta.receiverId}`,
                senderId: transfer.meta.senderId,
                receiverId: transfer.meta.receiverId,
                text: transfer.meta.text,
                fileBlob: blob, // Keep actual file/image binary persistently in IndexedDB
                image: transfer.meta.fileType.startsWith("image/") ? URL.createObjectURL(blob) : null,
                fileName: transfer.meta.fileName,
                fileSize: transfer.meta.fileSize,
                fileType: transfer.meta.fileType,
                createdAt: transfer.meta.createdAt
            };

            await saveLocalMessage(localMsg);
            const { selectedUser } = get();
            if (selectedUser && selectedUser._id === friendId) {
                const currentMsgs = get().messages;
                if (!currentMsgs.some(m => m._id === localMsg._id)) {
                    set({ messages: [...currentMsgs, localMsg] });
                }
            } else {
                playMessageSound();
            }

            delete fileTransfers[fileId];
            if (!isSync) {
                set({ fileProgress: null });
            }
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

        const sendSocketFallback = async () => {
            const socket = useAuthStore.getState().socket;
            if (!socket) return;

            try {
                if (!selectedUser.publicKeyJWK) {
                    console.warn("Recipient has no E2EE public key. Sending plaintext fallback.");
                    socket.emit("chat-fallback-message", {
                        to: friendId,
                        message: localMsg
                    });
                    return;
                }

                const myKeypair = await getLocalKeypair(myId);
                if (!myKeypair) {
                    console.error("Local private key missing. Sending plaintext fallback.");
                    socket.emit("chat-fallback-message", {
                        to: friendId,
                        message: localMsg
                    });
                    return;
                }

                const remotePub = await importPublicKey(selectedUser.publicKeyJWK);
                const sharedKey = await deriveSharedKey(myKeypair.privateKey, remotePub);
                const encrypted = await encryptPayload(localMsg, sharedKey);

                socket.emit("chat-fallback-message", {
                    to: friendId,
                    message: {
                        isEncrypted: true,
                        iv: encrypted.iv,
                        ciphertext: encrypted.ciphertext,
                        senderId: myId
                    }
                });
            } catch (e) {
                console.error("Failed to encrypt fallback message. Sending plaintext fallback:", e);
                socket.emit("chat-fallback-message", {
                    to: friendId,
                    message: localMsg
                });
            }
        };

        // Use the socket path for reliable delivery, while keeping WebRTC for live sync.
        sendSocketFallback();

        const dc = dataChannels[friendId];
        if (dc && dc.readyState === "open") {
            try {
                dc.send(JSON.stringify({
                    type: "chat-message",
                    message: localMsg
                }));
            } catch (e) {
                console.error("Error sending P2P chat message:", e);
            }
        }
    },

    deleteMessage: async (messageId, deleteForAll = true) => {
        const { selectedUser, messages } = get();
        if (!selectedUser) return;
        const friendId = selectedUser._id;

        // Delete from local IndexedDB
        await deleteLocalMessage(messageId);
        set({ messages: messages.filter(m => m._id !== messageId) });

        if (!deleteForAll) return;

        // Send P2P delete event, otherwise fallback to socket.io
        const dc = dataChannels[friendId];
        if (dc && dc.readyState === "open") {
            dc.send(JSON.stringify({
                type: "delete-message",
                messageId
            }));
        } else {
            const socket = useAuthStore.getState().socket;
            if (socket && socket.connected) {
                socket.emit("chat-fallback-delete", {
                    to: friendId,
                    messageId
                });
            }
        }
    },

    clearChatHistory: async (friendId) => {
        const myId = useAuthStore.getState().authUser?._id;
        if (!myId || !friendId) return;

        try {
            const { deleteLocalMessagesForChat } = await import("../lib/db.js");
            await deleteLocalMessagesForChat(myId, friendId);

            const { selectedUser } = get();
            if (selectedUser && selectedUser._id === friendId) {
                set({ messages: [] });
            }

            const socket = useAuthStore.getState().socket;
            if (socket && socket.connected) {
                socket.emit("clear-chat-history", { to: friendId });
            }
            toast.success("Chat history deleted");
        } catch (err) {
            console.error("Failed to clear chat history:", err);
            toast.error("Failed to clear chat history");
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

        socket.off("typing");
        socket.off("stop typing");
        socket.off("offline-messages-deliver");

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

        socket.on("offline-messages-deliver", async (offlineMsgs) => {
            if (!Array.isArray(offlineMsgs) || offlineMsgs.length === 0) return;

            const acknowledgedIds = [];
            const { selectedUser } = get();
            const myId = useAuthStore.getState().authUser?._id;

            for (const item of offlineMsgs) {
                let msg = item.messageData;
                acknowledgedIds.push(item._id);

                // Decrypt if it is an E2EE package
                if (msg && msg.isEncrypted) {
                    try {
                        const myKeypair = await getLocalKeypair(myId);
                        const senderUser = get().users.find(u => u._id === item.senderId);
                        if (myKeypair && senderUser && senderUser.publicKeyJWK) {
                            const senderPub = await importPublicKey(senderUser.publicKeyJWK);
                            const sharedKey = await deriveSharedKey(myKeypair.privateKey, senderPub);
                            msg = await decryptPayload(msg.iv, msg.ciphertext, sharedKey);
                        } else {
                            console.error("Missing keys to decrypt offline message");
                            continue;
                        }
                    } catch (decErr) {
                        console.error("Failed to decrypt offline message:", decErr);
                        continue;
                    }
                }

                await saveLocalMessage(msg);

                if (selectedUser && selectedUser._id === item.senderId) {
                    const currentMsgs = get().messages;
                    if (!currentMsgs.some(m => m._id === msg._id)) {
                        const processedMsg = (msg.fileBlob && msg.fileType && msg.fileType.startsWith("image/"))
                            ? { ...msg, image: URL.createObjectURL(msg.fileBlob) }
                            : msg;
                        set({ messages: [...currentMsgs, processedMsg] });
                    }
                } else {
                    playMessageSound();
                }
            }

            if (acknowledgedIds.length > 0) {
                socket.emit("acknowledge-offline-messages", acknowledgedIds);
            }
        });
    },

    unSubscribeToMessages: () => {
        const socket = useAuthStore.getState().socket;
        if (socket) {
            socket.off("typing");
            socket.off("stop typing");
            socket.off("offline-messages-deliver");
        }
    },

    handleChatSignal: async ({ from, signal }) => {
        const socket = useAuthStore.getState().socket;
        if (!socket) return;

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

                    // Auto-reconnect if the user is still online and we are still viewing their chat
                    const onlineUsers = useAuthStore.getState().onlineUsers;
                    const isFriendOnline = onlineUsers.includes(from);
                    const selectedUser = get().selectedUser;
                    
                    if (isFriendOnline && selectedUser && selectedUser._id === from) {
                        console.log(`Attempting P2P reconnection with ${from}...`);
                        setTimeout(() => {
                            if (get().selectedUser?._id === from) {
                                get().connectToPeer(from);
                            }
                        }, 3000);
                    }
                }
            };

            pc.ondatachannel = (event) => {
                get().setupDataChannel(from, event.channel);
            };
        }

        try {
            if (signal.type === "request-offer") {
                if (pc.connectionState === "connected") return;
                const myId = useAuthStore.getState().authUser?._id;
                const isInitiator = myId < from;
                if (isInitiator) {
                    if (!dataChannels[from]) {
                        const dc = pc.createDataChannel("chat");
                        get().setupDataChannel(from, dc);
                    }
                    try {
                        const offer = await pc.createOffer();
                        await pc.setLocalDescription(offer);
                        socket.emit("webrtc-signal", {
                            to: from,
                            signal: { type: "offer", sdp: offer }
                        });
                    } catch (err) {
                        console.error("Error creating WebRTC offer on request-offer:", err);
                    }
                }
            } else if (signal.type === "offer") {
                await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                if (pc.iceQueue && pc.iceQueue.length > 0) {
                    for (const cand of pc.iceQueue) {
                        try {
                            await pc.addIceCandidate(new RTCIceCandidate(cand));
                        } catch (e) {
                            console.error("Error adding queued ICE candidate:", e);
                        }
                    }
                    pc.iceQueue = [];
                }
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit("webrtc-signal", {
                    to: from,
                    signal: { type: "answer", sdp: answer }
                });
            } else if (signal.type === "answer") {
                await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                if (pc.iceQueue && pc.iceQueue.length > 0) {
                    for (const cand of pc.iceQueue) {
                        try {
                            await pc.addIceCandidate(new RTCIceCandidate(cand));
                        } catch (e) {
                            console.error("Error adding queued ICE candidate:", e);
                        }
                    }
                    pc.iceQueue = [];
                }
            } else if (signal.type === "candidate") {
                if (pc.remoteDescription && pc.remoteDescription.type) {
                    await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
                } else {
                    pc.iceQueue = pc.iceQueue || [];
                    pc.iceQueue.push(signal.candidate);
                }
            }
        } catch (err) {
            console.error("Error setting WebRTC description/candidate:", err);
        }
    },

    startCall: async (user, type) => {
        if (get().callState !== "idle") {
            toast.error("You are already in a call.");
            return;
        }

        const socket = useAuthStore.getState().socket;
        if (!socket) return;

        const onlineUsers = useAuthStore.getState().onlineUsers;
        const isOnline = onlineUsers.includes(user._id);

        if (!isOnline) {
            toast.error(`${user.fullName} is offline. Missed call logged.`);
            
            // Add local missed call message
            const myId = useAuthStore.getState().authUser?._id;
            const messageId = "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
            const localMsg = {
                _id: messageId,
                chatKey: `${myId}_${user._id}`,
                senderId: myId,
                receiverId: user._id,
                text: `Missed ${type} call`,
                isSystem: true,
                createdAt: new Date().toISOString()
            };
            await saveLocalMessage(localMsg);
            if (get().selectedUser?._id === user._id) {
                set({ messages: [...get().messages, localMsg] });
            }

            // Signal offline server queue
            socket.emit("webrtc-signal", {
                to: user._id,
                signal: { type: "call-offer", callType: type }
            });
            return;
        }

        set({
            callState: "ringing",
            callType: type,
            activeCallUser: user,
            isMuted: false,
            isCameraOff: false,
            isRemoteCameraOff: false
        });

        startDialTone();

        try {
            const constraints = {
                audio: true,
                video: type === "video"
            };
            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (mediaErr) {
                if (constraints.video) {
                    console.warn("Camera not available, falling back to audio-only stream.");
                    toast.error("No camera found. Calling with microphone only.");
                    constraints.video = false;
                    set({ isCameraOff: true });
                    stream = await navigator.mediaDevices.getUserMedia(constraints);
                } else {
                    throw mediaErr;
                }
            }
            set({ localStream: stream });

            const pc = new RTCPeerConnection(peerConfiguration);
            set({ callConnection: pc });

            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit("webrtc-signal", {
                        to: user._id,
                        signal: { type: "call-candidate", candidate: event.candidate }
                    });
                }
            };

            pc.ontrack = (event) => {
                set({ remoteStream: event.streams[0] });
            };

            pc.onconnectionstatechange = () => {
                if (pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
                    get().endCall();
                }
            };

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socket.emit("webrtc-signal", {
                to: user._id,
                signal: { type: "call-offer", sdp: offer, callType: type }
            });

        } catch (err) {
            console.error("Failed to start call:", err);
            toast.error("Failed to access camera or microphone.");
            get().endCall();
        }
    },

    acceptCall: async () => {
        const { callState, callType, activeCallUser, callOfferSdp } = get();
        if (callState !== "incoming" || !activeCallUser) return;

        const socket = useAuthStore.getState().socket;
        if (!socket) return;

        stopTone();
        set({ callState: "connected" });

        try {
            const constraints = {
                audio: true,
                video: callType === "video"
            };
            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (mediaErr) {
                if (constraints.video) {
                    console.warn("Camera not available, falling back to audio-only stream.");
                    toast.error("No camera found. Connecting with microphone only.");
                    constraints.video = false;
                    set({ isCameraOff: true });
                    stream = await navigator.mediaDevices.getUserMedia(constraints);
                } else {
                    throw mediaErr;
                }
            }
            set({ localStream: stream });

            const pc = new RTCPeerConnection(peerConfiguration);
            set({ callConnection: pc });

            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit("webrtc-signal", {
                        to: activeCallUser._id,
                        signal: { type: "call-candidate", candidate: event.candidate }
                    });
                }
            };

            pc.ontrack = (event) => {
                set({ remoteStream: event.streams[0] });
            };

            pc.onconnectionstatechange = () => {
                if (pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
                    get().endCall();
                }
            };

            await pc.setRemoteDescription(new RTCSessionDescription(callOfferSdp));

            if (callIceQueue && callIceQueue.length > 0) {
                for (const cand of callIceQueue) {
                    try {
                        await pc.addIceCandidate(new RTCIceCandidate(cand));
                    } catch (e) {
                        console.error("Error adding queued call candidate:", e);
                    }
                }
                callIceQueue = [];
            }

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit("webrtc-signal", {
                to: activeCallUser._id,
                signal: { type: "call-answer", sdp: answer }
            });

        } catch (err) {
            console.error("Error accepting call:", err);
            toast.error("Failed to access camera or microphone.");
            get().rejectCall();
        }
    },

    rejectCall: () => {
        const { activeCallUser } = get();
        stopTone();

        if (activeCallUser) {
            const socket = useAuthStore.getState().socket;
            if (socket) {
                socket.emit("webrtc-signal", {
                    to: activeCallUser._id,
                    signal: { type: "call-rejected" }
                });
            }
        }

        get().cleanupCallState();
    },

    rejectWithBusyMessage: async () => {
        const { activeCallUser } = get();
        if (!activeCallUser) return;
        
        get().rejectCall();

        set({ selectedUser: activeCallUser });

        const messageText = "I'm busy right now, I'll call you later.";
        await get().sendMessage({ text: messageText });
    },

    endCall: () => {
        const { activeCallUser } = get();
        stopTone();

        if (activeCallUser) {
            const socket = useAuthStore.getState().socket;
            if (socket) {
                socket.emit("webrtc-signal", {
                    to: activeCallUser._id,
                    signal: { type: "call-hangup" }
                });
            }
        }

        get().cleanupCallState();
    },

    cleanupCallState: () => {
        stopTone();
        callIceQueue = [];
        
        if (screenAudioMix) {
            try {
                screenAudioMix.micSource.disconnect();
                screenAudioMix.screenSource.disconnect();
                screenAudioMix.ctx.close();
            } catch (e) {}
            screenAudioMix = null;
        }

        const { localStream, callConnection, screenStream } = get();

        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }

        if (screenStream) {
            screenStream.getTracks().forEach(track => track.stop());
        }

        if (callConnection) {
            try {
                callConnection.close();
            } catch (e) {}
        }

        set({
            callState: "idle",
            callType: null,
            activeCallUser: null,
            localStream: null,
            remoteStream: null,
            isMuted: false,
            isCameraOff: false,
            isRemoteCameraOff: false,
            isRemoteScreenSharing: false,
            callConnection: null,
            callOfferSdp: null,
            isScreenSharing: false,
            screenStream: null
        });
    },

    toggleMute: () => {
        const { localStream, isMuted } = get();
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = isMuted;
            });
            set({ isMuted: !isMuted });
        }
    },

    toggleCamera: () => {
        const { localStream, isCameraOff, activeCallUser } = get();
        if (localStream) {
            localStream.getVideoTracks().forEach(track => {
                track.enabled = isCameraOff;
            });
            const newIsCameraOff = !isCameraOff;
            set({ isCameraOff: newIsCameraOff });

            // Notify the remote peer of the camera status
            const socket = useAuthStore.getState().socket;
            if (socket && activeCallUser) {
                socket.emit("webrtc-signal", {
                    to: activeCallUser._id,
                    signal: { type: "call-camera-toggle", isCameraOff: newIsCameraOff }
                });
            }
        }
    },

    toggleScreenShare: async () => {
        const { isScreenSharing, localStream, screenStream, callConnection, activeCallUser } = get();
        const socket = useAuthStore.getState().socket;

        if (isScreenSharing) {
            if (screenStream) {
                screenStream.getTracks().forEach(track => track.stop());
            }

            if (localStream && callConnection) {
                const senders = callConnection.getSenders();
                const videoSender = senders.find(s => s.track && s.track.kind === "video");
                const cameraTrack = localStream.getVideoTracks()[0];
                if (videoSender && cameraTrack) {
                    try {
                        await videoSender.replaceTrack(cameraTrack);
                    } catch (err) {
                        console.error("Error restoring camera track:", err);
                    }
                }

                // Restore microphone track if we had mixed audio
                if (screenAudioMix) {
                    try {
                        const audioSender = senders.find(s => s.track && s.track.kind === "audio");
                        const micTrack = localStream.getAudioTracks()[0];
                        if (audioSender && micTrack) {
                            await audioSender.replaceTrack(micTrack);
                        }
                    } catch (err) {
                        console.error("Error restoring microphone track:", err);
                    }
                    
                    // Clean up AudioContext nodes
                    try {
                        screenAudioMix.micSource.disconnect();
                        screenAudioMix.screenSource.disconnect();
                        screenAudioMix.ctx.close();
                    } catch (e) {}
                    screenAudioMix = null;
                }
            }

            // Notify the remote peer
            if (socket && activeCallUser) {
                socket.emit("webrtc-signal", {
                    to: activeCallUser._id,
                    signal: { type: "call-screen-share-toggle", isScreenSharing: false }
                });
            }

            set({
                isScreenSharing: false,
                screenStream: null
            });
            
            toast.success("Stopped sharing screen");
        } else {
            try {
                // Request screen stream with safe constraints and audio option enabled
                const stream = await navigator.mediaDevices.getDisplayMedia({ 
                    video: {
                        width: { max: 1920 },
                        height: { max: 1080 },
                        frameRate: { max: 30 }
                    },
                    audio: true
                });
                const screenTrack = stream.getVideoTracks()[0];
                const screenAudioTrack = stream.getAudioTracks()[0];

                if (callConnection) {
                    const senders = callConnection.getSenders();
                    
                    // Replace video track
                    const videoSender = senders.find(s => s.track && s.track.kind === "video");
                    if (videoSender) {
                        await videoSender.replaceTrack(screenTrack);
                    }

                    // Mix screen audio with microphone audio if available
                    if (screenAudioTrack && localStream) {
                        const micTrack = localStream.getAudioTracks()[0];
                        if (micTrack) {
                            try {
                                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                                const micSource = ctx.createMediaStreamSource(new MediaStream([micTrack]));
                                const screenSource = ctx.createMediaStreamSource(new MediaStream([screenAudioTrack]));
                                const dest = ctx.createMediaStreamDestination();

                                micSource.connect(dest);
                                screenSource.connect(dest);

                                const mixedTrack = dest.stream.getAudioTracks()[0];
                                const audioSender = senders.find(s => s.track && s.track.kind === "audio");
                                if (audioSender) {
                                    await audioSender.replaceTrack(mixedTrack);
                                }

                                screenAudioMix = {
                                    ctx,
                                    micSource,
                                    screenSource,
                                    dest
                                };
                            } catch (e) {
                                console.error("Error mixing screen audio:", e);
                            }
                        }
                    }
                }

                screenTrack.onended = () => {
                    get().stopScreenShareInternal();
                };

                // Notify the remote peer
                if (socket && activeCallUser) {
                    socket.emit("webrtc-signal", {
                        to: activeCallUser._id,
                        signal: { type: "call-screen-share-toggle", isScreenSharing: true }
                    });
                }

                set({
                    isScreenSharing: true,
                    screenStream: stream
                });

                toast.success("Sharing screen");
            } catch (err) {
                console.error("Failed to share screen:", err);
                toast.error("Failed to share screen.");
            }
        }
    },

    stopScreenShareInternal: async () => {
        const { isScreenSharing, localStream, screenStream, callConnection, activeCallUser } = get();
        if (!isScreenSharing) return;

        if (screenStream) {
            screenStream.getTracks().forEach(track => track.stop());
        }

        if (localStream && callConnection) {
            const senders = callConnection.getSenders();
            const videoSender = senders.find(s => s.track && s.track.kind === "video");
            const cameraTrack = localStream.getVideoTracks()[0];
            if (videoSender && cameraTrack) {
                try {
                    await videoSender.replaceTrack(cameraTrack);
                } catch (err) {}
            }

            // Restore microphone track if we had mixed audio
            if (screenAudioMix) {
                try {
                    const audioSender = senders.find(s => s.track && s.track.kind === "audio");
                    const micTrack = localStream.getAudioTracks()[0];
                    if (audioSender && micTrack) {
                        await audioSender.replaceTrack(micTrack);
                    }
                } catch (err) {
                    console.error("Error restoring microphone track:", err);
                }
                
                // Clean up AudioContext nodes
                try {
                    screenAudioMix.micSource.disconnect();
                    screenAudioMix.screenSource.disconnect();
                    screenAudioMix.ctx.close();
                } catch (e) {}
                screenAudioMix = null;
            }
        }

        // Notify the remote peer
        const socket = useAuthStore.getState().socket;
        if (socket && activeCallUser) {
            socket.emit("webrtc-signal", {
                to: activeCallUser._id,
                signal: { type: "call-screen-share-toggle", isScreenSharing: false }
            });
        }

        set({
            isScreenSharing: false,
            screenStream: null
        });
    },

    handleCallSignal: async ({ from, signal }) => {
        const socket = useAuthStore.getState().socket;
        if (!socket) return;

        const { callState, callConnection } = get();

        if (signal.type === "call-offer") {
            if (callState !== "idle") {
                socket.emit("webrtc-signal", {
                    to: from,
                    signal: { type: "call-rejected", reason: "busy" }
                });
                return;
            }

            const chatUsers = get().users;
            const senderUser = chatUsers.find(u => u._id === from);
            
            set({
                callState: "incoming",
                callType: signal.callType,
                activeCallUser: senderUser || { _id: from, fullName: "Unknown User" },
                callOfferSdp: signal.sdp
            });

            startRingTone();
        }

        else if (signal.type === "call-answer") {
            const pc = callConnection;
            if (pc) {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                    stopTone();
                    set({ callState: "connected" });

                    if (callIceQueue && callIceQueue.length > 0) {
                        for (const cand of callIceQueue) {
                            try {
                                await pc.addIceCandidate(new RTCIceCandidate(cand));
                            } catch (e) {}
                        }
                        callIceQueue = [];
                    }
                } catch (e) {
                    console.error("Error setting call remote description:", e);
                }
            }
        }

        else if (signal.type === "call-candidate") {
            const pc = callConnection;
            if (pc && pc.remoteDescription && pc.remoteDescription.type) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
                } catch (e) {
                    console.error("Error adding call candidate:", e);
                }
            } else {
                callIceQueue.push(signal.candidate);
            }
        }

        else if (signal.type === "call-rejected") {
            stopTone();
            const caller = get().activeCallUser;
            if (caller) {
                // Add local missed call message
                const myId = useAuthStore.getState().authUser?._id;
                const messageId = "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
                const localMsg = {
                    _id: messageId,
                    chatKey: `${myId}_${caller._id}`,
                    senderId: myId,
                    receiverId: caller._id,
                    text: `Missed ${get().callType || "audio"} call`,
                    isSystem: true,
                    createdAt: new Date().toISOString()
                };
                await saveLocalMessage(localMsg);
                if (get().selectedUser?._id === caller._id) {
                    set({ messages: [...get().messages, localMsg] });
                }
            }

            if (signal.reason === "busy") {
                toast.error(`${get().activeCallUser?.fullName || "User"} is busy on another call.`);
            } else {
                toast.error("Call declined.");
            }
            get().cleanupCallState();
        }

        else if (signal.type === "call-hangup") {
            stopTone();
            toast.error("Call ended.");
            get().cleanupCallState();
        }

        else if (signal.type === "call-camera-toggle") {
            set({ isRemoteCameraOff: signal.isCameraOff });
        }

        else if (signal.type === "call-screen-share-toggle") {
            set({ isRemoteScreenSharing: signal.isScreenSharing });
        }
    },

    cancelFileTransfer: () => {
        const { fileProgress, selectedUser } = get();
        if (!fileProgress) return;

        const { fileId, type } = fileProgress;
        
        // 1. If we are the sender
        if (type === "send") {
            set({ activeFileTransferId: null, fileProgress: null });
        } 
        // 2. If we are the receiver
        else if (type === "receive") {
            // Clean up transfer buffer
            delete fileTransfers[fileId];
            set({ fileProgress: null });
        }

        // Notify the peer
        if (selectedUser) {
            const dc = dataChannels[selectedUser._id];
            if (dc && dc.readyState === "open") {
                try {
                    dc.send(JSON.stringify({
                        type: "file-cancel",
                        fileId
                    }));
                } catch (e) {
                    console.error("Error sending file-cancel:", e);
                }
            }
        }
        toast.success("File transfer stopped.");
    },

    setSelectedUser: (selectedUser) => set({ selectedUser }),
}));
