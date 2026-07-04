import User from "../models/user.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";


export const getUsersForSidebar = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;
        const user = await User.findById(loggedInUserId);
        
        if (!user.friends || user.friends.length === 0) {
            return res.status(200).json([]);
        }

        const filteredUsers = await User.find({ 
            _id: { $in: user.friends }
        }).select("-password");

        const sanitizedUsers = filteredUsers.map(u => {
            const userObj = u.toObject();
            if (!userObj.showLastSeen) {
                userObj.lastSeen = null;
            }
            return userObj;
        });

        res.status(200).json(sanitizedUsers);

    } catch (error) {
        console.error("Error in getUsersForSidebar: ", error.message);
        res.status(500).json({ error: "Internal server error"});
    }
};

export const getMessages = async (req, res) => {
    try {
        // Decentralized storage active: server returns empty array
        res.status(200).json([]);
    } catch (error) {
        console.log("Error in getMessages controller: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const sendMessage = async (req, res) => {
    try {
        res.status(400).json({ error: "REST API for sending messages is deprecated. Use WebRTC P2P channel." });
    } catch (error) {
        console.log("error in sendMessage controller:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
}