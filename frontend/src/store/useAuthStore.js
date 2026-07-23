import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import io from "socket.io-client";
import { useChatStore } from "./useChatStore.js";
import { useGroupStore } from "./useGroupStore.js";
import { playMessageSound } from "../lib/sounds.js";
import { showNewMessageNotification } from "../lib/notifications.jsx";
import { getLocalKeypair, saveLocalKeypair, generateE2EEKeypair, decryptPayload, importPublicKey, deriveSharedKey } from "../lib/crypto.js";
import { saveLocalMessage, deleteLocalMessage, saveLocalProfilePic, getLocalProfilePic } from "../lib/db.js";


const rawBaseUrl = import.meta.env.VITE_BACKEND_URL || (import.meta.env.MODE === "development" ? "http://localhost:5000" : "/");
const BASE_URL = rawBaseUrl.endsWith("/") ? rawBaseUrl.slice(0, -1) : rawBaseUrl;


export const useAuthStore = create((set, get) => ({
    authUser: null,
    isSignUp: false,
    isLoggingIn: false,
    isUpdatingProfile: false,
    isCheckingAuth: true,
    onlineUsers: [],
    socket: null,
    checkAuth: async () => {
        try {
            const res = await axiosInstance.get("/auth/check");
            let user = res.data;
            if (user?._id) {
                if (user.profilePic) {
                    await saveLocalProfilePic(user._id, user.profilePic);
                } else {
                    const localPic = await getLocalProfilePic(user._id);
                    if (localPic) {
                        console.log("Restoring local profile picture from IndexedDB...");
                        user = { ...user, profilePic: localPic };
                        axiosInstance.put("/auth/update-profile", { profilePic: localPic }).catch(() => {});
                    }
                }
            }
            set({ authUser: user });
            await get().checkAndPublishE2EEKeys();
            get().connectSocket();

            if (user && !user.profilePic && get().socket) {
                get().socket.emit("request-profile-backup", { targetUserId: user._id });
            }
        } catch (error) {
            console.log("error in checkAuth: ", error);
            set({ authUser: null });
        } finally {
            set({ isCheckingAuth: false });
        }
    },

    checkAndPublishE2EEKeys: async () => {
        const { authUser } = get();
        if (!authUser) return;
        try {
            let keypair = await getLocalKeypair(authUser._id);
            if (!keypair) {
                console.log("Generating new E2EE Keypair...");
                const generated = await generateE2EEKeypair();
                await saveLocalKeypair(authUser._id, generated.privateKey, generated.publicKeyJWK);
                keypair = { publicKeyJWK: generated.publicKeyJWK };
            }

            // Upload if not set on the database model
            if (authUser.publicKeyJWK !== keypair.publicKeyJWK) {
                const res = await axiosInstance.put("/auth/update-public-key", {
                    publicKeyJWK: keypair.publicKeyJWK
                });
                set({ authUser: res.data });
            }
        } catch (err) {
            console.error("E2EE Key Generation/Publish Error:", err);
        }
    },

    signup: async (data) => {
        set({ isSignUp: true });
        try {
            const res = await axiosInstance.post("/auth/signup", data);
            set({ authUser: res.data });
            await get().checkAndPublishE2EEKeys();
            get().connectSocket();
            return { success: true };
        } catch (error) {
            const message = error.response?.data?.message || "Signup failed";
            return { success: false, message };
        } finally {
            set({ isSignUp: false });
        }
    },
    login: async (data) => {
        set({ isLoggingIn: true });
        try {
            const res = await axiosInstance.post("/auth/login", data);
            set({ authUser: res.data });
            await get().checkAndPublishE2EEKeys();
            get().connectSocket();
            return { success: true };
        } catch (error) {
            const message = error.response?.data?.message || "Login failed";
            return { success: false, message };
        } finally {
            set({ isLoggingIn: false });
        }
    },
    logout: async () => {
        try {
            await axiosInstance.post("/auth/logout");
            set({ authUser: null });
            toast.success("Logged out successfully!");
            get().disconnectSocket();
        } catch (error) {
            toast.error(error.response?.data?.message || "Logout failed");
        }
    },
    updateProfile: async (data) => {
        set({ isUpdatingProfile: true });
        try {
            const res = await axiosInstance.put("/auth/update-profile", data);
            set({ authUser: res.data });
            if (res.data?._id && res.data?.profilePic) {
                await saveLocalProfilePic(res.data._id, res.data.profilePic);
            }
            toast.success("Profile updated successfully!");
            return true;
        } catch (error) {
            console.log("error in update profile: ", error);
            toast.error(error.response?.data?.message || "Failed to update profile");
            return false;
        } finally {
            set({ isUpdatingProfile: false });
        }
    },
    connectSocket: () => {
        const { authUser } = get();
        if (!authUser || get().socket?.connected) return;

        const socket = io(BASE_URL, {
            query: {
                userId: authUser._id
            },
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 4000,
            timeout: 20000,
            transports: ["websocket", "polling"],
            withCredentials: true,
        });

        socket.connect();

        // Set socket instance
        set({ socket: socket });

        // Listen for online users updates
        socket.on("getOnlineUsers", (userIds) => {
            console.log("Received online users:", userIds);
            
            const prevOnlineUsers = get().onlineUsers;
            
            // Check if any user went offline to update their lastSeen time locally
            const offlineUsers = prevOnlineUsers.filter(id => !userIds.includes(id));
            if (offlineUsers.length > 0) {
                const chatStore = useChatStore.getState();
                const { users, selectedUser } = chatStore;
                let updated = false;
                const newUsers = users.map(u => {
                    if (offlineUsers.includes(u._id)) {
                        updated = true;
                        // Only set lastSeen if they have showLastSeen enabled
                        return { ...u, lastSeen: u.showLastSeen !== false ? new Date().toISOString() : null };
                    }
                    return u;
                });
                if (updated) {
                    useChatStore.setState({ users: newUsers });
                    if (selectedUser && offlineUsers.includes(selectedUser._id)) {
                        useChatStore.setState({ 
                            selectedUser: { 
                                ...selectedUser, 
                                lastSeen: selectedUser.showLastSeen !== false ? new Date().toISOString() : null 
                            } 
                        });
                    }
                }
            }

            // Check if the selected user has just come online to auto-connect WebRTC
            const chatStore = useChatStore.getState();
            const { selectedUser } = chatStore;
            if (selectedUser && userIds.includes(selectedUser._id) && !prevOnlineUsers.includes(selectedUser._id)) {
                console.log(`Selected user ${selectedUser.fullName} came online! Auto-initiating WebRTC handshake.`);
                chatStore.connectToPeer(selectedUser._id);
            }

            set({ onlineUsers: userIds });
        });

        // Listen for WebRTC signals globally (calls and chat)
        socket.off("webrtc-signal").on("webrtc-signal", (payload) => {
            const { signal } = payload;
            if (signal && signal.type && signal.type.startsWith("call-")) {
                useChatStore.getState().handleCallSignal(payload);
            } else {
                useChatStore.getState().handleChatSignal(payload);
            }
        });


        // Handle connection events
        socket.on("connect", () => {
            console.log("Socket connected:", socket.id);
            socket.emit("userReconnected", authUser._id);

            const groupStore = useGroupStore.getState();
            if (groupStore.groups.length > 0) {
                socket.emit("join-group-rooms", groupStore.groups.map(g => g._id));
            } else {
                groupStore.getGroups();
            }
        });

        socket.on("disconnect", (reason) => {
            console.log("Socket disconnected:", reason);
        });

        socket.on("reconnect", (attemptNumber) => {
            console.log("Socket reconnected after", attemptNumber, "attempts");
            socket.emit("userReconnected", authUser._id);
            // Rejoin group rooms after reconnect
            const groupStore = useGroupStore.getState();
            if (groupStore.groups.length > 0) {
                socket.emit("join-group-rooms", groupStore.groups.map(g => g._id));
                // Re-fetch messages for the selected group if any
                if (groupStore.selectedGroup?._id) {
                    groupStore.fetchGroupMessages(groupStore.selectedGroup._id);
                }
            }
        });

        socket.on("reconnect_attempt", (attemptNumber) => {
            console.log("Reconnection attempt:", attemptNumber);
        });

        // Handle connection error
        socket.on("connect_error", (error) => {
            console.error("Socket connection error:", error);
        });

        socket.on("friendRequestReceived", (payload) => {
            console.log("Friend request received:", payload);
            toast.success(`New friend request from ${payload.senderName}!`);
            window.dispatchEvent(new CustomEvent("refreshFriendRequests"));
        });

        socket.on("friendRequestAccepted", (payload) => {
            console.log("Friend request accepted:", payload);
            toast.success(`${payload.friendName} accepted your friend request!`);
            useChatStore.getState().getUsers();
            window.dispatchEvent(new CustomEvent("refreshFriendRequests"));
        });

        socket.on("friendListUpdated", () => {
            console.log("Friend list updated, refreshing...");
            useChatStore.getState().getUsers();
        });

        socket.on("friend-profile-updated", async (payload) => {
            if (payload?.userId && payload?.profilePic) {
                await saveLocalProfilePic(payload.userId, payload.profilePic);
                const chatStore = useChatStore.getState();
                const { users, selectedUser } = chatStore;
                const newUsers = users.map(u => u._id === payload.userId ? { ...u, profilePic: payload.profilePic, fullName: payload.fullName || u.fullName } : u);
                useChatStore.setState({ users: newUsers });
                if (selectedUser && selectedUser._id === payload.userId) {
                    useChatStore.setState({ selectedUser: { ...selectedUser, profilePic: payload.profilePic, fullName: payload.fullName || selectedUser.fullName } });
                }
            }
        });

        socket.on("request-profile-backup", async ({ requesterId }) => {
            if (requesterId) {
                const localBackup = await getLocalProfilePic(requesterId);
                if (localBackup) {
                    console.log(`Peer requested profile backup. Restoring profile picture for ${requesterId}...`);
                    socket.emit("restore-profile-backup", { targetUserId: requesterId, profilePic: localBackup });
                }
            }
        });

        socket.on("profile-restored-from-peer", async ({ profilePic }) => {
            if (profilePic) {
                const current = get().authUser;
                if (current) {
                    set({ authUser: { ...current, profilePic } });
                    await saveLocalProfilePic(current._id, profilePic);
                    toast.success("Profile picture automatically restored from friend's backup!");
                }
            }
        });

        socket.on("friendRequestsUpdated", () => {
            console.log("Friend requests updated, refreshing...");
            window.dispatchEvent(new CustomEvent("refreshFriendRequests"));
        });

        socket.on("friendRemoved", (payload) => {
            console.log("Friend removed:", payload);
            useChatStore.getState().getUsers();
            const chatStore = useChatStore.getState();
            if (chatStore.selectedUser && chatStore.selectedUser._id === payload.removedBy) {
                chatStore.setSelectedUser(null);
                toast.error("You are no longer friends with this user.");
            }
        });

        socket.on("chat-fallback-message", async (payload) => {
            const { from, message } = payload;
            const chatStore = useChatStore.getState();
            let msg = message;

            if (message && message.isEncrypted) {
                try {
                    const myId = useAuthStore.getState().authUser?._id;
                    const myKeypair = await getLocalKeypair(myId);
                    
                    // Retrieve sender's public key from friend list
                    const senderUser = chatStore.users.find(u => u._id === from);
                    if (myKeypair && senderUser && senderUser.publicKeyJWK) {
                        const senderPub = await importPublicKey(senderUser.publicKeyJWK);
                        const sharedKey = await deriveSharedKey(myKeypair.privateKey, senderPub);
                        msg = await decryptPayload(message.iv, message.ciphertext, sharedKey);
                    }
                } catch (decErr) {
                    console.error("Failed to decrypt live fallback message:", decErr);
                    return;
                }
            }

            await saveLocalMessage(msg);
            playMessageSound();

            if (!chatStore.selectedUser || chatStore.selectedUser._id !== from) {
                const sender = chatStore.users.find(u => u._id === from);
                showNewMessageNotification(
                    sender?.fullName || "Unknown User",
                    from,
                    msg?.text || "",
                    sender?.profilePic
                );
            }
            
            if (chatStore.selectedUser && chatStore.selectedUser._id === from) {
                const currentMsgs = chatStore.messages;
                if (!currentMsgs.some(m => m._id === msg._id)) {
                    const processedMsg = (msg.fileBlob && msg.fileType && msg.fileType.startsWith("image/"))
                        ? { ...msg, image: URL.createObjectURL(msg.fileBlob) }
                        : msg;
                    useChatStore.setState({ messages: [...currentMsgs, processedMsg] });
                }
            }
        });

        socket.on("chat-fallback-delete", async (payload) => {
            const { from, messageId } = payload;
            await deleteLocalMessage(messageId);
            const chatStore = useChatStore.getState();
            if (chatStore.selectedUser && chatStore.selectedUser._id === from) {
                useChatStore.setState({ messages: chatStore.messages.filter(m => m._id !== messageId) });
            }
        });

        // Handle offline messages globally so they are received even if no
        // chat panel is open. The server's emit includes an ack callback —
        // we call it with the IDs we successfully processed so the server
        // knows it is safe to delete them from the database.
        socket.on("offline-messages-deliver", async (offlineMsgs, ack) => {
            if (!Array.isArray(offlineMsgs) || offlineMsgs.length === 0) {
                if (typeof ack === "function") ack([]);
                return;
            }

            const acknowledgedIds = [];
            const myId = get().authUser?._id;

            for (const item of offlineMsgs) {
                let msg = item.messageData;

                // Decrypt if it is an E2EE package
                if (msg && msg.isEncrypted) {
                    try {
                        const myKeypair = await getLocalKeypair(myId);
                        const chatStore = useChatStore.getState();
                        const senderUser = chatStore.users.find(u => u._id === item.senderId);
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
                acknowledgedIds.push(item._id);

                const chatStore = useChatStore.getState();
                const { selectedUser } = chatStore;

                if (selectedUser && selectedUser._id === item.senderId) {
                    const currentMsgs = chatStore.messages;
                    if (!currentMsgs.some(m => m._id === msg._id)) {
                        const processedMsg = (msg.fileBlob && msg.fileType && msg.fileType.startsWith("image/"))
                            ? { ...msg, image: URL.createObjectURL(msg.fileBlob) }
                            : msg;
                        useChatStore.setState({ messages: [...currentMsgs, processedMsg] });
                    }
                } else {
                    playMessageSound();
                }
            }

            // Acknowledge successfully processed messages so the server can
            // safely delete them from the pending queue.
            if (typeof ack === "function") {
                ack(acknowledgedIds);
            }
        });
    },
    disconnectSocket: () => {
        const socket = get().socket;
        if (socket?.connected) {
            socket.disconnect();
            set({ socket: null, onlineUsers: [] });
        }
    },
    deleteAccount: async () => {
        try {
            await axiosInstance.delete("/auth/delete-account");
            set({ authUser: null });
            get().disconnectSocket();
            toast.success("Account permanently deleted!");
            return true;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete account");
            return false;
        }
    }
    }));
