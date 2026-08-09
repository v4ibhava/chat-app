import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { apiLimiter, messageLimiter } from "../middleware/rateLimit.middleware.js";
import { createGroup, getGroups, updateGroup, deleteGroup, leaveGroup, removeMember, joinRequest, approveRequest, getGroupMessages, sendGroupMessage } from "../controllers/group.controller.js";

const router = express.Router();

// Static routes first (before parameterized :id routes)
router.post("/", protectRoute, apiLimiter, createGroup);
router.get("/", protectRoute, apiLimiter, getGroups);
router.post("/approve", protectRoute, apiLimiter, approveRequest);
router.post("/join/:inviteCode", protectRoute, apiLimiter, joinRequest);

// Parameterized routes
router.put("/:id", protectRoute, apiLimiter, updateGroup);
router.delete("/:id", protectRoute, apiLimiter, deleteGroup);
router.post("/:id/leave", protectRoute, apiLimiter, leaveGroup);
router.post("/:id/remove-member", protectRoute, apiLimiter, removeMember);
router.get("/:id/messages", protectRoute, apiLimiter, getGroupMessages);
router.post("/:id/messages", protectRoute, messageLimiter, sendGroupMessage);

export default router;
