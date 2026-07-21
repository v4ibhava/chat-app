import Group from "../models/group.model.js";
import User from "../models/user.model.js";
import cloudinary from "../lib/cloudinary.js";
import { io, getReceiverSocketId } from "../lib/socket.js";

export const createGroup = async (req, res) => {
    try {
        const { encryptedName, encryptedDesc, encryptedAvatar, iv, members, encryptedKeys } = req.body;
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

        // Store encrypted keys on the group model so offline users can safely query them on startup
        if (encryptedKeys) {
            group.encryptedKeys = encryptedKeys; // Map: { [userId]: { iv, ciphertext } }
        }

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
        const { encryptedName, encryptedDesc, iv, groupPic, removeAvatar } = req.body;

        const group = await Group.findById(id);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }
        if (!group.admins.some(a => a.toString() === req.user._id.toString())) {
            return res.status(403).json({ message: "Only admins can update group settings" });
        }

        // Update encrypted metadata if provided
        if (encryptedName && iv) {
            group.encryptedName = encryptedName;
            group.iv = iv;
        }
        if (encryptedDesc !== undefined) {
            group.encryptedDesc = encryptedDesc;
        }

        // Handle group avatar
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

        // Notify all group members about the update via socket
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
        const group = await Group.findById(id);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        // Only the original creator (first admin) can delete
        if (group.admins[0].toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Only the group creator can delete the group" });
        }

        // Notify all members before deleting
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

        // If creator (first admin) leaves, transfer creator to next admin or next member
        const isCreator = group.admins[0].toString() === userId.toString();

        // Remove from members and admins
        group.members = group.members.filter(m => m.toString() !== userId.toString());
        group.admins = group.admins.filter(a => a.toString() !== userId.toString());

        // Remove encrypted key for leaving member
        if (group.encryptedKeys && group.encryptedKeys.has(userId.toString())) {
            group.encryptedKeys.delete(userId.toString());
        }

        // If group is now empty, delete it
        if (group.members.length === 0) {
            await Group.findByIdAndDelete(id);
            io.to(`group_${id}`).emit("group-deleted", { groupId: id });
            return res.status(200).json({ message: "Group deleted (no members remaining)" });
        }

        // If creator left and no admins remain, promote the first member
        if (isCreator && group.admins.length === 0) {
            group.admins.push(group.members[0]);
        }

        await group.save();

        const populated = await Group.findById(id)
            .populate("members", "fullName username profilePic publicKeyJWK")
            .populate("pendingRequests", "fullName username profilePic publicKeyJWK");

        // Notify remaining members
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
        // Cannot remove the creator
        if (group.admins[0].toString() === memberId) {
            return res.status(403).json({ message: "Cannot remove the group creator" });
        }

        group.members = group.members.filter(m => m.toString() !== memberId);
        group.admins = group.admins.filter(a => a.toString() !== memberId);

        // Remove encrypted key for removed member
        if (group.encryptedKeys && group.encryptedKeys.has(memberId)) {
            group.encryptedKeys.delete(memberId);
        }

        await group.save();

        const populated = await Group.findById(id)
            .populate("members", "fullName username profilePic publicKeyJWK")
            .populate("pendingRequests", "fullName username profilePic publicKeyJWK");

        // Notify the removed member
        const removedSocketId = getReceiverSocketId(memberId);
        if (removedSocketId) {
            io.to(removedSocketId).emit("group-deleted", { groupId: id });
        }

        // Notify remaining members
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

export const approveRequest = async (req, res) => {
    try {
        const { groupId, requesterId, encryptedKeys } = req.body;
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

        // Store encrypted keys for offline synchronization
        if (encryptedKeys) {
            if (!group.encryptedKeys) group.encryptedKeys = {};
            // Merge or assign key maps
            for (const [k, v] of Object.entries(encryptedKeys)) {
                group.encryptedKeys.set(k, v);
            }
        }

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
