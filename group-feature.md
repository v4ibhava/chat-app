# Group Feature Implementation Plan for Zync

## Overview
Add encrypted group chat (2-8 members) with voice/video calls and screen sharing, using Mesh WebRTC and Sender Keys encryption.

---

## Phase 1: Backend - Group Model & API Routes

### New Files:
- `backend/src/models/group.model.js`
- `backend/src/controllers/group.controller.js`
- `backend/src/routes/group.routes.js`

### Group Model Schema:
```javascript
{
  name: String (required),
  description: String (default: ""),
  avatar: String (default: ""),
  admins: [ObjectId -> User] (at least one),
  members: [ObjectId -> User] (2-8),
  inviteLink: String (unique, indexed),
  inviteLinkExpiry: Date,
  senderKeys: [{
    userId: ObjectId -> User,
    senderKeyJWK: String  // Encrypted sender key for this member
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### API Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/groups` | Create group |
| GET | `/api/groups` | Get user's groups |
| GET | `/api/groups/:id` | Get group details |
| PUT | `/api/groups/:id` | Update group (name, avatar, description) |
| DELETE | `/api/groups/:id` | Delete group (admin only) |
| POST | `/api/groups/:id/members` | Add members |
| DELETE | `/api/groups/:id/members/:userId` | Remove member |
| POST | `/api/groups/:id/leave` | Leave group |
| POST | `/api/groups/:id/invite-link` | Generate invite link |
| POST | `/api/groups/join/:inviteCode` | Join via invite link |

---

## Phase 2: Backend - Socket.IO Group Events

### New Events:
| Event | Direction | Purpose |
|-------|-----------|---------|
| `group-message` | Client -> Server -> Group | Send encrypted group message |
| `group-typing` / `group-stop-typing` | Bidirectional | Group typing indicators |
| `group-call-offer` | Client -> Server -> Group | Initiate group call |
| `group-call-answer` | Client -> Server -> Group | Answer group call |
| `group-call-join` | Client -> Server -> Group | Join ongoing group call |
| `group-call-leave` | Client -> Server -> Group | Leave group call |
| `group-webrtc-signal` | Bidirectional | WebRTC signaling for mesh |
| `group-member-added` | Server -> Group | Notify new member |
| `group-member-removed` | Server -> Group | Notify member removal |
| `group-deleted` | Server -> Group | Notify group deletion |

### Server-side Validation:
- Verify user is a group member before allowing events
- Rate limit group messages
- Validate WebRTC signaling payloads

---

## Phase 3: Frontend - Group Store & State Management

### New File: `frontend/src/store/useGroupStore.js`

### State:
```javascript
{
  groups: [],                    // User's groups
  currentGroupId: null,          // Active group chat
  groupMessages: {},             // { groupId: [messages] }
  groupCallState: {},            // { groupId: { participants, isScreenSharing } }
  onlineGroupMembers: {},        // { groupId: [userIds] }
  senderKeys: {},                // { groupId: senderKey }
  localSenderKeyPairs: {},       // { groupId: keyPair }
}
```

### Actions:
- `createGroup(name, memberIds)`
- `joinGroup(inviteCode)`
- `leaveGroup(groupId)`
- `sendGroupMessage(groupId, content)`
- `initiateGroupCall(groupId, isVideo)`
- `joinGroupCall(groupId)`
- `leaveGroupCall(groupId)`
- `generateInviteLink(groupId)`

---

## Phase 4: Frontend - Group Chat UI Components

### New Components:
- `GroupSidebar.jsx` - List of user's groups
- `GroupChatContainer.jsx` - Main group chat view
- `GroupMessageInput.jsx` - Message input for groups
- `GroupMessage.jsx` - Individual group message
- `CreateGroupModal.jsx` - Group creation dialog
- `GroupInfoPanel.jsx` - Group details sidebar

### Routing:
- Add `/groups` route for groups list
- Add `/groups/:groupId` route for specific group chat

---

## Phase 5: Frontend - Group Call (Mesh WebRTC)

### Architecture:
```
User A ←→ User B
  ↕         ↕
User C ←→ User D
```

Each participant maintains `N-1` peer connections (where N = group size).

### New Components:
- `GroupCallModal.jsx` - Group call overlay
- `GroupCallParticipant.jsx` - Individual participant video/audio
- `GroupCallControls.jsx` - Mute, camera, screen share, leave

### Key Implementation:
- Each participant generates a unique offer for every other participant
- ICE candidates shared via Socket.IO `group-webrtc-signal`
- Screen sharing: Use `getDisplayMedia()` and add track to all peer connections
- Audio mixing: Use `AudioContext` to mix multiple remote audio streams

---

## Phase 6: Encryption - Sender Keys for Groups

### Sender Key Protocol:

1. **Key Generation** (on group creation):
   - Creator generates an AES-256-GCM sender key
   - Encrypts the key with each member's ECDH public key
   - Sends encrypted sender key to each member via Socket.IO

2. **Key Distribution** (on member addition):
   - Existing members generate new sender keys
   - Distribute to new member using their public key
   - New member's sender key distributed to all existing members

3. **Message Encryption**:
   - Sender encrypts message with group's sender key (AES-256-GCM)
   - Sends encrypted message to group
   - Each member decrypts using their copy of the sender key

4. **Key Rotation**:
   - On member removal, all remaining members generate new sender keys
   - Re-distribute to all remaining members
   - Old keys securely deleted from local storage

### Files to Modify:
- `frontend/src/lib/crypto.js` - Add group encryption functions
- `frontend/src/lib/db.js` - Add group message storage

### New Functions:
```javascript
generateGroupSenderKey(groupId)
encryptGroupMessage(groupId, plaintext)
decryptGroupMessage(groupId, encryptedData)
distributeSenderKey(groupId, newMemberId, senderKey)
rotateSenderKeys(groupId, removedMemberId)
```

---

## Phase 7: Frontend - Group Management UI

### Features:
- Add/remove members (admin only)
- Change group name/avatar/description
- Leave group
- Delete group (admin only)
- View member list with online status
- Promote/demote admins

---

## Phase 8: Frontend - Invite Link System

### Flow:
1. Admin generates invite link (with optional expiry)
2. Link format: `https://zync.app/invite/{uniqueCode}`
3. Non-friends can click link to join (requires account)
4. Admin approves or auto-joins based on settings

### Components:
- `InviteLinkModal.jsx` - Generate/copy invite link
- `JoinGroupPage.jsx` - Landing page for invite links

---

## Implementation Order

I recommend implementing in this order:

1. **Phase 1** (Backend Model & API) - Foundation
2. **Phase 3** (Frontend Store) - State management
3. **Phase 4** (Group Chat UI) - Basic chat functionality
4. **Phase 6** (Encryption) - Secure messaging
5. **Phase 2** (Socket.IO Events) - Real-time communication
6. **Phase 5** (Group Calls) - Voice/video calling
7. **Phase 7** (Group Management) - Admin features
8. **Phase 8** (Invite Links) - User acquisition

---

## Estimated Complexity

| Phase | Complexity | Files Modified/Created |
|-------|------------|------------------------|
| Phase 1 | Medium | 3 new files |
| Phase 2 | Medium | 1 file modified |
| Phase 3 | Medium | 1 new file |
| Phase 4 | High | 6 new files + routing |
| Phase 5 | High | 3 new files |
| Phase 6 | High | 2 files modified |
| Phase 7 | Medium | 2 new files |
| Phase 8 | Low | 2 new files |

**Total**: ~19 new files, ~3 files modified
