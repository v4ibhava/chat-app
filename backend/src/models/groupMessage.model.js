import mongoose from "mongoose";

const groupMessageSchema = new mongoose.Schema(
    {
        groupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Group",
            required: true,
            index: true,
        },
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        text: {
            type: String,
            required: true,
        },
        encrypted: {
            type: Boolean,
            default: false,
        },
        encryptedPayload: {
            ciphertext: String,
            iv: String,
        },
    },
    { timestamps: true }
);

groupMessageSchema.index({ groupId: 1, createdAt: -1 });

const GroupMessage = mongoose.model("GroupMessage", groupMessageSchema);

export default GroupMessage;
