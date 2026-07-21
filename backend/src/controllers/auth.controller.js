import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";
import { sendOTPEmail, sendWelcomeEmail, sendLoginEmail } from "../lib/email.js";
import { io, getReceiverSocketId } from "../lib/socket.js";

export const signup = async (req, res) => {
    const { fullName, email, password } = req.body
    try {
        if (!fullName || !email || !password) {
            return res.status(400).json({ message: "All fields are required" })
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 character" });
        }
        const user = await User.findOne({ email })

        if (user) return res.status(400).json({ message: "Email already exists" });

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const emailPrefix = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_.]/g, "");
        let baseUsername = emailPrefix || "user";
        let username = baseUsername;
        let isUnique = false;
        let suffix = 1;
        while (!isUnique) {
            const existingUser = await User.findOne({ username });
            if (!existingUser) {
                isUnique = true;
            } else {
                username = `${baseUsername}${suffix}`;
                suffix++;
            }
        }

        const newUser = new User({
            fullName,
            email,
            username,
            password: hashedPassword
        })
        if (newUser) {
            // generate jwt token 
            generateToken(newUser._id, res)
            await newUser.save();

            // Send welcome email asynchronously so it doesn't block the response
            sendWelcomeEmail(newUser.email, newUser.fullName).catch(err => {
                console.error("Error sending welcome email:", err);
            });

            res.status(201).json({
                _id: newUser._id,
                fullName: newUser.fullName,
                email: newUser.email,
                username: newUser.username,
                profilePic: newUser.profilePic,
                createdAt: newUser.createdAt,
            })
        } else {
            res.status(400).json({ message: "Invalid user data" })
        }

    } catch (error) {
        console.log("error in signup controller", error.message)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email })

        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" })
        }
        const isPasswordCorrect = await bcrypt.compare(password, user.password)
        if (!isPasswordCorrect) {
            return res.status(400).json({ message: "Invalid credentials" })
        }
        generateToken(user._id, res)
        
        // Trigger login notification email asynchronously
        const userAgent = req.headers["user-agent"] || "Unknown Device";
        const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "Unknown IP";
        const date = new Date().toLocaleString();
        sendLoginEmail(user.email, user.fullName, userAgent, ip, date).catch(err => {
            console.error("Error sending login alert email:", err);
        });

        res.status(200).json({
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            username: user.username,
            profilePic: user.profilePic,
            createdAt: user.createdAt,
        })
    } catch (error) {
        console.log("Error in login controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export const logout = (req, res) => {
    try {
        const isProduction = process.env.NODE_ENV === "production" || (process.env.FRONTEND_URL && process.env.FRONTEND_URL.startsWith("https"));
        res.cookie("jwt", "", {
            maxAge: 0,
            sameSite: isProduction ? "none" : "lax",
            secure: isProduction
        })
        res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        console.log("Error in logout controller", error.message);
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}

export const updateProfile = async (req, res) => {
    try {
        const { profilePic, fullName, email, username, showLastSeen, notificationsEnabled } = req.body;
        const userId = req.user._id;
        
        const updates = {};

        if (showLastSeen !== undefined) {
            updates.showLastSeen = !!showLastSeen;
        }

        if (notificationsEnabled !== undefined) {
            updates.notificationsEnabled = !!notificationsEnabled;
        }
        
        if (profilePic) {
            // Save compressed base64 directly to MongoDB without Cloudinary dependency
            updates.profilePic = profilePic;
        }
        
        if (fullName !== undefined) {
            if (!fullName || fullName.trim() === "") {
                return res.status(400).json({ message: "Full name cannot be empty" });
            }
            updates.fullName = fullName.trim();
        }
        
        if (email !== undefined) {
            const trimmedEmail = email.trim();
            if (!trimmedEmail) {
                return res.status(400).json({ message: "Email cannot be empty" });
            }
            // Simple email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(trimmedEmail)) {
                return res.status(400).json({ message: "Invalid email format" });
            }
            
            // Email is changing!
            if (trimmedEmail !== req.user.email) {
                const { currentPassword } = req.body;
                if (!currentPassword) {
                    return res.status(400).json({ message: "Current password is required to change your email" });
                }
                const userWithPassword = await User.findById(userId);
                const isPasswordCorrect = await bcrypt.compare(currentPassword, userWithPassword.password);
                if (!isPasswordCorrect) {
                    return res.status(400).json({ message: "Incorrect password. Verification failed." });
                }
                
                const existingEmailUser = await User.findOne({ email: trimmedEmail, _id: { $ne: userId } });
                if (existingEmailUser) {
                    return res.status(400).json({ message: "Email already in use" });
                }
                updates.email = trimmedEmail;
            }
        }
        
        if (username !== undefined) {
            const trimmedUsername = username.trim().toLowerCase();
            if (!trimmedUsername) {
                return res.status(400).json({ message: "Username cannot be empty" });
            }
            // Social media username constraints: alphanumeric, underscore, dot. Length 3-20.
            const usernameRegex = /^[a-z0-9_.]+$/;
            if (!usernameRegex.test(trimmedUsername)) {
                return res.status(400).json({ message: "Username can only contain letters, numbers, underscores, and periods" });
            }
            if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
                return res.status(400).json({ message: "Username must be between 3 and 20 characters" });
            }
            const existingUsernameUser = await User.findOne({ username: trimmedUsername, _id: { $ne: userId } });
            if (existingUsernameUser) {
                return res.status(400).json({ message: "Username already taken" });
            }
            updates.username = trimmedUsername;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: "No update fields provided" });
        }

        const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true }).select("-password");

        // Notify online friends about profile/avatar update for live sync & P2P mirroring
        try {
            const userWithFriends = await User.findById(userId).select("friends");
            if (userWithFriends && Array.isArray(userWithFriends.friends)) {
                userWithFriends.friends.forEach(friendId => {
                    const socketId = getReceiverSocketId(friendId.toString());
                    if (socketId) {
                        io.to(socketId).emit("friend-profile-updated", {
                            userId: updatedUser._id.toString(),
                            profilePic: updatedUser.profilePic,
                            fullName: updatedUser.fullName,
                            username: updatedUser.username
                        });
                    }
                });
            }
        } catch (e) {
            console.error("Error notifying friends of profile update:", e);
        }

        res.status(200).json(updatedUser);
    } catch (error) {
        console.log("Error in update profile:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export const checkAuth = (req,res) => {
    try {
        res.status(200).json(req.user);
    } catch (error) {
        console.log("Error in checkAuth controller", error.message)
        res.status(500).json({ message:"Internal Server Error" });
    }
}

// Forgot Password - Send OTP
export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User not found with this email" });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

        user.resetOTP = otp;
        user.resetOTPExpires = otpExpires;
        await user.save();

        // Send OTP via email
        const emailSent = await sendOTPEmail(email, otp, user.fullName);

        console.log(`\n🔑 [DEV MODE] OTP Generated for ${email}: ${otp}\n`);

        if (emailSent) {
            res.status(200).json({ 
                message: "OTP sent to your email. Please check your inbox."
            });
        } else if (process.env.NODE_ENV === "development") {
            res.status(200).json({ 
                message: `[Dev Mode] OTP logged to server console: ${otp}`
            });
        } else {
            res.status(500).json({ 
                message: "Failed to send OTP email. Please try again later."
            });
        }
    } catch (error) {
        console.log("Error in forgotPassword controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

// Verify OTP
export const verifyOTP = async (req, res) => {
    const { email, otp } = req.body;
    try {
        if (!email || !otp) {
            return res.status(400).json({ message: "Email and OTP are required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        if (user.resetOTP !== otp) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        if (Date.now() > user.resetOTPExpires) {
            return res.status(400).json({ message: "OTP expired. Please request a new one" });
        }

        res.status(200).json({ message: "OTP verified successfully", token: user._id });
    } catch (error) {
        console.log("Error in verifyOTP controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

// Reset Password
export const resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    try {
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        if (user.resetOTP !== otp) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        if (Date.now() > user.resetOTPExpires) {
            return res.status(400).json({ message: "OTP expired. Please request a new one" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        user.resetOTP = null;
        user.resetOTPExpires = null;
        await user.save();

        res.status(200).json({ message: "Password reset successfully" });
    } catch (error) {
        console.log("Error in resetPassword controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

// Delete Account & Info (soft-delete / anonymization)
export const deleteAccount = async (req, res) => {
    try {
        const userId = req.user._id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Delete profile picture from cloudinary if it exists
        if (user.profilePic) {
            try {
                const parts = user.profilePic.split("/");
                const fileName = parts.pop();
                const publicId = fileName.split(".")[0];
                await cloudinary.uploader.destroy(publicId);
            } catch (cloudinaryError) {
                console.log("Error deleting profile pic from Cloudinary:", cloudinaryError.message);
            }
        }

        // Soft delete: clear personal info, mark as deleted
        user.isDeletedAccount = true;
        user.fullName = "Deleted User";
        user.email = `deleted_${userId}@zync.com`; // Releases original email address
        user.username = `deleted_${userId}`; // Releases original username
        user.password = `deleted_account_placeholder_${Math.random()}`; // Prevents future logins
        user.profilePic = "";
        user.friendRequests = [];
        // Keep user.friends array so their friends still see them as a friend
        
        await user.save();

        // Clear the auth cookie
        const isProduction = process.env.NODE_ENV === "production" || (process.env.FRONTEND_URL && process.env.FRONTEND_URL.startsWith("https"));
        res.cookie("jwt", "", {
            maxAge: 0,
            sameSite: isProduction ? "none" : "lax",
            secure: isProduction
        });

        res.status(200).json({ message: "Account and info deleted successfully" });
    } catch (error) {
        console.log("Error in deleteAccount controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export const updatePublicKey = async (req, res) => {
    try {
        const { publicKeyJWK } = req.body;
        if (!publicKeyJWK) {
            return res.status(400).json({ message: "publicKeyJWK is required" });
        }
        const user = await User.findByIdAndUpdate(req.user._id, { publicKeyJWK }, { new: true }).select("-password");
        res.status(200).json(user);
    } catch (error) {
        console.log("Error in updatePublicKey controller:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}