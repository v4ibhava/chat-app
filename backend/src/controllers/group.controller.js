import Group from "../models/group.model.js";
import User from "../models/user.model.js";

export const createGroup = async (req, res) => {
    try {
        const { encryptedName, encryptedDesc, encryptedAvatar, iv, members } = req.body;
        if (!encryptedName || !iv || !Array.isArray(members) || members.length < 1) {
            return res.status(400).json({ message: "Invalid group configuration fields" });
        }

        // Validate members
        const groupMembers = [req.user._id, ...members];
        if (groupMembers.length > 8) {
            return res.status(400).json({ message: "Groups can have at most 8 members" });
        }

        const inviteCode = Math.random().toString(36).substring(2, 10);

        const group = new Group({
            encryptedName,
            encryptedDesc,
            encryptedAvatar,
            iv,
            admins: [req.user._id],
            members: groupMembers,
            inviteCode,
        });

        await group.save();
        const populated = await Group.findById(group._id).populate("members", "fullName username profilePic publicKeyJWK");
        res.status(201).json(populated);
    } catch (error) {
        console.error("Error creating group:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getGroups = async (req, res) => {
    try {
        const groups = await Group.find({ members: req.user._id })
            .populate("members", "fullName username profilePic publicKeyJWK")
            .populate("pendingRequests", "fullName username profilePic publicKeyJWK");
        res.status(200).json(groups);
    } catch (error) {
        console.error("Error retrieving groups:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const joinRequest = async (req, res) => {
    try {
        const { inviteCode } = req.params;
        const group = await Group.findOne({ inviteCode });
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }
        if (group.members.includes(req.user._id)) {
            return res.status(400).json({ message: "Already a member of this group" });
        }
        if (group.pendingRequests.includes(req.user._id)) {
            return res.status(400).json({ message: "Join request already pending" });
        }

        group.pendingRequests.push(req.user._id);
        await group.save();
        res.status(200).json({ message: "Join request sent to group admins" });
    } catch (error) {
        console.error("Error requesting to join group:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const approveRequest = async (req, res) => {
    try {
        const { groupId, requesterId } = req.body;
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }
        if (!group.admins.includes(req.user._id)) {
            return res.status(403).json({ message: "Only admins can approve requests" });
        }
        if (!group.pendingRequests.includes(requesterId)) {
            return res.status(400).json({ message: "No such pending request" });
        }
        if (group.members.length >= 8) {
            return res.status(400).json({ message: "Group members limit (8) reached" });
        }

        group.pendingRequests = group.pendingRequests.filter(id => id.toString() !== requesterId);
        group.members.push(requesterId);
        await group.save();

        const populated = await Group.findById(groupId)
            .populate("members", "fullName username profilePic publicKeyJWK")
            .populate("pendingRequests", "fullName username profilePic publicKeyJWK");
        res.status(200).json(populated);
    } catch (error) {
        console.error("Error approving request:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
