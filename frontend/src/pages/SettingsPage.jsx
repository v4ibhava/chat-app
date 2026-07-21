import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { 
  Palette, Sun, Moon, Monitor, Shield, Eye, Lock, 
  Trash2, ArrowLeft, Check, Bell
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const SettingsPage = () => {
  const { authUser, updateProfile, deleteAccount, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const navigate = useNavigate();

  const [showActiveStatus, setShowActiveStatus] = useState(authUser?.showLastSeen ?? true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [captchaValue, setCaptchaValue] = useState("");
  const [captchaTarget, setCaptchaTarget] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const themeOptions = [
    { id: "light", name: "Light", icon: <Sun className="w-5 h-5 text-amber-500" />, desc: "Clean light appearance" },
    { id: "dark", name: "Dark", icon: <Moon className="w-5 h-5 text-indigo-400" />, desc: "Deep dark mode" },
    { id: "system", name: "System", icon: <Monitor className="w-5 h-5 text-[#2563eb]" />, desc: "Match system settings" },
  ];

  const handleToggleActiveStatus = async (val) => {
    setShowActiveStatus(val);
    try {
      await updateProfile({ showLastSeen: val });
      toast.success(val ? "Online status visible" : "Online status hidden");
    } catch (err) {
      toast.error("Failed to update status setting");
    }
  };

  const handleOpenDeleteModal = () => {
    const randomWords = ["DELETE", "REMOVE", "CONFIRM", "ZYNC", "BYE"];
    const target = randomWords[Math.floor(Math.random() * randomWords.length)] + "-" + Math.floor(1000 + Math.random() * 9000);
    setCaptchaTarget(target);
    setCaptchaValue("");
    setShowDeleteModal(true);
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (captchaValue.trim() !== captchaTarget) {
      toast.error("Security phrase does not match!");
      return;
    }
    setIsDeleting(true);
    try {
      await deleteAccount();
      toast.success("Account deleted successfully.");
      logout();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete account");
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] pt-20 pb-12 px-3 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/')} 
            className="w-10 h-10 rounded-full bg-[#1c1c22] hover:bg-[#282834] flex items-center justify-center text-zinc-400 hover:text-white transition-all shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
            <p className="text-xs text-zinc-400">Manage theme, privacy, and preferences</p>
          </div>
        </div>

        {/* Appearance / Theme */}
        <div className="bg-[#121215] border border-[#1e1e24] rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Appearance</h2>
              <p className="text-xs text-zinc-400">Choose your preferred visual theme</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
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
        </div>

        {/* Privacy & Active Status */}
        <div className="bg-[#121215] border border-[#1e1e24] rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Privacy & Status</h2>
              <p className="text-xs text-zinc-400">Control who can see your online activity</p>
            </div>
          </div>

          <div className="divide-y divide-[#1e1e24] pt-2">
            <div className="py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Show Online & Last Active Status</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Let friends see when you are online or when you were last active</p>
              </div>
              <input 
                type="checkbox" 
                className="toggle toggle-primary"
                checked={showActiveStatus}
                onChange={(e) => handleToggleActiveStatus(e.target.checked)}
              />
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-[#121215] border border-red-500/20 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-red-400">Danger Zone</h2>
              <p className="text-xs text-zinc-400">Permanent account deletion</p>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Delete Account</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Permanently delete your profile and data</p>
            </div>
            <button
              onClick={handleOpenDeleteModal}
              className="px-4 py-2 rounded-xl bg-red-600/20 border border-red-500/30 hover:bg-red-600 text-red-400 hover:text-white text-xs font-semibold transition-all shrink-0"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Security Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
          <div className="relative w-full max-w-md bg-[#18181c] border border-[#282832] rounded-3xl p-6 shadow-2xl animate-fade-in space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <Trash2 className="w-6 h-6" />
              <h3 className="text-lg font-bold text-white">Confirm Account Deletion</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              This action is permanent and cannot be undone. To confirm, please type the security phrase below:
            </p>
            
            <div className="p-3 bg-[#121215] border border-[#282832] rounded-xl text-center font-mono font-bold text-primary select-all">
              {captchaTarget}
            </div>

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <input
                type="text"
                value={captchaValue}
                onChange={(e) => setCaptchaValue(e.target.value)}
                placeholder="Type security phrase here..."
                className="w-full py-2.5 px-4 bg-[#1a1a20] border border-[#2a2a34] text-white text-sm placeholder-zinc-500 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500/50"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowDeleteModal(false)} className="btn btn-sm btn-ghost flex-1 text-zinc-400 hover:text-white">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={captchaValue.trim() !== captchaTarget || isDeleting}
                  className="btn btn-sm bg-red-600 hover:bg-red-700 text-white border-none flex-1 disabled:opacity-40"
                >
                  {isDeleting ? "Deleting..." : "Permanently Delete"}
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
