import React, { useEffect, useState } from "react";
import { Camera, Mail, Save, User } from "lucide-react";
import toast from "react-hot-toast";
import UserAvatar from "../components/UserAvatar";
import { useAuthStore } from "../store/useAuthStore";
import { compressImage } from "../lib/imageUtils";

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();

  const [selectedImg, setSelectedImg] = useState(null);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");

  useEffect(() => {
    if (!authUser) return;
    setFullName(authUser.fullName || "");
    setUsername(authUser.username || "");
    setEmail(authUser.email || "");
    setCurrentPassword("");
  }, [authUser]);

  const hasChanges =
    fullName !== (authUser?.fullName || "") ||
    username !== (authUser?.username || "") ||
    email !== (authUser?.email || "");

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return toast.error("Please select an image file");
    }

    const toastId = toast.loading("Uploading profile picture...");
    try {
      const compressedBase64 = await compressImage(file, 800, 800, 0.85);
      const success = await updateProfile({ profilePic: compressedBase64 });
      if (success) {
        setSelectedImg(compressedBase64);
        toast.dismiss(toastId);
      } else {
        toast.dismiss(toastId);
        setSelectedImg(null);
      }
    } catch (err) {
      console.error("Error processing image:", err);
      toast.error("Failed to process image", { id: toastId });
      setSelectedImg(null);
    }
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) return toast.error("Full name cannot be empty");
    if (!username.trim()) return toast.error("Username cannot be empty");
    if (!email.trim()) return toast.error("Email cannot be empty");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return toast.error("Invalid email format");

    const usernameRegex = /^[a-z0-9_.]+$/;
    if (!usernameRegex.test(username.toLowerCase())) {
      return toast.error("Username can only contain letters, numbers, underscores, and periods");
    }

    const payload = {
      fullName: fullName.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim(),
    };

    if (email.trim() !== (authUser?.email || "")) {
      if (!currentPassword) return toast.error("Current password is required to change email");
      payload.currentPassword = currentPassword;
    }

    await updateProfile(payload);
  };

  return (
    <div className="min-h-screen pt-20 pb-10 px-3 sm:px-4 bg-[#0a0a0c]">
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Profile</h1>
          <p className="text-xs text-zinc-500 mt-1">Edit your public profile details</p>
        </div>

        <div className="bg-[#121215] border border-[#1e1e24] rounded-2xl p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="relative group shrink-0">
              <div className="relative overflow-hidden rounded-full border-2 border-[#2a2a34]">
                <UserAvatar
                  src={selectedImg || authUser?.profilePic}
                  alt={authUser?.fullName}
                  size="2xl"
                  showStatus={false}
                />
                <label
                  htmlFor="avatar-upload-profile"
                  className={`absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${isUpdatingProfile ? "pointer-events-none" : ""}`}
                >
                  <Camera className="w-5 h-5 text-white" />
                  <span className="text-[10px] text-zinc-200 mt-1">Change</span>
                  <input
                    type="file"
                    id="avatar-upload-profile"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUpdatingProfile}
                  />
                </label>
              </div>
            </div>

            <form onSubmit={handleSaveDetails} className="flex-1 w-full space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Full Name</span>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full py-2.5 pl-10 pr-4 bg-[#1a1a20] border border-[#2a2a34] text-white text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40"
                      disabled={isUpdatingProfile}
                    />
                  </div>
                </label>

                <label className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Username</span>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-sm">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full py-2.5 pl-10 pr-4 bg-[#1a1a20] border border-[#2a2a34] text-white text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 font-mono"
                      disabled={isUpdatingProfile}
                    />
                  </div>
                </label>
              </div>

              <label className="space-y-1.5 block">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Email Address</span>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full py-2.5 pl-10 pr-4 bg-[#1a1a20] border border-[#2a2a34] text-white text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40"
                    disabled={isUpdatingProfile}
                  />
                </div>
              </label>

              {email !== (authUser?.email || "") && (
                <label className="space-y-1.5 block">
                  <span className="text-[11px] font-semibold text-red-400 uppercase tracking-wider">Current Password</span>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Required to change email"
                    className="w-full py-2.5 px-4 bg-[#1a1a20] border border-red-500/30 text-white text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500/50"
                    disabled={isUpdatingProfile}
                  />
                </label>
              )}

              <button
                type="submit"
                disabled={!hasChanges || isUpdatingProfile}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563eb] hover:bg-blue-600 text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {isUpdatingProfile ? "Saving..." : "Save Profile"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
