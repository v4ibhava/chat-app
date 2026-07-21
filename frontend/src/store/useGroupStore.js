import { create } from "zustand";
import { toast } from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";
import { useAuthStore } from "./useAuthStore.js";
import { playMessageSound } from "../lib/sounds.js";
import { 
    generateGroupKey, 
    exportGroupKey, 
    importGroupKey, 
    encryptGroupMetadata, 
    decryptGroupMetadata,
    getLocalKeypair,
    importPublicKey,
    deriveSharedKey,
    encryptPayload,
    decryptPayload
} from "../lib/crypto.js";

// Stores group keys persistently in browser IndexedDB
const GROUP_KEY_DB = "zync_group_keys_store";
const GROUP_KEY_STORE = "keys";

const initGroupKeyDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(GROUP_KEY_DB, 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(GROUP_KEY_STORE)) {
                db.createObjectStore(GROUP_KEY_STORE, { keyPath: "groupId" });
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
};

const saveGroupKeyLocal = async (groupId, keyJWK) => {
    const db = await initGroupKeyDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(GROUP_KEY_STORE, "readwrite");
        const store = transaction.objectStore(GROUP_KEY_STORE);
        store.put({ groupId, keyJWK });
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = (e) => reject(e.target.error);
    });
};

const getGroupKeyLocal = async (groupId) => {
    const db = await initGroupKeyDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(GROUP_KEY_STORE, "readonly");
        const store = transaction.objectStore(GROUP_KEY_STORE);
        const request = store.get(groupId);
        request.onsuccess = (e) => resolve(e.target.result?.keyJWK || null);
        request.onerror = (e) => reject(e.target.error);
    });
};

const deleteGroupKeyLocal = async (groupId) => {
    const db = await initGroupKeyDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(GROUP_KEY_STORE, "readwrite");
        const store = transaction.objectStore(GROUP_KEY_STORE);
        store.delete(groupId);
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = (e) => reject(e.target.error);
    });
};

export const useGroupStore = create((set, get) => ({
    groups: [],
    selectedGroup: null,
    groupMessages: {}, // { groupId: [messages] }
    isGroupsLoading: false,
    isGroupInfoOpen: false,

    getGroups: async () => {
        set({ isGroupsLoading: true });
        try {
            const res = await axiosInstance.get("/groups");
            const groupsList = res.data;

            // Decrypt group metadata
            const decryptedGroups = [];
            const myId = useAuthStore.getState().authUser?._id;

            for (const group of groupsList) {
                try {
                    let localJWK = await getGroupKeyLocal(group._id);

                    // If key is missing locally, check if there's an encrypted key on the server we can decrypt
                    if (!localJWK && group.encryptedKeys) {
                        const myEncKey = group.encryptedKeys[myId];
                        if (myEncKey) {
                            try {
                                const myKeypair = await getLocalKeypair(myId);
                                if (myKeypair) {
                                    // Try ALL admins' public keys, not just the first one
                                    const adminsWithKeys = group.members.filter(
                                        m => group.admins.includes(m._id) && m.publicKeyJWK
                                    );
                                    
                                    for (const admin of adminsWithKeys) {
                                        try {
                                            const adminPub = await importPublicKey(admin.publicKeyJWK);
                                            const sharedKey = await deriveSharedKey(myKeypair.privateKey, adminPub);
                                            const decrypted = await decryptPayload(myEncKey.iv, myEncKey.ciphertext, sharedKey);
                                            const groupKeyJWK = decrypted.groupKeyJWK || decrypted;
                                            if (groupKeyJWK) {
                                                await saveGroupKeyLocal(group._id, groupKeyJWK);
                                                localJWK = groupKeyJWK;
                                                console.log(`Successfully synced offline key for group ${group._id} using admin ${admin._id}`);
                                                break; // Success — stop trying other admins
                                            }
                                        } catch (adminErr) {
                                            console.warn(`Decrypt with admin ${admin._id} failed, trying next...`);
                                        }
                                    }
                                }
                            } catch (decryptErr) {
                                console.error(`Failed to decrypt startup group key for group ${group._id}:`, decryptErr);
                            }
                        }
                    }

                    if (localJWK) {
                        const groupKey = await importGroupKey(localJWK);
                        const name = await decryptGroupMetadata(group.encryptedName, group.iv, groupKey);
                        const desc = group.encryptedDesc ? await decryptGroupMetadata(group.encryptedDesc, group.iv, groupKey) : "";
                        decryptedGroups.push({ ...group, name, desc });
                    } else {
                        // Key not received or missing locally yet
                        decryptedGroups.push({ ...group, name: "Encrypted Group", desc: "Access pending key exchange" });
                        // Request the group key from online admins
                        const socket = useAuthStore.getState().socket;
                        if (socket) {
                            socket.emit("group-key-request", { groupId: group._id });
                        }
                    }
                } catch (err) {
                    console.error("Error decrypting group metadata:", err);
                    decryptedGroups.push({ ...group, name: "Encrypted Group", desc: "Access pending key exchange" });
                }
            }
            set({ groups: decryptedGroups });

            // Update selectedGroup if it's in the list
            const { selectedGroup } = get();
            if (selectedGroup) {
                const updated = decryptedGroups.find(g => g._id === selectedGroup._id);
                if (updated) {
                    set({ selectedGroup: updated });
                }
            }

            // Automatically join socket rooms for all retrieved groups
            const socket = useAuthStore.getState().socket;
            if (socket) {
                socket.emit("join-group-rooms", decryptedGroups.map(g => g._id));
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to load groups");
        } finally {
            set({ isGroupsLoading: false });
        }
    },

    createGroup: async (name, memberIds) => {
        const myId = useAuthStore.getState().authUser?._id;
        if (!myId) return;

        try {
            const groupKey = await generateGroupKey();
            const groupKeyJWK = await exportGroupKey(groupKey);

            const encName = await encryptGroupMetadata(name, groupKey);
            const encDesc = await encryptGroupMetadata("Group Chat room", groupKey);

            const myKeypair = await getLocalKeypair(myId);

            const usersRes = await axiosInstance.get("/messages/users");
            const allUsers = usersRes.data;

            // Encrypt group key for each member BEFORE creating the group
            // so encryptedKeys can be stored on the server in the initial creation.
            const encryptedKeys = {};
            for (const memberId of memberIds) {
                const member = allUsers.find(u => u._id === memberId);
                if (member && member.publicKeyJWK && myKeypair) {
                    try {
                        const remotePub = await importPublicKey(member.publicKeyJWK);
                        const sharedKey = await deriveSharedKey(myKeypair.privateKey, remotePub);
                        const payload = await encryptPayload({ groupKeyJWK }, sharedKey);
                        encryptedKeys[memberId] = payload;
                    } catch (e) {
                        console.error("Failed to encrypt group key for member:", e);
                    }
                }
            }

            const res = await axiosInstance.post("/groups", {
                encryptedName: encName.ciphertext,
                encryptedDesc: encDesc.ciphertext,
                iv: encName.iv,
                members: memberIds,
                encryptedKeys
            });

            const newGroup = res.data;
            await saveGroupKeyLocal(newGroup._id, groupKeyJWK);

            // Distribute group key over socket (with groupId) for instant online delivery
            const socket = useAuthStore.getState().socket;
            if (socket) {
                for (const member of newGroup.members) {
                    if (member._id === myId) continue;
                    if (member.publicKeyJWK && myKeypair) {
                        try {
                            const remotePub = await importPublicKey(member.publicKeyJWK);
                            const sharedKey = await deriveSharedKey(myKeypair.privateKey, remotePub);
                            const payload = await encryptPayload({ groupKeyJWK, groupId: newGroup._id }, sharedKey);
                            socket.emit("group-key-exchange", {
                                toUserId: member._id,
                                payload
                            });
                        } catch (e) {
                            console.error("Failed to send group key over socket:", e);
                        }
                    }
                }
            }

            toast.success("Group created successfully!");
            get().getGroups();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to create group");
        }
    },

    updateGroupName: async (groupId, newName) => {
        const myId = useAuthStore.getState().authUser?._id;
        if (!myId) return;

        try {
            const localJWK = await getGroupKeyLocal(groupId);
            if (!localJWK) {
                toast.error("Group key missing. Cannot update name.");
                return;
            }
            const groupKey = await importGroupKey(localJWK);
            const encrypted = await encryptGroupMetadata(newName, groupKey);

            await axiosInstance.put(`/groups/${groupId}`, {
                encryptedName: encrypted.ciphertext,
                iv: encrypted.iv
            });

            toast.success("Group name updated!");
            get().getGroups();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update group name");
        }
    },

    updateGroupAvatar: async (groupId, base64Image) => {
        try {
            const res = await axiosInstance.put(`/groups/${groupId}`, {
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
        if (!groupId) {
            toast.error("Invalid group ID");
            return;
        }
        try {
            await axiosInstance.delete(`/groups/${groupId}`);
            await deleteGroupKeyLocal(groupId);
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
        if (!groupId) {
            toast.error("Invalid group ID");
            return;
        }
        try {
            await axiosInstance.post(`/groups/${groupId}/leave`);
            await deleteGroupKeyLocal(groupId);
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

    requestGroupKey: (groupId) => {
        const socket = useAuthStore.getState().socket;
        if (socket) {
            socket.emit("group-key-request", { groupId });
            toast("Key request sent. Waiting for admin...", { icon: "🔑" });
        }
    },

    sendGroupMessage: async (groupId, text) => {
        const myId = useAuthStore.getState().authUser?._id;
        if (!myId) return;

        try {
            const localJWK = await getGroupKeyLocal(groupId);
            if (!localJWK) {
                toast.error("Group keys missing. Cannot send message.");
                return;
            }

            const groupKey = await importGroupKey(localJWK);
            const payload = {
                _id: "gmsg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9),
                senderId: myId,
                text,
                createdAt: new Date().toISOString()
            };

            // Encrypt message using group's symmetric key
            const encrypted = await encryptGroupMetadata(JSON.stringify(payload), groupKey);

            const socket = useAuthStore.getState().socket;
            if (socket) {
                socket.emit("group-message", {
                    groupId,
                    message: {
                        ciphertext: encrypted.ciphertext,
                        iv: encrypted.iv
                    }
                });

                // Save locally
                const existing = get().groupMessages[groupId] || [];
                set({
                    groupMessages: {
                        ...get().groupMessages,
                        [groupId]: [...existing, payload]
                    }
                });
            }
        } catch (err) {
            console.error("Group message send failed:", err);
            toast.error("Failed to send message.");
        }
    },

    subscribeToGroupSignals: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) return;

        socket.on("group-key-exchange", async ({ fromUserId, payload }) => {
            const myId = useAuthStore.getState().authUser?._id;
            if (!myId) return;

            try {
                const myKeypair = await getLocalKeypair(myId);
                
                // Fetch public key from API (onlineUsers is just ID strings, not user objects)
                let pubKeyJWK = null;
                const res = await axiosInstance.get(`/messages/users`);
                const found = res.data.find(u => u._id === fromUserId);
                pubKeyJWK = found?.publicKeyJWK;

                if (myKeypair && pubKeyJWK) {
                    const senderPub = await importPublicKey(pubKeyJWK);
                    const sharedKey = await deriveSharedKey(myKeypair.privateKey, senderPub);
                    const decrypted = await decryptPayload(payload.iv, payload.ciphertext, sharedKey);

                    if (decrypted && decrypted.groupKeyJWK && decrypted.groupId) {
                        await saveGroupKeyLocal(decrypted.groupId, decrypted.groupKeyJWK);
                        get().getGroups();
                    }
                }
            } catch (err) {
                console.error("Failed to decrypt received group key:", err);
            }
        });

        socket.on("group-key-request", async ({ groupId, requesterId }) => {
            const myId = useAuthStore.getState().authUser?._id;
            if (!myId) return;

            const group = get().groups.find(g => g._id === groupId);
            if (!group || !group.admins.includes(myId)) return;

            const localJWK = await getGroupKeyLocal(groupId);
            if (!localJWK) return;

            try {
                const usersRes = await axiosInstance.get("/messages/users");
                const requester = usersRes.data.find(u => u._id === requesterId);
                if (!requester?.publicKeyJWK) return;

                const myKeypair = await getLocalKeypair(myId);
                if (!myKeypair) return;

                const remotePub = await importPublicKey(requester.publicKeyJWK);
                const sharedKey = await deriveSharedKey(myKeypair.privateKey, remotePub);
                const payload = await encryptPayload({ groupKeyJWK: localJWK, groupId }, sharedKey);

                socket.emit("group-key-exchange", {
                    toUserId: requesterId,
                    payload
                });
            } catch (err) {
                console.error("Failed to respond to group key request:", err);
            }
        });

        socket.on("group-message", async ({ groupId, message, senderId }) => {
            try {
                const localJWK = await getGroupKeyLocal(groupId);
                if (localJWK) {
                    const groupKey = await importGroupKey(localJWK);
                    const decryptedText = await decryptGroupMetadata(message.ciphertext, message.iv, groupKey);
                    const payload = JSON.parse(decryptedText);

                    const existing = get().groupMessages[groupId] || [];
                    set({
                        groupMessages: {
                            ...get().groupMessages,
                            [groupId]: [...existing, payload]
                        }
                    });
                    playMessageSound();
                }
            } catch (err) {
                console.error("Failed to decrypt incoming group message:", err);
            }
        });

        // Real-time group management events
        socket.on("group-deleted", async ({ groupId }) => {
            await deleteGroupKeyLocal(groupId).catch(() => {});
            const { selectedGroup } = get();
            set({
                groups: get().groups.filter(g => g._id !== groupId),
                ...(selectedGroup?._id === groupId ? { selectedGroup: null, isGroupInfoOpen: false } : {})
            });
            toast("A group was deleted.", { icon: "🗑️" });
        });

        socket.on("group-member-update", ({ groupId, group }) => {
            // Refresh groups to get the updated member list
            get().getGroups();
        });

        socket.on("group-metadata-updated", ({ groupId }) => {
            // Refresh groups to get the updated metadata
            get().getGroups();
        });
    },

    unsubscribeFromGroupSignals: () => {
        const socket = useAuthStore.getState().socket;
        if (socket) {
            socket.off("group-key-exchange");
            socket.off("group-key-request");
            socket.off("group-message");
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
            const myId = useAuthStore.getState().authUser?._id;
            const localJWK = await getGroupKeyLocal(groupId);
            
            // Fetch group member lists to locate requester profile
            const groupsRes = await axiosInstance.get("/groups");
            const targetGroup = groupsRes.data.find(g => g._id === groupId);
            const targetMember = targetGroup?.pendingRequests?.find(m => m._id === requesterId);

            let encryptedKeys = {};
            if (targetMember && targetMember.publicKeyJWK && localJWK) {
                try {
                    const myKeypair = await getLocalKeypair(myId);
                    const remotePub = await importPublicKey(targetMember.publicKeyJWK);
                    const sharedKey = await deriveSharedKey(myKeypair.privateKey, remotePub);
                    const payload = await encryptPayload({ groupKeyJWK: localJWK, groupId }, sharedKey);
                    encryptedKeys[requesterId] = payload;
                } catch (e) {
                    console.error("Failed to encrypt group key during approval:", e);
                }
            }

            const res = await axiosInstance.post("/groups/approve", { groupId, requesterId, encryptedKeys });
            toast.success("User approved to group!");
            
            // Distribute group key over socket if user is online immediately
            const updatedGroup = res.data;
            const socket = useAuthStore.getState().socket;

            if (socket && encryptedKeys[requesterId]) {
                socket.emit("group-key-exchange", {
                    toUserId: requesterId,
                    payload: encryptedKeys[requesterId]
                });
            }
            get().getGroups();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to approve user");
        }
    },

    setSelectedGroup: (selectedGroup) => set({ selectedGroup, isGroupInfoOpen: false }),
    setGroupInfoOpen: (isOpen) => set({ isGroupInfoOpen: isOpen })
}));
