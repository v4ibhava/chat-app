import React, { useMemo, useState } from "react";
import {
  Activity, AlertCircle, ArrowLeft, Calendar, Check, Clock,
  Eye, Moon, Monitor, Palette, Search, Shield, Sun, Trash2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/useAuthStore";
import { useThemeStore } from "../store/useThemeStore";

const SettingsPage = () => {
  const { authUser, updateProfile, deleteAccount } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const navigate = useNavigate();

  const [activeMenu, setActiveMenu] = useState("appearance");
  const [searchQuery, setSearchQuery] = useState("");
  const [showActiveStatus, setShowActiveStatus] = useState(authUser?.showLastSeen ?? true);
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

  const menus = useMemo(() => [
    {
      id: "appearance",
      title: "Appearance",
      icon: <Palette className="w-4 h-4" />,
      keywords: ["appearance", "theme", "light", "dark", "system"],
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
      keywords: ["account", "danger", "delete", "security"],
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
                    ? "bg-[#22222a] border-[#2563eb] ring-1 ring-[#2563eb]/30"
                    : "bg-[#1a1a20] border-[#2a2a34] hover:bg-[#1f1f26]"
                }`}
              >
                <div className={`p-2.5 rounded-lg ${isSelected ? "bg-[#2563eb]/20 text-[#2563eb]" : "bg-[#2a2a34] text-zinc-400"}`}>
                  {opt.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white">{opt.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#2563eb]" />}
                  </div>
                  <p className="text-[11px] text-zinc-500">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      );
    }

    if (activeMenu === "privacy") {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4 p-4 bg-[#1a1a20] border border-[#2a2a34] rounded-xl">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white">Online & Last Active Status</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Let friends see when you are online or last active</p>
            </div>
            <input
              type="checkbox"
              className="toggle toggle-primary shrink-0"
              checked={showActiveStatus}
              onChange={(e) => handleToggleActiveStatus(e.target.checked)}
            />
          </div>

          <div className="p-4 bg-[#1a1a20] border border-[#2a2a34] rounded-xl space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-white">Friend Requests</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Choose who can send you requests</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {["everyone", "friends-of-friends", "no-one"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFriendRequests(mode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    friendRequests === mode
                      ? "bg-[#2563eb] text-white"
                      : "bg-[#2a2a34] text-zinc-400 hover:text-white hover:bg-[#33333e]"
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
            <div key={card.label} className="flex items-center justify-between gap-4 p-4 bg-[#1a1a20] border border-[#2a2a34] rounded-xl">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-[#2a2a34] shrink-0">{card.icon}</div>
                <span className="text-sm font-semibold text-white">{card.label}</span>
              </div>
              <span className="text-sm font-bold text-zinc-300 shrink-0">{card.value}</span>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl space-y-3">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="w-4 h-4" />
          <h3 className="text-sm font-semibold">Danger Zone</h3>
        </div>
        <p className="text-xs text-zinc-500">Permanently delete your account and associated data. This cannot be undone.</p>
        <button
          onClick={handleOpenDeleteModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/70 hover:bg-red-600 text-white text-xs font-semibold transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete Account
        </button>
      </div>
    );
  };

  const activeTitle = menus.find(menu => menu.id === activeMenu)?.title || "Settings";

  return (
    <div className="min-h-screen bg-[#0a0a0c] pt-20 pb-12 px-3 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="w-10 h-10 rounded-full bg-[#1c1c22] hover:bg-[#282834] flex items-center justify-center text-zinc-400 hover:text-white transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
            <p className="text-xs text-zinc-400">Manage preferences, privacy, and account controls</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
          <aside className="bg-[#121215] border border-[#1e1e24] rounded-2xl p-3 h-fit">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search settings"
                className="w-full py-2.5 pl-9 pr-3 bg-[#1a1a20] border border-[#2a2a34] text-white text-sm placeholder-zinc-500 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>

            <nav className="space-y-1">
              {visibleMenus.map((menu) => (
                <button
                  key={menu.id}
                  onClick={() => setActiveMenu(menu.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm font-semibold transition-all ${
                    activeMenu === menu.id
                      ? "bg-[#2563eb] text-white"
                      : "text-zinc-400 hover:text-white hover:bg-[#1a1a20]"
                  }`}
                >
                  {menu.icon}
                  {menu.title}
                </button>
              ))}
            </nav>
          </aside>

          <section className="bg-[#121215] border border-[#1e1e24] rounded-2xl p-5 sm:p-6 min-w-0">
            <h2 className="text-lg font-bold text-white mb-4">{activeTitle}</h2>
            {renderContent()}
          </section>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
          <div className="relative w-full max-w-md bg-[#18181c] border border-[#282832] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <Trash2 className="w-6 h-6" />
              <h3 className="text-lg font-bold text-white">Confirm Account Deletion</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Type the security phrase below to permanently delete your account.
            </p>
            <div className="p-3 bg-[#121215] border border-[#282832] rounded-xl text-center font-mono font-bold text-primary select-all">
              {captchaTarget}
            </div>

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <input
                type="text"
                value={captchaValue}
                onChange={(e) => setCaptchaValue(e.target.value)}
                placeholder="Type security phrase"
                className="w-full py-2.5 px-4 bg-[#1a1a20] border border-[#2a2a34] text-white text-sm placeholder-zinc-500 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500/50"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#2a2a34] hover:bg-[#33333e] text-zinc-300 text-sm font-semibold transition-all"
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
