import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { THEMES } from '../constants';
import { useSearchParams } from 'react-router-dom';
import { 
  Camera, Mail, User, Calendar, Shield, Clock, Sparkles, 
  Lock, Palette, Info, Check, Eye, AlertCircle, Trash2, Globe, EyeOff, LogOut
} from 'lucide-react';
import UserAvatar from '../components/UserAvatar';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile, deleteAccount, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  
  const [selectedImg, setSelectedImg] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [captchaValue, setCaptchaValue] = useState("");
  const [captchaTarget, setCaptchaTarget] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState("profile"); // "profile" | "appearance" | "privacy" | "stats"

  useEffect(() => {
    if (tabParam && ["profile", "appearance", "privacy", "stats"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

  // Edit details form state
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");

  // Privacy toggles state (mocked placeholders for premium look)
  const [isPrivate, setIsPrivate] = useState(false);
  const [showActiveStatus, setShowActiveStatus] = useState(true);
  const [allowTags, setAllowTags] = useState("everyone");

  useEffect(() => {
    setTimeout(() => setIsLoaded(true), 100);
  }, []);

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
    if (!fullName.trim()) {
      return toast.error("Full Name cannot be empty");
    }
    if (!email.trim()) {
      return toast.error("Email cannot be empty");
    }
    if (!username.trim()) {
      return toast.error("Username cannot be empty");
    }
    
    // Check format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return toast.error("Invalid email format");
    }
    
    const usernameRegex = /^[a-z0-9_.]+$/;
    if (!usernameRegex.test(username.toLowerCase())) {
      return toast.error("Username can only contain letters, numbers, underscores, and periods");
    }
    
    const payload = {
      fullName,
      username: username.toLowerCase(),
      email
    };

    if (email.trim() !== (authUser?.email || "")) {
      if (!currentPassword) {
        return toast.error("Current password is required to change your email");
      }
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

  const infoCards = [
    {
      icon: <Calendar className="w-5 h-5 text-blue-400" />,
      label: "Member Since",
      value: formatDate(authUser?.createdAt),
    },
    {
      icon: <Clock className="w-5 h-5 text-purple-400" />,
      label: "Days on Zync",
      value: getDaysSince(authUser?.createdAt),
      highlight: true
    },
    {
      icon: <Shield className="w-5 h-5 text-green-400" />,
      label: "Account Status",
      value: "Active",
    }
  ];

  const tabItems = [
    { id: "profile", label: "Edit Profile", icon: <User className="w-4 h-4" /> },
    { id: "appearance", label: "Appearance", icon: <Palette className="w-4 h-4" /> },
    { id: "privacy", label: "Privacy & Security", icon: <Lock className="w-4 h-4" /> },
    { id: "stats", label: "Account Activity", icon: <Info className="w-4 h-4" /> },
  ];

  const themeOptions = [
    { 
      id: "light", 
      name: "Light Mode", 
      desc: "Clean, crisp light appearance",
      colors: ["#ffffff", "#fafafa", "#0095f6", "#262626"] 
    },
    { 
      id: "dark", 
      name: "Dark Mode", 
      desc: "Deep, immersive black theme",
      colors: ["#000000", "#121212", "#0095f6", "#f5f5f5"]
    },
    { 
      id: "system", 
      name: "System Default", 
      desc: "Matches your system preference",
      isSystem: true
    }
  ];

  return (
    <div className="min-h-screen pt-20 pb-12 px-3 sm:px-4 bg-base-100">
      <div className={`max-w-5xl mx-auto transition-all duration-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        
        {/* Header Title for Hub */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-base-content">Profile Settings</h1>
            <p className="text-sm text-zinc-400">Manage your profile, preferences, and privacy settings</p>
          </div>
          <div className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 rounded-full text-primary text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>Zync</span>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Profile Card & Tab Switcher */}
          <div className="md:col-span-4 bg-base-200/50 backdrop-blur-sm border border-base-300/50 rounded-3xl p-6 space-y-6">
            
            {/* Avatar & Basic Info - Side-by-Side Flex on Mobile, Stack on Desktop */}
            <div className="flex flex-row md:flex-col items-center md:items-center text-left md:text-center gap-4 md:gap-4 w-full">
              <div className="relative group shrink-0">
                {/* Glow ring */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-primary rounded-full blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                <div className="relative cursor-pointer overflow-hidden rounded-full border-4 border-base-100 shadow-md transform group-hover:scale-102 transition-transform duration-300">
                  <UserAvatar
                    src={selectedImg || authUser?.profilePic}
                    alt={authUser?.fullName}
                    size="2xl"
                    showStatus={false}
                  />
                  {/* Hover Overlay */}
                  <label
                    htmlFor="avatar-upload-profile"
                    className={`absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer ${isUpdatingProfile ? "pointer-events-none" : ""}`}
                  >
                    {isUpdatingProfile ? (
                      <span className="loading loading-spinner loading-md text-white"></span>
                    ) : (
                      <>
                        <Camera className="w-5 h-5 text-white mb-1" />
                        <span className="text-[10px] text-zinc-300 font-medium">Change Photo</span>
                      </>
                    )}
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
              
              <div className="space-y-1 flex-1 min-w-0">
                <h2 className="text-lg md:text-xl font-bold text-base-content truncate leading-tight">{authUser?.fullName}</h2>
                <p className="text-xs md:text-sm text-zinc-400 font-mono font-medium truncate">@{authUser?.username || "no-username"}</p>
              </div>
            </div>

            {/* Divider */}
            <div className="hidden md:block h-[1px] bg-base-300/60"></div>

            {/* Navigation Toggles - Horizontal Scroll on Mobile, Vertical Stack on Desktop */}
            <nav className="flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible gap-1.5 pb-2 md:pb-0 scrollbar-none snap-x w-full">
              <style>{`
                .scrollbar-none::-webkit-scrollbar {
                  display: none;
                }
                .scrollbar-none {
                  -ms-overflow-style: none;
                  scrollbar-width: none;
                }
              `}</style>
              {tabItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`flex items-center gap-2 md:gap-3 px-3 py-2 md:px-4 md:py-3 rounded-xl md:rounded-2xl text-left text-xs md:text-sm font-semibold transition-all duration-300 whitespace-nowrap snap-start cursor-pointer shrink-0 ${isActive ? 'bg-primary text-primary-content shadow-lg shadow-primary/20' : 'text-base-content/80 hover:bg-base-200 hover:text-base-content'}`}
                  >
                    <span className={`p-1 md:p-1.5 rounded-lg ${isActive ? 'bg-white/20 text-white' : 'bg-base-300/40 text-zinc-400'}`}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Divider */}
            <div className="h-[1px] bg-base-300/60 w-full"></div>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-2xl text-xs md:text-sm font-bold text-red-500 hover:text-white bg-red-500/10 hover:bg-red-500 transition-all duration-300 cursor-pointer shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>

          {/* Right Column: Dynamic Panel Cards */}
          <div className="md:col-span-8 bg-base-200/30 border border-base-300/40 rounded-3xl p-6 sm:p-8 min-h-[420px] relative">
            
            {/* TAB 1: EDIT PROFILE DETAILS */}
            {activeTab === "profile" && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-lg font-bold text-base-content flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" /> Edit Personal Information
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">Update your basic details for your Zync identity.</p>
                </div>

                <form onSubmit={handleSaveDetails} className="space-y-4">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Full Name</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="input input-bordered w-full pl-10"
                        placeholder="John Doe"
                        disabled={isUpdatingProfile}
                      />
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    </div>
                  </div>

                  {/* Username */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Username</span>
                      <span className="text-[10px] text-zinc-500 font-normal lowercase">Letters, numbers, dots, and underscores</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="input input-bordered w-full pl-10 font-mono text-sm"
                        placeholder="johndoe"
                        disabled={isUpdatingProfile}
                      />
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold font-mono text-sm">@</span>
                    </div>
                    {username !== (authUser?.username || "") && (
                      <p className="text-[11px] text-amber-500 flex items-center gap-1 mt-1 font-medium leading-relaxed">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        Changing your username updates your unique handle. Others must search for you using this new handle.
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Email Address</label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input input-bordered w-full pl-10"
                        placeholder="john@example.com"
                        disabled={isUpdatingProfile}
                      />
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    </div>
                    {email !== (authUser?.email || "") && (
                      <>
                        <p className="text-[11px] text-red-400 flex items-center gap-1 mt-1 font-medium leading-relaxed">
                          <Lock className="w-3.5 h-3.5 shrink-0" />
                          Security warning: Changing your email will update your account credentials. You will need to use this new email to log in next time.
                        </p>
                        
                        <div className="space-y-1 mt-3 animate-slide-down">
                          <label className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
                            <Shield className="w-3.5 h-3.5" /> Confirm Password to Save Email
                          </label>
                          <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="input input-bordered w-full focus:border-red-500 focus:ring-1 focus:ring-red-500"
                            placeholder="Enter current password"
                            disabled={isUpdatingProfile}
                            required
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="btn btn-primary w-full shadow-lg shadow-primary/20 transition-all duration-300"
                      disabled={!hasChanges || isUpdatingProfile}
                    >
                      {isUpdatingProfile ? (
                        <>
                          <span className="loading loading-spinner loading-xs"></span>
                          <span>Saving Changes...</span>
                        </>
                      ) : (
                        <span>Save Changes</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: APPEARANCE (THEMES) */}
            {activeTab === "appearance" && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-lg font-bold text-base-content flex items-center gap-2">
                    <Palette className="w-5 h-5 text-primary" /> Appearance Settings
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">Select your theme preference for the Zync workspace.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {themeOptions.map((opt) => {
                    const isSelected = theme === opt.id;
                    const previewTheme = opt.id === "system"
                      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
                      : opt.id;
                    
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setTheme(opt.id);
                          toast.success(`Theme switched to ${opt.name}!`);
                        }}
                        className={`flex flex-col items-stretch text-left border rounded-2xl overflow-hidden transition-all duration-300 hover:scale-102 hover:shadow-md cursor-pointer ${isSelected ? 'border-primary ring-2 ring-primary/20 bg-base-100' : 'border-base-300 bg-base-200/50'}`}
                      >
                        {/* Theme Mockup Preview */}
                        {opt.isSystem ? (
                          <div className="h-16 w-full relative overflow-hidden bg-base-300 flex border-b border-base-300">
                            {/* Split diagonal preview */}
                            <div className="w-1/2 h-full bg-white p-2 flex flex-col justify-between">
                              <div className="w-4 h-2 bg-[#0095f6] rounded"></div>
                              <div className="w-full h-1.5 bg-zinc-200 rounded"></div>
                            </div>
                            <div className="w-1/2 h-full bg-black p-2 flex flex-col justify-between border-l border-zinc-800">
                              <div className="w-4 h-2 bg-[#0095f6] rounded"></div>
                              <div className="w-full h-1.5 bg-zinc-800 rounded"></div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-16 w-full p-2.5 flex flex-col justify-between border-b border-base-300" style={{ backgroundColor: opt.colors[0] }}>
                            <div className="flex justify-between items-center">
                              <div className="w-6 h-3 rounded" style={{ backgroundColor: opt.colors[2] }}></div>
                              <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: opt.colors[3], opacity: 0.1 }}></div>
                            </div>
                            <div className="space-y-1">
                              <div className="w-full h-1.5 rounded" style={{ backgroundColor: opt.colors[1] }}></div>
                              <div className="w-2/3 h-1.5 rounded" style={{ backgroundColor: opt.colors[1] }}></div>
                            </div>
                          </div>
                        )}
                        
                        {/* Option Labels */}
                        <div className="p-4 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm text-base-content">{opt.name}</span>
                            {isSelected && <Check className="w-4 h-4 text-primary" />}
                          </div>
                          <p className="text-[11px] text-zinc-400 leading-normal">{opt.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: PRIVACY & SECURITY */}
            {activeTab === "privacy" && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-lg font-bold text-base-content flex items-center gap-2">
                    <Lock className="w-5 h-5 text-primary" /> Privacy & Security
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">Control who can access your account details and manage account deletion.</p>
                </div>

                <div className="space-y-4">
                  {/* Account Privacy Card */}
                  <div className="bg-base-100 border border-base-300 rounded-2xl p-4 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-semibold text-sm">
                        <Lock className="w-4 h-4 text-zinc-400" /> Private Account
                      </div>
                      <p className="text-xs text-zinc-500 leading-relaxed max-w-[420px]">
                        When your account is private, only users you approve as friends can view your profile details and initiate peer-to-peer WebRTC connections.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer mt-1">
                      <input 
                        type="checkbox" 
                        checked={isPrivate} 
                        onChange={(e) => handleTogglePrivacy('private', e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-base-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  {/* Active Status Card */}
                  <div className="bg-base-100 border border-base-300 rounded-2xl p-4 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-semibold text-sm">
                        <Globe className="w-4 h-4 text-zinc-400" /> Activity Status
                      </div>
                      <p className="text-xs text-zinc-500 leading-relaxed max-w-[420px]">
                        Show when you're online. When active, friends can see a green online status dot next to your profile photo.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer mt-1">
                      <input 
                        type="checkbox" 
                        checked={showActiveStatus} 
                        onChange={(e) => handleTogglePrivacy('status', e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-base-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  {/* Tags Selector Card */}
                  <div className="bg-base-100 border border-base-300 rounded-2xl p-4 space-y-3">
                    <div className="space-y-1">
                      <span className="font-semibold text-sm">Allow Friend Requests</span>
                      <p className="text-xs text-zinc-500 leading-relaxed">Choose who can send you direct friend requests.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {["everyone", "friends-of-friends", "no-one"].map((mode) => (
                        <button
                          key={mode}
                          onClick={() => {
                            setAllowTags(mode);
                            toast.success(`Request privacy set to ${mode.replace(/-/g, ' ')}`);
                          }}
                          className={`btn btn-xs rounded-full border transition-all ${allowTags === mode ? 'bg-primary border-primary text-primary-content' : 'bg-base-200 border-base-300 text-base-content hover:bg-base-300'}`}
                        >
                          {mode.charAt(0).toUpperCase() + mode.slice(1).replace(/-/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Safe Account Management Section */}
                  <div className="border border-red-500/10 bg-red-500/5 rounded-2xl p-4 space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-semibold text-sm text-red-500">
                        <AlertCircle className="w-4 h-4" /> Account Management
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Need to close your account? This will permanently erase your authentication profiles, Cloudinary storage files, and anonymize user history. Local chat caches in IndexedDB will be released.
                      </p>
                    </div>
                    <div>
                      <button
                        onClick={openDeleteModal}
                        className="btn btn-sm btn-error text-white font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Permanently Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: ACCOUNT ACTIVITY STATS */}
            {activeTab === "stats" && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-lg font-bold text-base-content flex items-center gap-2">
                    <Info className="w-5 h-5 text-primary" /> Account Stats & Activity
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">Review metrics regarding your registration on Zync.</p>
                </div>

                <div className="grid gap-4">
                  {infoCards.map((card, index) => (
                    <div 
                      key={index}
                      className={`flex items-center justify-between p-4 rounded-2xl transition-all duration-300 hover:bg-base-100/50 ${card.highlight ? 'bg-primary/5 border border-primary/20' : 'bg-base-100 border border-base-300'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl bg-base-200`}>
                          {card.icon}
                        </div>
                        <span className="text-sm font-semibold text-base-content">{card.label}</span>
                      </div>
                      <span className={`font-bold text-sm ${card.highlight ? 'text-primary' : 'text-base-content'}`}>
                        {card.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom App Identifier */}
            <div className="absolute bottom-4 right-6 text-center md:text-right hidden sm:block">
              <p className="text-[10px] text-zinc-500 font-mono">Zync Protocol v1.4.2</p>
            </div>

          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-base-100 border border-base-300 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5 animate-slide-up">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-red-500">Delete Account Permanently?</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                This action is permanent and cannot be undone. All your profile information, local chat logs, and friends will be permanently removed.
              </p>
            </div>

            <div className="bg-base-200 p-4 rounded-2xl border border-base-300 text-center space-y-2">
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
                Type the verification phrase below to confirm:
              </p>
              <div className="bg-base-300 py-2 px-6 rounded-xl inline-block font-mono text-lg font-bold tracking-widest text-primary select-none border border-base-300">
                {captchaTarget}
              </div>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={captchaValue}
                onChange={(e) => setCaptchaValue(e.target.value)}
                placeholder="Enter verification phrase"
                className="input input-bordered text-center font-mono focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn btn-secondary flex-1"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="btn btn-error text-white flex-1"
                disabled={captchaValue !== captchaTarget || isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;