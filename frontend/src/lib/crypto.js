/**
 * End-to-End Encryption (E2EE) helper using Web Crypto API (ECDH & AES-256-GCM)
 */

// Save key pair to IndexedDB (keeps private key client-side only)
const CRYPTO_DB_NAME = "zync_crypto_store";
const KEY_STORE_NAME = "keypairs";

const initCryptoDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(CRYPTO_DB_NAME, 1);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(KEY_STORE_NAME)) {
                db.createObjectStore(KEY_STORE_NAME, { keyPath: "userId" });
            }
        };
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
};

export const saveLocalKeypair = async (userId, privateKey, publicKeyJWK) => {
    const db = await initCryptoDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(KEY_STORE_NAME, "readwrite");
        const store = transaction.objectStore(KEY_STORE_NAME);
        const request = store.put({ userId, privateKey, publicKeyJWK });
        request.onsuccess = () => resolve(true);
        request.onerror = (e) => reject(e.target.error);
    });
};

export const getLocalKeypair = async (userId) => {
    const db = await initCryptoDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(KEY_STORE_NAME, "readonly");
        const store = transaction.objectStore(KEY_STORE_NAME);
        const request = store.get(userId);
        request.onsuccess = (e) => resolve(e.target.result || null);
        request.onerror = (e) => reject(e.target.error);
    });
};

// Generates ECDH keypair using P-256 curve
export const generateE2EEKeypair = async () => {
    const keyPair = await window.crypto.subtle.generateKey(
        {
            name: "ECDH",
            namedCurve: "P-256"
        },
        true, // exportable
        ["deriveKey", "deriveBits"]
    );

    // Export public key to JWK string so it can be uploaded
    const publicKeyJWK = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);

    return {
        privateKey: keyPair.privateKey,
        publicKeyJWK: JSON.stringify(publicKeyJWK)
    };
};

// Re-imports a JSON stringified JWK public key back into a CryptoKey object
export const importPublicKey = async (jwkString) => {
    const jwk = JSON.parse(jwkString);
    return await window.crypto.subtle.importKey(
        "jwk",
        jwk,
        {
            name: "ECDH",
            namedCurve: "P-256"
        },
        true,
        []
    );
};

// Derives a symmetric AES-256-GCM key from local private key and remote public key
export const deriveSharedKey = async (privateKey, remotePublicKey) => {
    return await window.crypto.subtle.deriveKey(
        {
            name: "ECDH",
            public: remotePublicKey
        },
        privateKey,
        {
            name: "AES-GCM",
            length: 256
        },
        false, // not exportable
        ["encrypt", "decrypt"]
    );
};

// Encrypts a JSON payload object using AES-256-GCM
export const encryptPayload = async (dataObject, sharedKey) => {
    const textEncoder = new TextEncoder();
    const encodedData = textEncoder.encode(JSON.stringify(dataObject));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        sharedKey,
        encodedData
    );

    // Convert Buffer arrays to Base64 strings for socket transmission
    const ivBase64 = btoa(String.fromCharCode(...iv));
    const ciphertextBase64 = btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer)));

    return {
        iv: ivBase64,
        ciphertext: ciphertextBase64
    };
};

// Decrypts AES-256-GCM payload back into the JSON object
export const decryptPayload = async (ivBase64, ciphertextBase64, sharedKey) => {
    const iv = new Uint8Array(atob(ivBase64).split("").map(c => c.charCodeAt(0)));
    const ciphertext = new Uint8Array(atob(ciphertextBase64).split("").map(c => c.charCodeAt(0)));

    const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        sharedKey,
        ciphertext
    );

    const textDecoder = new TextDecoder();
    return JSON.parse(textDecoder.decode(decryptedBuffer));
};

// Generates a random raw 256-bit symmetric key for a group
export const generateGroupKey = async () => {
    return await window.crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256
        },
        true, // exportable so we can share it via ECDH
        ["encrypt", "decrypt"]
    );
};

// Exports a symmetric CryptoKey to JWK
export const exportGroupKey = async (cryptoKey) => {
    return await window.crypto.subtle.exportKey("jwk", cryptoKey);
};

// Imports a symmetric JWK back into a CryptoKey
export const importGroupKey = async (jwk) => {
    return await window.crypto.subtle.importKey(
        "jwk",
        jwk,
        {
            name: "AES-GCM",
            length: 256
        },
        true,
        ["encrypt", "decrypt"]
    );
};

// Encrypts plaintext string using AES-GCM and a group key, returning { ciphertext, iv } in base64
export const encryptGroupMetadata = async (plaintext, groupKey) => {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(plaintext);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv
        },
        groupKey,
        encoded
    );

    return {
        ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer))),
        iv: btoa(String.fromCharCode(...iv))
    };
};

// Decrypts group metadata
export const decryptGroupMetadata = async (ciphertextBase64, ivBase64, groupKey) => {
    const iv = new Uint8Array(atob(ivBase64).split("").map(c => c.charCodeAt(0)));
    const ciphertext = new Uint8Array(atob(ciphertextBase64).split("").map(c => c.charCodeAt(0)));

    const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv
        },
        groupKey,
        ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
};

// Group Sender Key Protocol

// Generates a new AES-256-GCM sender key for a group
export const generateGroupSenderKey = async () => {
    return await generateGroupKey();
};

// Encrypts a message using a group's sender key
export const encryptGroupMessage = async (plaintext, senderKey) => {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(plaintext);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv
        },
        senderKey,
        encoded
    );

    return {
        ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer))),
        iv: btoa(String.fromCharCode(...iv))
    };
};

// Decrypts a message using a group's sender key
export const decryptGroupMessage = async (ciphertext, iv, senderKey) => {
    const ciphertextUint8 = new Uint8Array(atob(ciphertext).split("").map(c => c.charCodeAt(0)));
    const ivUint8 = new Uint8Array(atob(iv).split("").map(c => c.charCodeAt(0)));

    const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: ivUint8
        },
        senderKey,
        ciphertextUint8
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
};

// Distributes a sender key to a new group member
export const distributeSenderKey = async (senderKey) => {
    return await exportGroupKey(senderKey);
};

// Rotates sender keys after a member is removed
export const rotateSenderKeys = async () => {
    return await generateGroupKey();
};
