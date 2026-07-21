import Group from "../models/group.model.js";
import GroupMessage from "../models/groupMessage.model.js";
import User from "../models/user.model.js";
import cloudinary from "../lib/cloudinary.js";
import { io, getReceiverSocketId } from "../lib/socket.js";

export const createGroup = async (req, res) => {
    try {
        const { name, desc, members, groupPic } = req.body;
        if (!name || !name.trim() || !Array.isArray(members) || members.length < 1) {
            return res.status(400).json({ message: "Group name and at least 1 member are required" });
        }

        const groupMembers = [req.user._id, ...members];
        if (groupMembers.length > 8) {
            return res.status(400).json({ message: "Groups can have at most 8 members" });
        }

        let uploadedGroupPic = "";
        if (groupPic) {
            const uploadResponse = await cloudinary.uploader.upload(groupPic);
            uploadedGroupPic = uploadResponse.secure_url;
        }

        const inviteCode = Math.random().toString(36).substring(2, 10);

        const group = new Group({
            name: name.trim(),
            desc: desc ? desc.trim() : "",
            groupPic: uploadedGroupPic,
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

export const updateGroup = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, desc, groupPic, removeAvatar } = req.body;

        const group = await Group.findById(id);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }
        if (!group.admins.some(a => a.toString() === req.user._id.toString())) {
            return res.status(403).json({ message: "Only admins can update group settings" });
        }

        if (name && name.trim()) {
            group.name = name.trim();
        }
        if (desc !== undefined) {
            group.desc = desc.trim();
        }

        if (removeAvatar) {
            group.groupPic = "";
        } else if (groupPic) {
            const uploadResponse = await cloudinary.uploader.upload(groupPic);
            group.groupPic = uploadResponse.secure_url;
        }

        await group.save();

        const populated = await Group.findById(id)
            .populate("members", "fullName username profilePic publicKeyJWK")
            .populate("pendingRequests", "fullName username profilePic publicKeyJWK");

        // Broadcast metadata update
        io.to(`group_${id}`).emit("group-metadata-updated", {
            groupId: id,
            group: populated
        });

        res.status(200).json(populated);
    } catch (error) {
        console.error("Error updating group:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const deleteGroup = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: "Group ID is required" });
        }
        const group = await Group.findById(id);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        const creatorId = group.admins && group.admins.length > 0 ? group.admins[0].toString() : null;
        if (!creatorId || creatorId !== req.user._id.toString()) {
            return res.status(403).json({ message: "Only the group creator can delete the group" });
        }

        io.to(`group_${id}`).emit("group-deleted", { groupId: id });

        await Group.findByIdAndDelete(id);
        res.status(200).json({ message: "Group deleted successfully" });
    } catch (error) {
        console.error("Error deleting group:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const leaveGroup = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const group = await Group.findById(id);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }
        if (!group.members.some(m => m.toString() === userId.toString())) {
            return res.status(400).json({ message: "You are not a member of this group" });
        }

        const isCreator = group.admins[0].toString() === userId.toString();

        group.members = group.members.filter(m => m.toString() !== userId.toString());
        group.admins = group.admins.filter(a => a.toString() !== userId.toString());

        if (group.members.length === 0) {
            await Group.findByIdAndDelete(id);
            io.to(`group_${id}`).emit("group-deleted", { groupId: id });
            return res.status(200).json({ message: "Group deleted (no members remaining)" });
        }

        if (isCreator && group.admins.length === 0) {
            group.admins.push(group.members[0]);
        }

        await group.save();

        const populated = await Group.findById(id)
            .populate("members", "fullName username profilePic publicKeyJWK")
            .populate("pendingRequests", "fullName username profilePic publicKeyJWK");

        io.to(`group_${id}`).emit("group-member-update", {
            groupId: id,
            group: populated,
            action: "member-left",
            userId: userId.toString()
        });

        res.status(200).json({ message: "Left group successfully" });
    } catch (error) {
        console.error("Error leaving group:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const removeMember = async (req, res) => {
    try {
        const { id } = req.params;
        const { memberId } = req.body;
        const userId = req.user._id;

        const group = await Group.findById(id);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }
        if (!group.admins.some(a => a.toString() === userId.toString())) {
            return res.status(403).json({ message: "Only admins can remove members" });
        }
        if (!group.members.some(m => m.toString() === memberId)) {
            return res.status(400).json({ message: "User is not a member of this group" });
        }
        if (group.admins[0].toString() === memberId) {
            return res.status(403).json({ message: "Cannot remove the group creator" });
        }

        group.members = group.members.filter(m => m.toString() !== memberId);
        group.admins = group.admins.filter(a => a.toString() !== memberId);

        await group.save();

        const populated = await Group.findById(id)
            .populate("members", "fullName username profilePic publicKeyJWK")
            .populate("pendingRequests", "fullName username profilePic publicKeyJWK");

        const removedSocketId = getReceiverSocketId(memberId);
        if (removedSocketId) {
            io.to(removedSocketId).emit("group-deleted", { groupId: id });
        }

        io.to(`group_${id}`).emit("group-member-update", {
            groupId: id,
            group: populated,
            action: "member-removed",
            userId: memberId
        });

        res.status(200).json(populated);
    } catch (error) {
        console.error("Error removing member:", error.message);
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

export const getGroupMessages = async (req, res) => {
    try {
        const { id } = req.params;
        const group = await Group.findById(id);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }
        if (!group.members.some(m => m.toString() === req.user._id.toString())) {
            return res.status(403).json({ message: "Not a member of this group" });
        }

        const messages = await GroupMessage.find({ groupId: id })
            .populate("senderId", "fullName username profilePic")
            .sort({ createdAt: 1 })
            .lean();

        const mapped = messages.map(m => ({
            _id: m._id.toString(),
            senderId: m.senderId._id.toString(),
            text: m.text,
            createdAt: m.createdAt.toISOString(),
            sender: {
                fullName: m.senderId.fullName,
                username: m.senderId.username,
            }
        }));

        res.status(200).json(mapped);
    } catch (error) {
        console.error("Error fetching group messages:", error.message);
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

        io.to(`group_${groupId}`).emit("group-member-update", {
            groupId,
            group: populated,
            action: "member-approved",
            userId: requesterId
        });

        res.status(200).json(populated);
    } catch (error) {
        console.error("Error approving request:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
