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

export const useGroupStore = create((set, get) => ({
    groups: [],
    selectedGroup: null,
    groupMessages: {}, // { groupId: [messages] }
    isGroupsLoading: false,

    getGroups: async () => {
        set({ isGroupsLoading: true });
        try {
            const res = await axiosInstance.get("/groups");
            const groupsList = res.data;

            // Decrypt group metadata
            const decryptedGroups = [];
            for (const group of groupsList) {
                try {
                    const localJWK = await getGroupKeyLocal(group._id);
                    if (localJWK) {
                        const groupKey = await importGroupKey(localJWK);
                        const name = await decryptGroupMetadata(group.encryptedName, group.iv, groupKey);
                        const desc = group.encryptedDesc ? await decryptGroupMetadata(group.encryptedDesc, group.iv, groupKey) : "";
                        decryptedGroups.push({ ...group, name, desc });
                    } else {
                        // Key not received or missing locally yet
                        decryptedGroups.push({ ...group, name: "Encrypted Group", desc: "Access pending key exchange" });
                    }
                } catch (err) {
                    console.error("Error decrypting group metadata:", err);
                    decryptedGroups.push({ ...group, name: "Encrypted Group", desc: "Access pending key exchange" });
                }
            }
            set({ groups: decryptedGroups });

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
            // 1. Generate Group Key
            const groupKey = await generateGroupKey();
            const groupKeyJWK = await exportGroupKey(groupKey);

            // 2. Encrypt Metadata
            const encName = await encryptGroupMetadata(name, groupKey);
            const encDesc = await encryptGroupMetadata("Group Chat room", groupKey);

            // 3. Post Group to server
            const res = await axiosInstance.post("/groups", {
                encryptedName: encName.ciphertext,
                encryptedDesc: encDesc.ciphertext,
                iv: encName.iv,
                members: memberIds
            });

            const newGroup = res.data;
            await saveGroupKeyLocal(newGroup._id, groupKeyJWK);

            // 4. E2EE Key Distribution over socket using ECDH
            const socket = useAuthStore.getState().socket;
            if (socket) {
                const myKeypair = await getLocalKeypair(myId);
                for (const member of newGroup.members) {
                    if (member._id === myId) continue;
                    if (!member.publicKeyJWK) continue;
                    
                    try {
                        const remotePub = await importPublicKey(member.publicKeyJWK);
                        const sharedKey = await deriveSharedKey(myKeypair.privateKey, remotePub);
                        const payload = await encryptPayload({ groupKeyJWK, groupId: newGroup._id }, sharedKey);

                        socket.emit("group-key-exchange", {
                            toUserId: member._id,
                            payload
                        });
                    } catch (e) {
                        console.error(`Failed key exchange to member ${member.fullName}:`, e);
                    }
                }
            }

            toast.success("Group created successfully!");
            get().getGroups();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to create group");
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
                const senderUser = useAuthStore.getState().onlineUsers.includes(fromUserId)
                    ? { publicKeyJWK: useAuthStore.getState().onlineUsers.find(u => u._id === fromUserId)?.publicKeyJWK }
                    : null;
                
                // Fetch public key if not immediately in online memory
                let pubKeyJWK = senderUser?.publicKeyJWK;
                if (!pubKeyJWK) {
                    const res = await axiosInstance.get(`/messages/users`);
                    const found = res.data.find(u => u._id === fromUserId);
                    pubKeyJWK = found?.publicKeyJWK;
                }

                if (myKeypair && pubKeyJWK) {
                    const senderPub = await importPublicKey(pubKeyJWK);
                    const sharedKey = await deriveSharedKey(myKeypair.privateKey, senderPub);
                    const decrypted = await decryptPayload(payload.iv, payload.ciphertext, sharedKey);

                    await saveGroupKeyLocal(decrypted.groupId, decrypted.groupKeyJWK);
                    get().getGroups();
                }
            } catch (err) {
                console.error("Failed to decrypt received group key:", err);
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
    },

    unsubscribeFromGroupSignals: () => {
        const socket = useAuthStore.getState().socket;
        if (socket) {
            socket.off("group-key-exchange");
            socket.off("group-message");
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
            const res = await axiosInstance.post("/groups/approve", { groupId, requesterId });
            toast.success("User approved to group!");
            
            // Distribute group key to newly approved member
            const updatedGroup = res.data;
            const myId = useAuthStore.getState().authUser?._id;
            const targetMember = updatedGroup.members.find(m => m._id === requesterId);
            const localJWK = await getGroupKeyLocal(groupId);
            const socket = useAuthStore.getState().socket;

            if (socket && targetMember && targetMember.publicKeyJWK && localJWK) {
                const myKeypair = await getLocalKeypair(myId);
                const remotePub = await importPublicKey(targetMember.publicKeyJWK);
                const sharedKey = await deriveSharedKey(myKeypair.privateKey, remotePub);
                const payload = await encryptPayload({ groupKeyJWK: localJWK, groupId }, sharedKey);

                socket.emit("group-key-exchange", {
                    toUserId: requesterId,
                    payload
                });
            }
            get().getGroups();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to approve user");
        }
    },

    setSelectedGroup: (selectedGroup) => set({ selectedGroup })
}));
