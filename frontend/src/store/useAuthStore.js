import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import io from "socket.io-client";
import { useChatStore } from "./useChatStore.js";


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
            get().connectSocket();
        } catch (error) {
            console.log("error in checkAuth: ", error);
            set({ authUser: null })
        } finally {
            set({ isCheckingAuth: false });
        }
    },

    signup: async (data) => {
        set({ isSignUp: true });
        try {
            const res = await axiosInstance.post("/auth/signup", data);
            set({ authUser: res.data });
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
            
            // Check if any user went offline to update their lastSeen time locally
            const prevOnlineUsers = get().onlineUsers;
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
            // Re-emit userId on reconnect
            socket.emit("userReconnected", authUser._id);
        });

        socket.on("reconnect_attempt", (attemptNumber) => {
            console.log("Reconnection attempt:", attemptNumber);
        });

        // Handle connection error
        socket.on("connect_error", (error) => {
            console.error("Socket connection error:", error);
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
