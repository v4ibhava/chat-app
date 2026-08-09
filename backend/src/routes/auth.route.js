import express from "express";
import { checkAuth, login, logout, signup, updateProfile, forgotPassword, verifyOTP, resetPassword, deleteAccount, updatePublicKey } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { authLimiter, apiLimiter } from "../middleware/rateLimit.middleware.js";

const router = express.Router()

router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/logout", logout);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/verify-otp", authLimiter, verifyOTP);
router.post("/reset-password", authLimiter, resetPassword);

router.put("/update-profile", protectRoute, apiLimiter, updateProfile);
router.put("/update-public-key", protectRoute, apiLimiter, updatePublicKey);
router.delete("/delete-account", protectRoute, apiLimiter, deleteAccount);
router.get("/check", protectRoute, apiLimiter, checkAuth);

export default router;
