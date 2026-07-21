import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        desc: {
            type: String,
            default: "",
        },
        groupPic: {
            type: String,
            default: "",
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
    },
    { timestamps: true }
);

groupSchema.index({ members: 1 });
groupSchema.index({ inviteCode: 1 });

const Group = mongoose.model("Group", groupSchema);

export default Group;
