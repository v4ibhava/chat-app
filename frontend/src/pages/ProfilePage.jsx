import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { 
  Camera, Mail, User, Calendar, Shield, Clock, Sparkles, 
  Lock, Palette, Info, Check, AlertCircle, Trash2, Globe, LogOut,
  Search, Moon, Sun, Monitor
} from 'lucide-react';
import UserAvatar from '../components/UserAvatar';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile, deleteAccount, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  
  const [selectedImg, setSelectedImg] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [captchaValue, setCaptchaValue] = useState("");
  const [captchaTarget, setCaptchaTarget] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showActiveStatus, setShowActiveStatus] = useState(true);
  const [allowTags, setAllowTags] = useState("everyone");
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    if (authUser) {
      setFullName(authUser.fullName || "");
      setUsername(authUser.username || "");
      setEmail(authUser.email || "");
      setCurrentPassword("");
      setShowActiveStatus(authUser.showLastSeen ?? true);
    }
  }, [authUser]);

  const getDaysSince = (dateString) => {
    if (!dateString) return "Unknown";
    const created = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - created);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1 ? "1 day" : `${diffDays} days`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64Image = reader.result;
      setSelectedImg(base64Image);
      updateProfile({ profilePic: base64Image });
    };
  };

  const openDeleteModal = () => {
    const chars = "ABCDEFGHJKLMNOPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    let rand = "";
    for (let i = 0; i < 6; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaTarget(rand);
    setCaptchaValue("");
    setShowDeleteModal(true);
  };

  const handleDeleteAccount = async () => {
    if (captchaValue !== captchaTarget) return;
    setIsDeleting(true);
    const success = await deleteAccount();
    setIsDeleting(false);
    if (success) {
      setShowDeleteModal(false);
    }
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) return toast.error("Full Name cannot be empty");
    if (!email.trim()) return toast.error("Email cannot be empty");
    if (!username.trim()) return toast.error("Username cannot be empty");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return toast.error("Invalid email format");

    const usernameRegex = /^[a-z0-9_.]+$/;
    if (!usernameRegex.test(username.toLowerCase())) {
      return toast.error("Username can only contain letters, numbers, underscores, and periods");
    }

    const payload = { fullName, username: username.toLowerCase(), email };
    if (email.trim() !== (authUser?.email || "")) {
      if (!currentPassword) return toast.error("Current password is required to change your email");
      payload.currentPassword = currentPassword;
    }
    await updateProfile(payload);
  };

  const handleTogglePrivacy = async (type, val) => {
    if (type === 'private') {
      setIsPrivate(val);
      toast.success(val ? "Account set to Private" : "Account set to Public");
    } else if (type === 'status') {
      setShowActiveStatus(val);
      await updateProfile({ showLastSeen: val });
    }
  };

  const hasChanges =
    fullName !== (authUser?.fullName || "") ||
    username !== (authUser?.username || "") ||
    email !== (authUser?.email || "");

  const themeOptions = [
    { id: "light", name: "Light", icon: <Sun className="w-5 h-5" />, desc: "Clean light appearance" },
    { id: "dark", name: "Dark", icon: <Moon className="w-5 h-5" />, desc: "Deep dark theme" },
    { id: "system", name: "System", icon: <Monitor className="w-5 h-5" />, desc: "Matches your system" },
  ];

  const infoCards = [
    { icon: <Calendar className="w-5 h-5 text-blue-400" />, label: "Member Since", value: formatDate(authUser?.createdAt), keywords: ["member", "since", "joined", "date", "created"] },
    { icon: <Clock className="w-5 h-5 text-purple-400" />, label: "Days on Zync", value: getDaysSince(authUser?.createdAt), highlight: true, keywords: ["days", "zync", "activity", "time"] },
    { icon: <Shield className="w-5 h-5 text-green-400" />, label: "Account Status", value: "Active", keywords: ["account", "status", "active", "state"] },
  ];

  const settingsSections = useMemo(() => [
    {
      id: "profile",
      title: "Edit Profile",
      icon: <User className="w-4 h-4" />,
      keywords: ["profile", "edit", "name", "username", "email", "personal", "info", "fullname", "details", "photo", "avatar"],
      render: () => (
        <form onSubmit={handleSaveDetails} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Full Name</label>
            <div className="relative">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full py-2.5 pl-10 pr-4 bg-[#1a1a20] border border-[#2a2a34] text-white text-sm placeholder-zinc-500 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
                placeholder="John Doe"
                disabled={isUpdatingProfile}
              />
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Username</label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full py-2.5 pl-10 pr-4 bg-[#1a1a20] border border-[#2a2a34] text-white text-sm placeholder-zinc-500 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all font-mono"
                placeholder="johndoe"
                disabled={isUpdatingProfile}
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-semibold font-mono text-sm">@</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full py-2.5 pl-10 pr-4 bg-[#1a1a20] border border-[#2a2a34] text-white text-sm placeholder-zinc-500 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
                placeholder="john@example.com"
                disabled={isUpdatingProfile}
              />
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            </div>
            {email !== (authUser?.email || "") && (
              <div className="space-y-1 mt-3">
                <label className="text-[11px] font-semibold text-red-400 uppercase tracking-wider flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Confirm Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full py-2.5 px-4 bg-[#1a1a20] border border-red-500/30 text-white text-sm placeholder-zinc-500 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-all"
                  placeholder="Enter current password"
                  disabled={isUpdatingProfile}
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[#2563eb] hover:bg-blue-600 text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!hasChanges || isUpdatingProfile}
          >
            {isUpdatingProfile ? "Saving..." : "Save Changes"}
          </button>
        </form>
      )
    },
    {
      id: "appearance",
      title: "Appearance",
      icon: <Palette className="w-4 h-4" />,
      keywords: ["appearance", "theme", "dark", "light", "system", "mode", "color", "palette", "look"],
      render: () => (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {themeOptions.map((opt) => {
            const isSelected = theme === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => { setTheme(opt.id); toast.success(`Theme: ${opt.name}`); }}
                className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
                  isSelected
                    ? "bg-[#22222a] border-[#2563eb] ring-1 ring-[#2563eb]/30"
                    : "bg-[#1a1a20] border-[#2a2a34] hover:bg-[#1f1f26]"
                }`}
              >
                <div className={`p-2.5 rounded-xl ${isSelected ? "bg-[#2563eb]/20 text-[#2563eb]" : "bg-[#2a2a34] text-zinc-400"}`}>
                  {opt.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">{opt.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#2563eb]" />}
                  </div>
                  <p className="text-[11px] text-zinc-500">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      )
    },
    {
      id: "privacy",
      title: "Privacy & Security",
      icon: <Lock className="w-4 h-4" />,
      keywords: ["privacy", "security", "private", "public", "online", "status", "active", "friend", "request", "delete", "account", "password", "visible", "activity"],
      render: () => (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-[#1a1a20] border border-[#2a2a34] rounded-2xl">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Lock className="w-4 h-4 text-zinc-400" /> Private Account
              </div>
              <p className="text-xs text-zinc-500">Only approved friends can see your profile</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
              <input type="checkbox" checked={isPrivate} onChange={(e) => handleTogglePrivacy('private', e.target.checked)} className="sr-only peer" />
              <div className="w-9 h-5 bg-[#2a2a34] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2563eb]"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-[#1a1a20] border border-[#2a2a34] rounded-2xl">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Globe className="w-4 h-4 text-zinc-400" /> Activity Status
              </div>
              <p className="text-xs text-zinc-500">Show online status to friends</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
              <input type="checkbox" checked={showActiveStatus} onChange={(e) => handleTogglePrivacy('status', e.target.checked)} className="sr-only peer" />
              <div className="w-9 h-5 bg-[#2a2a34] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2563eb]"></div>
            </label>
          </div>

          <div className="p-4 bg-[#1a1a20] border border-[#2a2a34] rounded-2xl space-y-3">
            <div>
              <span className="text-sm font-semibold text-white">Allow Friend Requests</span>
              <p className="text-xs text-zinc-500 mt-0.5">Who can send you friend requests</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {["everyone", "friends-of-friends", "no-one"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => { setAllowTags(mode); toast.success(`Requests: ${mode.replace(/-/g, ' ')}`); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    allowTags === mode
                      ? "bg-[#2563eb] text-white"
                      : "bg-[#2a2a34] text-zinc-400 hover:text-white hover:bg-[#33333e]"
                  }`}
                >
                  {mode === "friends-of-friends" ? "Friends of Friends" : mode.charAt(0).toUpperCase() + mode.slice(1).replace(/-/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-red-400">
              <AlertCircle className="w-4 h-4" /> Danger Zone
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Permanently delete your account and all associated data. This cannot be undone.
            </p>
            <button
              onClick={openDeleteModal}
              className="px-4 py-2 rounded-xl bg-red-600/70 hover:bg-red-600 text-white text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Account
            </button>
          </div>
        </div>
      )
    },
    {
      id: "activity",
      title: "Account Activity",
      icon: <Info className="w-4 h-4" />,
      keywords: ["activity", "stats", "statistics", "member", "since", "days", "status", "account", "time", "joined"],
      render: () => (
        <div className="space-y-2">
          {infoCards.map((card, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-4 rounded-2xl ${
                card.highlight
                  ? "bg-[#22222a] border border-[#2a2a34]"
                  : "bg-[#1a1a20] border border-[#2a2a34]"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-[#2a2a34] shrink-0">
                  {card.icon}
                </div>
                <span className="text-sm font-semibold text-white">{card.label}</span>
              </div>
              <span className={`text-sm font-bold shrink-0 ml-3 ${card.highlight ? "text-[#2563eb]" : "text-zinc-300"}`}>
                {card.value}
              </span>
            </div>
          ))}
        </div>
      )
    },
  ], [theme, fullName, username, email, currentPassword, isUpdatingProfile, hasChanges, isPrivate, showActiveStatus, allowTags, authUser]);

  const searchTerm = searchQuery.toLowerCase().trim();
  const filteredSections = settingsSections.filter(section =>
    !searchTerm || section.keywords.some(k => k.includes(searchTerm))
  );

  return (
    <div className="min-h-screen pt-16 pb-8 px-3 sm:px-4 bg-[#0a0a0c]">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Settings</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Manage your profile, appearance, and privacy</p>
          </div>
          <div className="inline-flex items-center gap-1 px-3 py-1 bg-[#2563eb]/10 rounded-full text-[#2563eb] text-[11px] font-semibold shrink-0">
            <Sparkles className="w-3 h-3" />
            <span>Zync</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search settings..."
            className="w-full py-2.5 pl-10 pr-4 bg-[#121215] border border-[#1e1e24] text-white text-sm placeholder-zinc-500 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
          />
        </div>

        {/* Main Layout */}
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Profile Card Sidebar */}
          <div className="shrink-0 w-full lg:w-64">
            <div className="bg-[#121215] border border-[#1e1e24] rounded-2xl p-5 space-y-4">
              <div className="flex lg:flex-col items-center lg:items-center gap-4 lg:gap-3">
                <div className="relative group shrink-0">
                  <div className="relative cursor-pointer overflow-hidden rounded-full border-2 border-[#2a2a34] shadow-md">
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
                      {isUpdatingProfile ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Camera className="w-4 h-4 text-white mb-0.5" />
                          <span className="text-[9px] text-zinc-300 font-medium">Change</span>
                        </>
                      )}
                      <input type="file" id="avatar-upload-profile" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUpdatingProfile} />
                    </label>
                  </div>
                </div>
                <div className="min-w-0 text-center lg:text-center">
                  <h2 className="text-base font-bold text-white truncate">{authUser?.fullName}</h2>
                  <p className="text-xs text-zinc-500 font-mono truncate">@{authUser?.username || "no-username"}</p>
                </div>
              </div>

              <div className="h-px bg-[#1e1e24]" />

              {/* Quick Nav */}
              <nav className="space-y-1">
                {settingsSections.map((section) => {
                  const show = !searchTerm || section.keywords.some(k => k.includes(searchTerm));
                  return (
                    <button
                      key={section.id}
                      onClick={() => {
                        setSearchQuery("");
                        document.getElementById(`section-${section.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold transition-all ${
                        show ? "flex" : "hidden"
                      } hover:bg-[#1a1a20] text-zinc-400 hover:text-white`}
                    >
                      <span className="p-1.5 rounded-lg bg-[#1a1a20] text-zinc-400">{section.icon}</span>
                      {section.title}
                    </button>
                  );
                })}
              </nav>

              <div className="h-px bg-[#1e1e24]" />

              <button
                onClick={logout}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500/60 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                Log Out
              </button>
            </div>
          </div>

          {/* Settings Content */}
          <div className="flex-1 min-w-0 space-y-4">
            {searchTerm && filteredSections.length === 0 ? (
              <div className="bg-[#121215] border border-[#1e1e24] rounded-2xl p-8 text-center">
                <Search className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                <p className="text-sm text-zinc-500">No settings match "{searchQuery}"</p>
              </div>
            ) : (
              filteredSections.map((section) => (
                <div
                  key={section.id}
                  id={`section-${section.id}`}
                  className="bg-[#121215] border border-[#1e1e24] rounded-2xl p-5 sm:p-6"
                >
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="p-2 rounded-xl bg-[#1a1a20] text-[#2563eb]">
                      {section.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{section.title}</h3>
                    </div>
                  </div>
                  {section.render()}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#18181c] border border-[#282832] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-red-400">Delete Account?</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                This is permanent. All your data will be removed.
              </p>
            </div>

            <div className="bg-[#1a1a20] p-4 rounded-2xl border border-[#2a2a34] text-center space-y-2">
              <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">
                Type the code below to confirm:
              </p>
              <div className="bg-[#121215] py-2 px-6 rounded-xl inline-block font-mono text-lg font-bold tracking-widest text-[#2563eb] select-none border border-[#2a2a34]">
                {captchaTarget}
              </div>
            </div>

            <input
              type="text"
              value={captchaValue}
              onChange={(e) => setCaptchaValue(e.target.value)}
              placeholder="Enter verification code"
              className="w-full py-2.5 px-4 bg-[#1a1a20] border border-[#2a2a34] text-white text-sm text-center font-mono placeholder-zinc-500 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500/50"
            />

            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2.5 rounded-xl bg-[#2a2a34] hover:bg-[#33333e] text-zinc-400 hover:text-white text-sm font-semibold transition-all" disabled={isDeleting}>
                Cancel
              </button>
              <button onClick={handleDeleteAccount} className="flex-1 py-2.5 rounded-xl bg-red-600/70 hover:bg-red-600 text-white text-sm font-semibold transition-all disabled:opacity-40" disabled={captchaValue !== captchaTarget || isDeleting}>
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
