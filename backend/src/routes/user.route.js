import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import User from "../models/user.model.js";

const router = express.Router();

router.get("/search", protectRoute, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.status(400).json({ message: "Search query must be at least 2 characters" });
    }

    const currentUser = await User.findById(req.user._id);
    const friends = currentUser.friends || [];
    const friendRequests = currentUser.friendRequests || [];

    const users = await User.find({
      _id: { $ne: req.user._id },
      fullName: { $regex: q, $options: "i" }
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

    res.json({ message: "Friend removed" });
  } catch (error) {
    console.log("Error in remove friend:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;