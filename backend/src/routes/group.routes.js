import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { createGroup, getGroups, joinRequest, approveRequest } from "../controllers/group.controller.js";

const router = express.Router();

router.post("/", protectRoute, createGroup);
router.get("/", protectRoute, getGroups);
router.post("/join/:inviteCode", protectRoute, joinRequest);
router.post("/approve", protectRoute, approveRequest);

export default router;
