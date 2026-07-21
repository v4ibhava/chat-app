import React, { useMemo, useState } from "react";
import {
  Activity, AlertCircle, ArrowLeft, Bell, Calendar, Check, Clock,
  Eye, Moon, Monitor, Palette, Search, Shield, Sun, Trash2, LogOut
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/useAuthStore";
import { useThemeStore } from "../store/useThemeStore";

const SettingsPage = () => {
  const { authUser, updateProfile, deleteAccount, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const navigate = useNavigate();

  const [activeMenu, setActiveMenu] = useState("appearance");
  const [searchQuery, setSearchQuery] = useState("");
  const [showActiveStatus, setShowActiveStatus] = useState(authUser?.showLastSeen ?? true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(authUser?.notificationsEnabled ?? true);
  const [friendRequests, setFriendRequests] = useState("everyone");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [captchaValue, setCaptchaValue] = useState("");
  const [captchaTarget, setCaptchaTarget] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const themeOptions = [
    { id: "light", name: "Light", icon: <Sun className="w-5 h-5" />, desc: "Clean light appearance" },
    { id: "dark", name: "Dark", icon: <Moon className="w-5 h-5" />, desc: "Deep dark mode" },
    { id: "system", name: "System", icon: <Monitor className="w-5 h-5" />, desc: "Match your device" },
  ];

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getDaysSince = (dateString) => {
    if (!dateString) return "Unknown";
    const created = new Date(dateString);
    const diffDays = Math.max(1, Math.ceil(Math.abs(new Date() - created) / 86400000));
    return diffDays === 1 ? "1 day" : `${diffDays} days`;
  };

  const handleToggleActiveStatus = async (val) => {
    setShowActiveStatus(val);
    await updateProfile({ showLastSeen: val });
  };

  const handleToggleNotifications = async (val) => {
    setNotificationsEnabled(val);
    await updateProfile({ notificationsEnabled: val });
  };

  const handleOpenDeleteModal = () => {
    const target = `DELETE-${Math.floor(1000 + Math.random() * 9000)}`;
    setCaptchaTarget(target);
    setCaptchaValue("");
    setShowDeleteModal(true);
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (captchaValue.trim() !== captchaTarget) return;
    setIsDeleting(true);
    const success = await deleteAccount();
    if (!success) setIsDeleting(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const menus = useMemo(() => [
    {
      id: "appearance",
      title: "Appearance",
      icon: <Palette className="w-4 h-4" />,
      keywords: ["appearance", "theme", "light", "dark", "system"],
    },
    {
      id: "notifications",
      title: "Notifications",
      icon: <Bell className="w-4 h-4" />,
      keywords: ["notifications", "alerts", "popup", "new message"],
    },
    {
      id: "privacy",
      title: "Privacy",
      icon: <Eye className="w-4 h-4" />,
      keywords: ["privacy", "online", "last seen", "status", "requests"],
    },
    {
      id: "activity",
      title: "Account Activity",
      icon: <Activity className="w-4 h-4" />,
      keywords: ["activity", "member", "joined", "days", "status"],
    },
    {
      id: "account",
      title: "Account",
      icon: <Shield className="w-4 h-4" />,
      keywords: ["account", "danger", "delete", "security", "logout"],
    },
  ], []);

  const visibleMenus = menus.filter(menu => {
    const term = searchQuery.toLowerCase().trim();
    return !term || menu.title.toLowerCase().includes(term) || menu.keywords.some(k => k.includes(term));
  });

  const renderContent = () => {
    if (activeMenu === "appearance") {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {themeOptions.map((opt) => {
            const isSelected = theme === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  setTheme(opt.id);
                  toast.success(`Theme: ${opt.name}`);
                }}
                className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                  isSelected
                    ? "bg-primary/10 border-primary ring-1 ring-primary/30"
                    : "bg-base-100 border-base-300 hover:bg-base-300/30"
                }`}
              >
                <div className={`p-2.5 rounded-lg ${isSelected ? "bg-primary/20 text-primary" : "bg-base-300/50 text-base-content/60"}`}>
                  {opt.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-base-content">{opt.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                  </div>
                  <p className="text-[11px] text-base-content/60">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      );
    }

    if (activeMenu === "notifications") {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4 p-4 bg-base-100 border border-base-300 rounded-xl">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-base-content">New Message Popups</h3>
              <p className="text-xs text-base-content/60 mt-0.5">Show a popup notification when you receive a new message</p>
            </div>
            <input
              type="checkbox"
              className="toggle toggle-primary shrink-0"
              checked={notificationsEnabled}
              onChange={(e) => handleToggleNotifications(e.target.checked)}
            />
          </div>
        </div>
      );
    }

    if (activeMenu === "privacy") {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4 p-4 bg-base-100 border border-base-300 rounded-xl">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-base-content">Online & Last Active Status</h3>
              <p className="text-xs text-base-content/60 mt-0.5">Let friends see when you are online or last active</p>
            </div>
            <input
              type="checkbox"
              className="toggle toggle-primary shrink-0"
              checked={showActiveStatus}
              onChange={(e) => handleToggleActiveStatus(e.target.checked)}
            />
          </div>

          <div className="p-4 bg-base-100 border border-base-300 rounded-xl space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-base-content">Friend Requests</h3>
              <p className="text-xs text-base-content/60 mt-0.5">Choose who can send you requests</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {["everyone", "friends-of-friends", "no-one"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFriendRequests(mode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    friendRequests === mode
                      ? "bg-primary text-white"
                      : "bg-base-300/50 text-base-content/70 hover:text-base-content hover:bg-base-300"
                  }`}
                >
                  {mode === "friends-of-friends" ? "Friends of Friends" : mode.charAt(0).toUpperCase() + mode.slice(1).replace(/-/g, " ")}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (activeMenu === "activity") {
      const cards = [
        { icon: <Calendar className="w-5 h-5 text-blue-400" />, label: "Member Since", value: formatDate(authUser?.createdAt) },
        { icon: <Clock className="w-5 h-5 text-purple-400" />, label: "Days on Zync", value: getDaysSince(authUser?.createdAt) },
        { icon: <Shield className="w-5 h-5 text-emerald-400" />, label: "Account Status", value: "Active" },
      ];

      return (
        <div className="space-y-2">
          {cards.map((card) => (
            <div key={card.label} className="flex items-center justify-between gap-4 p-4 bg-base-100 border border-base-300 rounded-xl">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-base-300/50 shrink-0">{card.icon}</div>
                <span className="text-sm font-semibold text-base-content">{card.label}</span>
              </div>
              <span className="text-sm font-bold text-base-content/80 shrink-0">{card.value}</span>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="p-4 bg-base-100 border border-base-300 rounded-xl flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-base-content">Log Out of Account</h3>
            <p className="text-xs text-base-content/60 mt-0.5">End your current session on this device</p>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            Log Out
          </button>
        </div>

        <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-4 h-4" />
            <h3 className="text-sm font-semibold">Danger Zone</h3>
          </div>
          <p className="text-xs text-base-content/60">Permanently delete your account and associated data. This cannot be undone.</p>
          <button
            onClick={handleOpenDeleteModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Account
          </button>
        </div>
      </div>
    );
  };

  const activeTitle = menus.find(menu => menu.id === activeMenu)?.title || "Settings";

  return (
    <div className="min-h-screen bg-base-100 pt-20 pb-12 px-3 sm:px-6 transition-colors duration-200">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="w-10 h-10 rounded-full bg-base-200 border border-base-300 hover:bg-base-300/50 flex items-center justify-center text-base-content/70 hover:text-base-content transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-base-content tracking-tight">Settings</h1>
            <p className="text-xs text-base-content/60">Manage preferences, privacy, and account controls</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
          <aside className="bg-base-200 border border-base-300 rounded-2xl p-3 h-fit">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search settings"
                className="w-full py-2.5 pl-9 pr-3 bg-base-100 border border-base-300 text-base-content text-sm placeholder:text-base-content/40 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>

            <nav className="space-y-1">
              {visibleMenus.map((menu) => (
                <button
                  key={menu.id}
                  onClick={() => setActiveMenu(menu.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm font-semibold transition-all ${
                    activeMenu === menu.id
                      ? "bg-primary text-white"
                      : "text-base-content/70 hover:text-base-content hover:bg-base-100"
                  }`}
                >
                  {menu.icon}
                  {menu.title}
                </button>
              ))}
            </nav>
          </aside>

          <section className="bg-base-200 border border-base-300 rounded-2xl p-5 sm:p-6 min-w-0">
            <h2 className="text-lg font-bold text-base-content mb-4">{activeTitle}</h2>
            {renderContent()}
          </section>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
          <div className="relative w-full max-w-md bg-base-200 border border-base-300 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <Trash2 className="w-6 h-6" />
              <h3 className="text-lg font-bold text-base-content">Confirm Account Deletion</h3>
            </div>
            <p className="text-xs text-base-content/60 leading-relaxed">
              Type the security phrase below to permanently delete your account.
            </p>
            <div className="p-3 bg-base-100 border border-base-300 rounded-xl text-center font-mono font-bold text-primary select-all">
              {captchaTarget}
            </div>

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <input
                type="text"
                value={captchaValue}
                onChange={(e) => setCaptchaValue(e.target.value)}
                placeholder="Type security phrase"
                className="w-full py-2.5 px-4 bg-base-100 border border-base-300 text-base-content text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500/50"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-base-300/60 hover:bg-base-300 text-base-content text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={captchaValue.trim() !== captchaTarget || isDeleting}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-all disabled:opacity-40"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
