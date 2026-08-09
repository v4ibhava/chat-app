import { create } from "zustand";
import { toast } from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";
import { useAuthStore } from "./useAuthStore.js";
import { playMessageSound } from "../lib/sounds.js";
import { showNewMessageNotification } from "../lib/notifications.jsx";

const emitWithAck = (socket, event, payload, timeout = 7000) => new Promise((resolve) => {
    if (!socket?.connected) {
        resolve(null);
        return;
    }

    const timer = setTimeout(() => resolve(null), timeout);
    socket.emit(event, payload, (response) => {
        clearTimeout(timer);
        resolve(response || null);
    });
});

export const useGroupStore = create((set, get) => ({
    groups: [],
    selectedGroup: null,
    groupMessages: {},
    isGroupsLoading: false,
    isGroupInfoOpen: false,
    isMessagesLoading: false,

    applyGroupUpdate: (updatedGroup) => {
        if (!updatedGroup?._id) return;
        const { groups, selectedGroup } = get();
        set({
            groups: groups.map(g => g._id === updatedGroup._id ? updatedGroup : g),
            ...(selectedGroup?._id === updatedGroup._id ? { selectedGroup: updatedGroup } : {})
        });
    },

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
            } else {
                const savedId = sessionStorage.getItem("zync_selected_group");
                if (savedId) {
                    const saved = groupsList.find(g => g._id === savedId);
                    if (saved) {
                        set({ selectedGroup: saved });
                        get().fetchGroupMessages(saved._id);
                    }
                }
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
            // Older server deployments can still return history over the socket.
            const socket = useAuthStore.getState().socket;
            const response = await emitWithAck(socket, "get-group-messages", { groupId });
            if (response?.ok && Array.isArray(response.messages)) {
                set({
                    groupMessages: {
                        ...get().groupMessages,
                        [groupId]: response.messages,
                    },
                });
            } else {
                console.error("Failed to fetch group messages:", error);
            }
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

            const createdGroup = res.data;
            const socket = useAuthStore.getState().socket;
            if (createdGroup?._id) {
                set({
                    groups: [createdGroup, ...get().groups.filter(g => g._id !== createdGroup._id)],
                    selectedGroup: createdGroup,
                    isGroupInfoOpen: false
                });
                socket?.emit("join-group-rooms", [createdGroup._id]);
                get().fetchGroupMessages(createdGroup._id);
            }

            toast.success("Group created successfully!");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to create group");
        }
    },

    updateGroupName: async (groupId, newName) => {
        try {
            const res = await axiosInstance.put(`/groups/${groupId}`, {
                name: newName.trim()
            });

            get().applyGroupUpdate(res.data);
            toast.success("Group name updated!");
        } catch (error) {
            const socket = useAuthStore.getState().socket;
            const response = await emitWithAck(socket, "update-group", {
                groupId,
                name: newName.trim(),
            });
            if (response?.ok && response.group) {
                get().applyGroupUpdate(response.group);
                toast.success("Group name updated!");
                return true;
            }
            toast.error(response?.message || error.response?.data?.message || "Failed to update group name");
            return false;
        }
    },

    updateGroupAvatar: async (groupId, base64Image) => {
        try {
            const res = await axiosInstance.put(`/groups/${groupId}`, {
                groupPic: base64Image
            });
            get().applyGroupUpdate(res.data);
            toast.success("Group avatar updated!");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update avatar");
        }
    },

    removeGroupAvatar: async (groupId) => {
        try {
            const res = await axiosInstance.put(`/groups/${groupId}`, {
                removeAvatar: true
            });
            get().applyGroupUpdate(res.data);
            toast.success("Group avatar removed!");
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

        try {
            const res = await axiosInstance.post(`/groups/${groupId}/messages`, {
                text: payload.text,
                tempId
            });
            const savedMessage = res.data?.message;
            if (savedMessage) {
                const messages = get().groupMessages[groupId] || [];
                set({
                    groupMessages: {
                        ...get().groupMessages,
                        [groupId]: messages.map(m =>
                            m._id === tempId ? savedMessage : m
                        )
                    }
                });
            }
        } catch (error) {
            const socket = useAuthStore.getState().socket;
            if (socket?.connected) {
                socket.emit("group-message", {
                    groupId,
                    message: payload
                });
                return;
            }

            const messages = get().groupMessages[groupId] || [];
            set({
                groupMessages: {
                    ...get().groupMessages,
                    [groupId]: messages.filter(m => m._id !== tempId)
                }
            });
            toast.error(error.response?.data?.message || "Failed to send group message");
        }
    },

    subscribeToGroupSignals: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) return;

        socket.off("group-created");
        socket.off("group-message");
        socket.off("group-message-ack");
        socket.off("group-deleted");
        socket.off("group-member-update");
        socket.off("group-metadata-updated");

        socket.on("group-created", ({ group }) => {
            const { groups } = get();
            if (!groups.some(g => g._id === group._id)) {
                set({ groups: [group, ...groups] });
                socket.emit("join-group-rooms", [group._id]);
                toast.success(`Added to group "${group.name}"!`);
            }
        });

        socket.on("group-message", ({ groupId, message, senderId }) => {
            const myId = useAuthStore.getState().authUser?._id;
            if (senderId === myId) return;

            const existing = get().groupMessages[groupId] || [];
            if (existing.some(m => m._id === message._id)) return;
            set({
                groupMessages: {
                    ...get().groupMessages,
                    [groupId]: [...existing, message]
                }
            });
            playMessageSound();

            const selectedGroup = get().selectedGroup;
            if (!selectedGroup || selectedGroup._id !== groupId) {
                const group = get().groups.find(g => g._id === groupId);
                const sender = group?.members?.find(m => m._id === senderId);
                showNewMessageNotification(
                    sender?.fullName || "Unknown User",
                    senderId,
                    message?.text || "",
                    sender?.profilePic
                );
            }
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

        socket.on("group-metadata-updated", ({ group }) => {
            if (group?._id) {
                get().applyGroupUpdate(group);
            } else {
                get().getGroups();
            }
        });
    },

    unsubscribeFromGroupSignals: () => {
        const socket = useAuthStore.getState().socket;
        if (socket) {
            socket.off("group-created");
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
        if (selectedGroup?._id) {
            sessionStorage.setItem("zync_selected_group", selectedGroup._id);
            sessionStorage.removeItem("zync_selected_user");
        } else {
            sessionStorage.removeItem("zync_selected_group");
        }
        set({ selectedGroup, isGroupInfoOpen: false });
        if (selectedGroup?._id) {
            get().fetchGroupMessages(selectedGroup._id);
        }
    },
    setGroupInfoOpen: (isOpen) => set({ isGroupInfoOpen: isOpen })
}));
