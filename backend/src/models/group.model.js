import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
    {
        encryptedName: {
            type: String,
            required: true,
        },
        encryptedDesc: {
            type: String,
            default: "",
        },
        encryptedAvatar: {
            type: String,
            default: "",
        },
        iv: {
            type: String,
            required: true,
        },
        admins: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        }],
        members: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        }],
        inviteCode: {
            type: String,
            unique: true,
            sparse: true,
        },
        pendingRequests: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }],
        encryptedKeys: {
            type: Map,
            of: Object,
            default: {},
        },
    },
    { timestamps: true }
);

groupSchema.index({ members: 1 });
groupSchema.index({ inviteCode: 1 });

const Group = mongoose.model("Group", groupSchema);

export default Group;
