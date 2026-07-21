import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import io from "socket.io-client";
import { useChatStore } from "./useChatStore.js";
import { useGroupStore } from "./useGroupStore.js";
import { playMessageSound } from "../lib/sounds.js";
import { getLocalKeypair, saveLocalKeypair, generateE2EEKeypair, decryptPayload, importPublicKey, deriveSharedKey, importGroupKey } from "../lib/crypto.js";
import { saveLocalMessage, deleteLocalMessage } from "../lib/db.js";


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
            set({ authUser: res.data })
            await get().checkAndPublishE2EEKeys();
            get().connectSocket();
        } catch (error) {
            console.log("error in checkAuth: ", error);
            set({ authUser: null })
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
            set({ isSignUp: true ? false : false }); // Keep standard logic
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
            toast.success("Profile updated successfully!");
        } catch (error) {
            console.log("error in update profile: ", error);
            toast.error(error.response?.data?.message || "Failed to update profile");

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
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 10000,
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
        socket.on("webrtc-signal", (payload) => {
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
