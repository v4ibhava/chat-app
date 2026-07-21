import { create } from "zustand";
import { toast } from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";
import { useAuthStore } from "./useAuthStore.js";
import { playMessageSound } from "../lib/sounds.js";

export const useGroupStore = create((set, get) => ({
    groups: [],
    selectedGroup: null,
    groupMessages: {},
    isGroupsLoading: false,
    isGroupInfoOpen: false,
    isMessagesLoading: false,

    getGroups: async () => {
        set({ isGroupsLoading: true });
        try {
            const res = await axiosInstance.get("/groups");
            const groupsList = res.data;

            set({ groups: groupsList });

            const { selectedGroup } = get();
            if (selectedGroup) {
                const updated = groupsList.find(g => g._id === selectedGroup._id);
                if (updated) set({ selectedGroup: updated });
            }

            const socket = useAuthStore.getState().socket;
            if (socket) {
                socket.emit("join-group-rooms", groupsList.map(g => g._id));
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to load groups");
        } finally {
            set({ isGroupsLoading: false });
        }
    },

    fetchGroupMessages: async (groupId) => {
        if (!groupId) return;
        set({ isMessagesLoading: true });
        try {
            const res = await axiosInstance.get(`/groups/${groupId}/messages`);
            set({
                groupMessages: {
                    ...get().groupMessages,
                    [groupId]: res.data
                }
            });
        } catch (error) {
            console.error("Failed to fetch group messages:", error);
        } finally {
            set({ isMessagesLoading: false });
        }
    },

    createGroup: async (name, memberIds) => {
        const myId = useAuthStore.getState().authUser?._id;
        if (!myId) return;

        try {
            const res = await axiosInstance.post("/groups", {
                name: name.trim(),
                desc: "Group Chat Room",
                members: memberIds
            });

            toast.success("Group created successfully!");
            get().getGroups();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to create group");
        }
    },

    updateGroupName: async (groupId, newName) => {
        try {
            await axiosInstance.put(`/groups/${groupId}`, {
                name: newName.trim()
            });

            toast.success("Group name updated!");
            get().getGroups();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update group name");
        }
    },

    updateGroupAvatar: async (groupId, base64Image) => {
        try {
            await axiosInstance.put(`/groups/${groupId}`, {
                groupPic: base64Image
            });
            toast.success("Group avatar updated!");
            get().getGroups();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update avatar");
        }
    },

    removeGroupAvatar: async (groupId) => {
        try {
            await axiosInstance.put(`/groups/${groupId}`, {
                removeAvatar: true
            });
            toast.success("Group avatar removed!");
            get().getGroups();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to remove avatar");
        }
    },

    deleteGroup: async (groupId) => {
        if (!groupId) return;
        try {
            await axiosInstance.delete(`/groups/${groupId}`);
            set({
                groups: get().groups.filter(g => g._id !== groupId),
                selectedGroup: null,
                isGroupInfoOpen: false
            });
            toast.success("Group deleted successfully!");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete group");
        }
    },

    leaveGroup: async (groupId) => {
        if (!groupId) return;
        try {
            await axiosInstance.post(`/groups/${groupId}/leave`);
            set({
                groups: get().groups.filter(g => g._id !== groupId),
                selectedGroup: null,
                isGroupInfoOpen: false
            });
            toast.success("Left group successfully!");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to leave group");
        }
    },

    removeMember: async (groupId, memberId) => {
        try {
            await axiosInstance.post(`/groups/${groupId}/remove-member`, { memberId });
            toast.success("Member removed!");
            get().getGroups();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to remove member");
        }
    },

    sendGroupMessage: async (groupId, text) => {
        const myId = useAuthStore.getState().authUser?._id;
        if (!myId || !text.trim()) return;

        const tempId = "gmsg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
        const payload = {
            _id: tempId,
            senderId: myId,
            text: text.trim(),
            createdAt: new Date().toISOString()
        };

        const existing = get().groupMessages[groupId] || [];
        set({
            groupMessages: {
                ...get().groupMessages,
                [groupId]: [...existing, payload]
            }
        });

        const socket = useAuthStore.getState().socket;
        if (socket) {
            socket.emit("group-message", {
                groupId,
                message: payload
            });
        }
    },

    subscribeToGroupSignals: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) return;

        socket.on("group-message", ({ groupId, message, senderId }) => {
            const myId = useAuthStore.getState().authUser?._id;
            if (senderId === myId) return;

            const existing = get().groupMessages[groupId] || [];
            set({
                groupMessages: {
                    ...get().groupMessages,
                    [groupId]: [...existing, message]
                }
            });
            playMessageSound();
        });

        socket.on("group-message-ack", ({ groupId, tempId, realId, createdAt }) => {
            const messages = get().groupMessages[groupId] || [];
            set({
                groupMessages: {
                    ...get().groupMessages,
                    [groupId]: messages.map(m =>
                        m._id === tempId
                            ? { ...m, _id: realId, createdAt: createdAt || m.createdAt }
                            : m
                    )
                }
            });
        });

        socket.on("group-deleted", ({ groupId }) => {
            const { selectedGroup } = get();
            set({
                groups: get().groups.filter(g => g._id !== groupId),
                ...(selectedGroup?._id === groupId ? { selectedGroup: null, isGroupInfoOpen: false } : {})
            });
            toast("A group was deleted.", { icon: "\u{1F5D1}\uFE0F" });
        });

        socket.on("group-member-update", () => {
            get().getGroups();
        });

        socket.on("group-metadata-updated", () => {
            get().getGroups();
        });
    },

    unsubscribeFromGroupSignals: () => {
        const socket = useAuthStore.getState().socket;
        if (socket) {
            socket.off("group-message");
            socket.off("group-message-ack");
            socket.off("group-deleted");
            socket.off("group-member-update");
            socket.off("group-metadata-updated");
        }
    },

    joinGroupViaLink: async (inviteCode) => {
        try {
            await axiosInstance.post(`/groups/join/${inviteCode}`);
            toast.success("Request to join group sent!");
            get().getGroups();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to request join");
        }
    },

    approveRequest: async (groupId, requesterId) => {
        try {
            await axiosInstance.post("/groups/approve", { groupId, requesterId });
            toast.success("User approved to group!");
            get().getGroups();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to approve user");
        }
    },

    setSelectedGroup: (selectedGroup) => {
        set({ selectedGroup, isGroupInfoOpen: false });
        if (selectedGroup?._id) {
            get().fetchGroupMessages(selectedGroup._id);
        }
    },
    setGroupInfoOpen: (isOpen) => set({ isGroupInfoOpen: isOpen })
}));
