import express from "express";
import mongoose from "mongoose";
import { protectRoute } from "../middleware/auth.middleware.js";
import { apiLimiter } from "../middleware/rateLimit.middleware.js";
import User from "../models/user.model.js";
import { io, getReceiverSocketId } from "../lib/socket.js";

const router = express.Router();

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

router.get("/search", protectRoute, apiLimiter, async (req, res) => {
  try {
    const { q } = req.query;
    if (typeof q !== "string" || q.trim().length < 2) {
      return res.status(400).json({ message: "Search query must be at least 2 characters" });
    }

    const sanitizedQuery = escapeRegex(q.trim());
    const currentUser = await User.findById(req.user._id);
    const friends = currentUser.friends || [];
    const friendRequests = currentUser.friendRequests || [];

    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { fullName: { $regex: sanitizedQuery, $options: "i" } },
        { username: { $regex: sanitizedQuery, $options: "i" } }
      ]
    }).select("-password").limit(20);

    const usersWithStatus = users.map(user => ({
      ...user.toObject(),
      isFriend: friends.some(f => f.toString() === user._id.toString()),
      requestSent: friendRequests.some(f => f.toString() === user._id.toString())
    }));

    res.json(usersWithStatus);
  } catch (error) {
    console.log("Error in search:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/friends", protectRoute, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("friends", "-password");
    res.json(user.friends);
  } catch (error) {
    console.log("Error in get friends:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/friend-requests", protectRoute, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("friendRequests", "-password")
      .select("friendRequests");
    res.json(user.friendRequests || []);
  } catch (error) {
    console.log("Error in get friend requests:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/friend-request/:userId", protectRoute, async (req, res) => {
  try {
    const { userId } = req.params;
    const targetUser = await User.findById(userId);
    
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (targetUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot send friend request to yourself" });
    }

    if (targetUser.friends?.includes(req.user._id)) {
      return res.status(400).json({ message: "Already friends" });
    }

    if (targetUser.friendRequests?.includes(req.user._id)) {
      return res.status(400).json({ message: "Friend request already sent" });
    }

    if (!targetUser.friendRequests) {
      targetUser.friendRequests = [];
    }
    targetUser.friendRequests.push(req.user._id);
    await targetUser.save();

    const targetSocketId = getReceiverSocketId(userId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("friendRequestReceived", {
        senderId: req.user._id,
        senderName: req.user.fullName
      });
    }

    res.json({ message: "Friend request sent" });
  } catch (error) {
    console.log("Error in send friend request:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/accept-friend/:userId", protectRoute, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(req.user._id);
    const requester = await User.findById(userId);

    if (!requester) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.friendRequests?.includes(userId)) {
      return res.status(400).json({ message: "No friend request from this user" });
    }

    user.friendRequests = user.friendRequests.filter(id => id.toString() !== userId);
    if (!user.friends) user.friends = [];
    user.friends.push(userId);
    
    if (!requester.friends) requester.friends = [];
    requester.friends.push(req.user._id);

    await user.save();
    await requester.save();

    const requesterSocketId = getReceiverSocketId(userId);
    if (requesterSocketId) {
      io.to(requesterSocketId).emit("friendRequestAccepted", {
        friendId: req.user._id,
        friendName: user.fullName
      });
    }
    const userSocketId = getReceiverSocketId(req.user._id);
    if (userSocketId) {
      io.to(userSocketId).emit("friendListUpdated");
    }

    res.json({ message: "Friend request accepted" });
  } catch (error) {
    console.log("Error in accept friend:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/reject-friend/:userId", protectRoute, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(req.user._id);

    if (!user.friendRequests?.includes(userId)) {
      return res.status(400).json({ message: "No friend request from this user" });
    }

    user.friendRequests = user.friendRequests.filter(id => id.toString() !== userId);
    await user.save();

    const userSocketId = getReceiverSocketId(req.user._id);
    if (userSocketId) {
      io.to(userSocketId).emit("friendRequestsUpdated");
    }

    res.json({ message: "Friend request rejected" });
  } catch (error) {
    console.log("Error in reject friend:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/remove-friend/:userId", protectRoute, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(req.user._id);
    const friend = await User.findById(userId);

    user.friends = user.friends.filter(id => id.toString() !== userId);
    friend.friends = friend.friends.filter(id => id.toString() !== req.user._id.toString());

    await user.save();
    await friend.save();

    const friendSocketId = getReceiverSocketId(userId);
    if (friendSocketId) {
      io.to(friendSocketId).emit("friendRemoved", {
        removedBy: req.user._id
      });
    }
    const userSocketId = getReceiverSocketId(req.user._id);
    if (userSocketId) {
      io.to(userSocketId).emit("friendRemoved", {
        removedBy: req.user._id
      });
    }

    res.json({ message: "Friend removed" });
  } catch (error) {
    console.log("Error in remove friend:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;