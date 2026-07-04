import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
        },
        fullName: {
            type: String,
            required: true,
        },
        username: {
            type: String,
            unique: true,
            sparse: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
            minlength: 6,
        },
        profilePic: {
            type: String,
            default: "",
        },
        resetOTP: {
            type: String,
            default: null,
        },
        resetOTPExpires: {
            type: Date,
            default: null,
        },
        friends: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }],
        friendRequests: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }],
        isDeletedAccount: {
            type: Boolean,
            default: false,
        },
        showLastSeen: {
            type: Boolean,
            default: true,
        },
        lastSeen: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

userSchema.index({ friends: 1 });
userSchema.index({ friendRequests: 1 });

const User = mongoose.model("User", userSchema);

export default User;