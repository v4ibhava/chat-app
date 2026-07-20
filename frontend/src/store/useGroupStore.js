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
            const myId = useAuthStore.getState().authUser?._id;

            for (const group of groupsList) {
                try {
                    let localJWK = await getGroupKeyLocal(group._id);

                    // If key is missing locally, check if there's an encrypted key on the server we can decrypt
                    if (!localJWK && group.encryptedKeys && group.encryptedKeys[myId]) {
                        try {
                            const encryptedKeyObj = group.encryptedKeys[myId];
                            const myKeypair = await getLocalKeypair(myId);

                            // Find the admin/sender who created the key from group members list
                            const creator = group.members.find(m => group.admins.includes(m._id) && m.publicKeyJWK);
                            if (myKeypair && creator && creator.publicKeyJWK) {
                                const creatorPub = await importPublicKey(creator.publicKeyJWK);
                                const sharedKey = await deriveSharedKey(myKeypair.privateKey, creatorPub);
                                const decrypted = await decryptPayload(encryptedKeyObj.iv, encryptedKeyObj.ciphertext, sharedKey);
                                
                                if (decrypted && decrypted.groupKeyJWK) {
                                    await saveGroupKeyLocal(group._id, decrypted.groupKeyJWK);
                                    localJWK = decrypted.groupKeyJWK;
                                    console.log(`Successfully synced and decrypted offline key for group ${group._id}`);
                                }
                            }
                        } catch (decryptErr) {
                            console.error(`Failed to decrypt startup group key for group ${group._id}:`, decryptErr);
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

            const myKeypair = await getLocalKeypair(myId);

            // Fetch and cache member profiles to ensure public keys are loaded
            const usersRes = await axiosInstance.get("/messages/users");
            const allUsers = usersRes.data;

            // 4. Post Group first to obtain the generated group _id
            const res = await axiosInstance.post("/groups", {
                encryptedName: encName.ciphertext,
                encryptedDesc: encDesc.ciphertext,
                iv: encName.iv,
                members: memberIds
            });

            const newGroup = res.data;
            await saveGroupKeyLocal(newGroup._id, groupKeyJWK);

            // 5. Encrypt the group key for members now that we have the groupId
            const encryptedKeys = {};
            for (const member of newGroup.members) {
                if (member._id === myId) continue;
                if (member.publicKeyJWK && myKeypair) {
                    try {
                        const remotePub = await importPublicKey(member.publicKeyJWK);
                        const sharedKey = await deriveSharedKey(myKeypair.privateKey, remotePub);
                        const payload = await encryptPayload({ groupKeyJWK, groupId: newGroup._id }, sharedKey);
                        encryptedKeys[member._id] = payload;
                    } catch (e) {
                        console.error("Failed to encrypt group key map:", e);
                    }
                }
            }

            // 6. Update group database model with E2EE key mapping
            await axiosInstance.post("/groups/approve", {
                groupId: newGroup._id,
                requesterId: myId, // Bypass membership checks by using approve controller logic or merge keys
                encryptedKeys
            });

            // 7. E2EE Key Distribution over socket using ECDH (for instant online delivery)
            const socket = useAuthStore.getState().socket;
            if (socket) {
                for (const member of newGroup.members) {
                    if (member._id === myId) continue;
                    if (encryptedKeys[member._id]) {
                        socket.emit("group-key-exchange", {
                            toUserId: member._id,
                            payload: encryptedKeys[member._id]
                        });
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

                    if (decrypted && decrypted.groupKeyJWK && decrypted.groupId) {
                        await saveGroupKeyLocal(decrypted.groupId, decrypted.groupKeyJWK);
                        get().getGroups();
                    }
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

    setSelectedGroup: (selectedGroup) => set({ selectedGroup })
}));
