import { create } from "zustand";
import { toast } from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";
import { useAuthStore } from "./useAuthStore.js";
import { playMessageSound } from "../lib/sounds.js";
import { getLocalMessages, saveLocalMessage, deleteLocalMessage } from "../lib/db.js";
import { startDialTone, startRingTone, stopTone } from "../lib/ringtone.js";


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
    fileProgress: null, // { fileId, fileName, progress, type: "send" | "receive" }
    activeFileTransferId: null,
    
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

        if (data.type === "chat-message") {
            const msg = data.message;
            await saveLocalMessage(msg);
            if (selectedUser && selectedUser._id === friendId) {
                const currentMsgs = get().messages;
                if (!currentMsgs.some(m => m._id === msg._id)) {
                    // Recreate object URL if it has a fileBlob
                    const processedMsg = (msg.fileBlob && msg.fileType && msg.fileType.startsWith("image/"))
                        ? { ...msg, image: URL.createObjectURL(msg.fileBlob) }
                        : msg;
                    set({ messages: [...currentMsgs, processedMsg] });
                }
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
            const { fileId, fileName, fileSize, fileType, messageId, senderId, receiverId, createdAt, text, isSync } = data.meta;
            fileTransfers[fileId] = {
                meta: data.meta,
                chunks: [],
                receivedSize: 0
            };
            if (!isSync) {
                set({ fileProgress: { fileId, fileName, progress: 0, type: "receive" } });
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
                fileProgress: { fileId, fileName: file.name, progress: 0, type: "send" } 
            });
        }

        const chunkSize = 16384; // 16KB

        const readSlice = (o) => {
            // Check if transfer was cancelled by user
            if (!existingMessageId && get().activeFileTransferId !== fileId) {
                console.log("File sending cancelled by user.");
                return;
            }

            if (dc.readyState !== "open") {
                console.error("Data channel closed during file transfer.");
                toast.error("Connection lost. File transfer failed.");
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

                try {
                    dc.send(chunkBuffer.buffer);
                } catch (err) {
                    console.error("Error sending chunk:", err);
                    toast.error("Failed to send chunk. Connection lost.");
                    if (!existingMessageId) set({ fileProgress: null, activeFileTransferId: null });
                    return;
                }

                const newOffset = o + chunkSize;
                const progress = Math.min(100, Math.round((newOffset / file.size) * 100));
                if (!existingMessageId) {
                    set({ fileProgress: { fileId, fileName: file.name, progress, type: "send" } });
                }

                if (newOffset < file.size) {
                    if (dc.bufferedAmount > dc.bufferedAmountLowThreshold) {
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
            set({ fileProgress: { fileName: transfer.meta.fileName, progress, type: "receive" } });
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
            socket.off("typing");
            socket.off("stop typing");
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
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
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
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
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

            if (pc.callIceQueue && pc.callIceQueue.length > 0) {
                for (const cand of pc.callIceQueue) {
                    try {
                        await pc.addIceCandidate(new RTCIceCandidate(cand));
                    } catch (e) {
                        console.error("Error adding queued call candidate:", e);
                    }
                }
                pc.callIceQueue = [];
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
        const { localStream, callConnection } = get();

        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
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
            callConnection: null,
            callOfferSdp: null
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

                    if (pc.callIceQueue && pc.callIceQueue.length > 0) {
                        for (const cand of pc.callIceQueue) {
                            try {
                                await pc.addIceCandidate(new RTCIceCandidate(cand));
                            } catch (e) {}
                        }
                        pc.callIceQueue = [];
                    }
                } catch (e) {
                    console.error("Error setting call remote description:", e);
                }
            }
        }

        else if (signal.type === "call-candidate") {
            const pc = callConnection;
            if (pc) {
                if (pc.remoteDescription && pc.remoteDescription.type) {
                    try {
                        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
                    } catch (e) {
                        console.error("Error adding call candidate:", e);
                    }
                } else {
                    pc.callIceQueue = pc.callIceQueue || [];
                    pc.callIceQueue.push(signal.candidate);
                }
            }
        }

        else if (signal.type === "call-rejected") {
            stopTone();
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
