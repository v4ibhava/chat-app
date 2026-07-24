const DB_NAME = "zync_local_chat";
const DB_VERSION = 2;
const STORE_NAME = "messages";
const AVATAR_STORE_NAME = "profile_pics";

export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "_id" });
        store.createIndex("chatKey", "chatKey", { unique: false });
      }
      if (!db.objectStoreNames.contains(AVATAR_STORE_NAME)) {
        db.createObjectStore(AVATAR_STORE_NAME, { keyPath: "userId" });
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
};

export const getLocalMessages = async (myId, friendId) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("chatKey");

    const key1 = `${myId}_${friendId}`;
    const key2 = `${friendId}_${myId}`;

    const request1 = index.getAll(key1);
    request1.onsuccess = (e1) => {
      const list1 = e1.target.result;
      const request2 = index.getAll(key2);
      request2.onsuccess = (e2) => {
        const list2 = e2.target.result;
        const all = [...list1, ...list2];
        // Sort chronologically
        all.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        resolve(all);
      };
      request2.onerror = (err) => reject(err.target.error);
    };
    request1.onerror = (err) => reject(err.target.error);
  });
};

export const saveLocalMessage = async (msg) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(msg);
    request.onsuccess = () => resolve(msg);
    request.onerror = (event) => reject(event.target.error);
  });
};

export const updateLocalMessageStatus = async (messageId, status) => {
  if (!messageId || !status) return null;
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const getReq = store.get(messageId);
    getReq.onsuccess = (e) => {
      const msg = e.target.result;
      if (msg) {
        msg.status = status;
        const putReq = store.put(msg);
        putReq.onsuccess = () => resolve(msg);
        putReq.onerror = (err) => reject(err.target.error);
      } else {
        resolve(null);
      }
    };
    getReq.onerror = (err) => reject(err.target.error);
  });
};

export const deleteLocalMessage = async (id) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror = (event) => reject(event.target.error);
  });
};

export const getLocalMessageIds = async (myId, friendId) => {
  const messages = await getLocalMessages(myId, friendId);
  return messages.map(m => m._id);
};

export const deleteLocalMessagesForChat = async (myId, friendId) => {
  const db = await initDB();
  const messages = await getLocalMessages(myId, friendId);
  if (messages.length === 0) return true;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    let count = 0;
    messages.forEach(m => {
      const req = store.delete(m._id);
      req.onsuccess = () => {
        count++;
        if (count === messages.length) resolve(true);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  });
};

/* --- Profile Picture Local Storage & P2P Recovery Helpers --- */

export const saveLocalProfilePic = async (userId, profilePic) => {
  if (!userId || !profilePic) return null;
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(AVATAR_STORE_NAME, "readwrite");
    const store = transaction.objectStore(AVATAR_STORE_NAME);
    const request = store.put({ userId, profilePic, updatedAt: new Date().toISOString() });
    request.onsuccess = () => resolve(profilePic);
    request.onerror = (event) => reject(event.target.error);
  });
};

export const getLocalProfilePic = async (userId) => {
  if (!userId) return null;
  const db = await initDB();
  return new Promise((resolve) => {
    const transaction = db.transaction(AVATAR_STORE_NAME, "readonly");
    const store = transaction.objectStore(AVATAR_STORE_NAME);
    const request = store.get(userId);
    request.onsuccess = (event) => {
      const record = event.target.result;
      resolve(record ? record.profilePic : null);
    };
    request.onerror = () => resolve(null);
  });
};

export const deleteLocalProfilePic = async (userId) => {
  if (!userId) return true;
  const db = await initDB();
  return new Promise((resolve) => {
    const transaction = db.transaction(AVATAR_STORE_NAME, "readwrite");
    const store = transaction.objectStore(AVATAR_STORE_NAME);
    const request = store.delete(userId);
    request.onsuccess = () => resolve(true);
    request.onerror = () => resolve(false);
  });
};
