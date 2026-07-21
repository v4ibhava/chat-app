import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { createGroup, getGroups, updateGroup, deleteGroup, leaveGroup, removeMember, joinRequest, approveRequest, getGroupMessages, sendGroupMessage } from "../controllers/group.controller.js";

const router = express.Router();

// Static routes first (before parameterized :id routes)
router.post("/", protectRoute, createGroup);
router.get("/", protectRoute, getGroups);
router.post("/approve", protectRoute, approveRequest);
router.post("/join/:inviteCode", protectRoute, joinRequest);

// Parameterized routes
router.put("/:id", protectRoute, updateGroup);
router.delete("/:id", protectRoute, deleteGroup);
router.post("/:id/leave", protectRoute, leaveGroup);
router.post("/:id/remove-member", protectRoute, removeMember);
router.get("/:id/messages", protectRoute, getGroupMessages);
router.post("/:id/messages", protectRoute, sendGroupMessage);

export default router;
