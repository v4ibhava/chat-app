import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import io from "socket.io-client";

const BASE_URL = import.meta.env.VITE_BACKEND_URL || (import.meta.env.MODE === "development" ? "http://localhost:5000" : "/");

export const useAuthStore = create((set,get) => ({
    authUser: null,
    isSignUp: false,
    isLoggingIn: false,
    isUpdatingProfile: false,
    isCheckingAuth: true,
    onlineUsers: [],
    socket:null,
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
        set ({ isSignUp: true });
        try {
            const res = await axiosInstance.post("/auth/signup", data);
            set({ authUser: res.data });
            toast.success(`Welcome, ${res.data.fullName}! 🎉 Account created successfully!`);
            get().connectSocket();
        } catch (error) {
            toast.error(error.response.data.message);
        } finally {
            set({ isSignUp: false });
        }
    },
    login: async (data) => {
        set({ isLoggingIn:true });
        try {
            const res = await axiosInstance.post("/auth/login", data);
            set({ authUser: res.data });
            toast.success(`Welcome back, ${res.data.fullName}! 👋`);

            get().connectSocket();
        } catch (error) {
            toast.error(error.response.data.message);
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
            toast.error(error.response.data.message);
        }
    },
    updateProfile: async (data) => {
        set({ isUpdatingProfile:true });
        try {
            const res = await axiosInstance.put("/auth/update-profile", data);
            set({ authUser:res.data });
            toast.success("Profile updated successfully!");
        } catch(error) {
            console.log("error in update profile: ", error);
            toast.error(error.response.data.message);

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
            }
        });

        socket.connect();

        // Set socket instance
        set({ socket: socket });

        // Listen for online users updates
        socket.on("getOnlineUsers", (userIds) => {
            console.log("Received online users:", userIds);
            set({ onlineUsers: userIds });
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
    }
    }));
