import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            require: true,
            unique: true,
        },
        fullName: {
            type: String,
            require: true,

        },
        password: {
            type: String,
            require: true,
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
    },
    { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;