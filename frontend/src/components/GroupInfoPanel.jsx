import React, { useState, useRef } from "react";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import {
    X, Camera, Trash2, LogOut, UserMinus, Shield, Crown,
    Copy, Check, Pencil, Users
} from "lucide-react";
import { toast } from "react-hot-toast";
import UserAvatar from "./UserAvatar";

const GroupInfoPanel = () => {
    const {
        selectedGroup, isGroupInfoOpen, setGroupInfoOpen,
        updateGroupName, updateGroupAvatar, removeGroupAvatar,
        deleteGroup, leaveGroup, removeMember
    } = useGroupStore();
    const { authUser, onlineUsers } = useAuthStore();

    const [isEditingName, setIsEditingName] = useState(false);
    const [editName, setEditName] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [removingMemberId, setRemovingMemberId] = useState(null);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [copied, setCopied] = useState(false);
    const fileInputRef = useRef(null);

    if (!selectedGroup || !isGroupInfoOpen) return null;

    const isAdmin = selectedGroup.admins?.includes(authUser?._id);
    const isCreator = selectedGroup.admins?.[0] === authUser?._id;

    const handleEditName = () => {
        setEditName(selectedGroup.name);
        setIsEditingName(true);
    };

    const handleSaveName = async () => {
        if (!editName.trim() || editName.trim() === selectedGroup.name) {
            setIsEditingName(false);
            return;
        }
        await updateGroupName(selectedGroup._id, editName.trim());
        setIsEditingName(false);
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            toast.error("Image must be under 2MB");
            return;
        }

        setIsUploadingAvatar(true);
        const reader = new FileReader();
        reader.onload = async () => {
            await updateGroupAvatar(selectedGroup._id, reader.result);
            setIsUploadingAvatar(false);
        };
        reader.readAsDataURL(file);
    };

    const handleCopyInvite = () => {
        const inviteUrl = `${window.location.origin}/invite/${selectedGroup.inviteCode}`;
        navigator.clipboard.writeText(inviteUrl);
        setCopied(true);
        toast.success("Invite link copied!");
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDeleteGroup = async () => {
        await deleteGroup(selectedGroup._id);
        setShowDeleteConfirm(false);
    };

    const handleLeaveGroup = async () => {
        await leaveGroup(selectedGroup._id);
        setShowLeaveConfirm(false);
    };

    const handleRemoveMember = async (memberId) => {
        await removeMember(selectedGroup._id, memberId);
        setRemovingMemberId(null);
    };

    const getMemberRole = (memberId) => {
        if (!selectedGroup.admins) return null;
        if (selectedGroup.admins[0] === memberId) return "creator";
        if (selectedGroup.admins.includes(memberId)) return "admin";
        return null;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setGroupInfoOpen(false)}
            />

            <div className="relative w-full max-w-sm bg-[#18181c] border-l border-[#282832] shadow-2xl flex flex-col animate-slide-in-right overflow-hidden">
                {/* Header */}
                <div className="shrink-0 p-4 border-b border-[#282832] flex items-center justify-between bg-[#1f1f26]">
                    <h3 className="font-bold text-sm flex items-center gap-2 text-white">
                        <Users className="w-4 h-4 text-primary" />
                        Group Info
                    </h3>
                    <button
                        onClick={() => setGroupInfoOpen(false)}
                        className="w-8 h-8 rounded-full bg-[#2a2a34] hover:bg-[#33333e] flex items-center justify-center text-zinc-400 hover:text-white transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* Avatar Section */}
                    <div className="flex flex-col items-center pt-8 pb-6 px-6">
                        <div className="relative group">
                            {selectedGroup.groupPic ? (
                                <img
                                    src={selectedGroup.groupPic}
                                    alt={selectedGroup.name}
                                    className="w-24 h-24 rounded-full object-cover ring-4 ring-primary/20 shadow-lg"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-3xl font-bold text-primary ring-4 ring-primary/20 shadow-lg">
                                    {(selectedGroup.name || "G").substring(0, 2).toUpperCase()}
                                </div>
                            )}
                            {isAdmin && (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                                    disabled={isUploadingAvatar}
                                >
                                    {isUploadingAvatar ? (
                                        <span className="loading loading-spinner loading-sm text-white" />
                                    ) : (
                                        <Camera className="w-6 h-6 text-white" />
                                    )}
                                </button>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                className="hidden"
                            />
                        </div>

                        {isAdmin && selectedGroup.groupPic && (
                            <button
                                onClick={() => removeGroupAvatar(selectedGroup._id)}
                                className="mt-2 text-xs text-red-400 hover:underline hover:text-red-300 transition-colors"
                            >
                                Remove photo
                            </button>
                        )}

                        <div className="mt-4 flex items-center gap-2">
                            {isEditingName ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                                        className="px-3 py-1.5 rounded-xl bg-[#1a1a20] border border-[#2a2a34] text-white text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary/40 w-44"
                                        autoFocus
                                        maxLength={50}
                                    />
                                    <button onClick={handleSaveName} className="w-8 h-8 rounded-full bg-primary/80 hover:bg-primary flex items-center justify-center text-white transition-all">
                                        <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => setIsEditingName(false)} className="w-8 h-8 rounded-full bg-[#2a2a34] hover:bg-[#33333e] flex items-center justify-center text-zinc-400 hover:text-white transition-all">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xl font-bold text-white">{selectedGroup.name}</h2>
                                    {isAdmin && (
                                        <button
                                            onClick={handleEditName}
                                            className="w-7 h-7 rounded-full bg-[#2a2a34] hover:bg-[#33333e] flex items-center justify-center text-zinc-400 hover:text-white transition-all"
                                            title="Edit name"
                                        >
                                            <Pencil className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">{selectedGroup.desc}</p>
                        <p className="text-xs text-zinc-400 mt-1">{selectedGroup.members?.length || 0} members</p>
                    </div>

                    {/* Invite Link */}
                    {selectedGroup.inviteCode && (
                        <div className="px-6 pb-4">
                            <button
                                onClick={handleCopyInvite}
                                className="w-full py-2 rounded-xl border border-[#2a2a34] hover:bg-[#1f1f26] text-zinc-300 hover:text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
                            >
                                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                {copied ? "Copied!" : "Copy Invite Link"}
                            </button>
                        </div>
                    )}

                    <div className="border-t border-[#282832] mx-4" />

                    {/* Members List */}
                    <div className="px-4 py-4">
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-3 px-2">
                            Members ({selectedGroup.members?.length || 0})
                        </h4>
                        <div className="space-y-1">
                            {selectedGroup.members?.map(member => {
                                const role = getMemberRole(member._id);
                                const isOnline = onlineUsers.includes(member._id);
                                const isMe = member._id === authUser?._id;

                                return (
                                    <div
                                        key={member._id}
                                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#1f1f26] transition-colors group"
                                    >
                                        <UserAvatar
                                            src={member.profilePic}
                                            alt={member.fullName}
                                            size="md"
                                            isOnline={isOnline}
                                            showStatus={true}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-medium text-sm text-white truncate">
                                                    {member.fullName}
                                                    {isMe && <span className="text-zinc-400 font-normal"> (You)</span>}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                {role === "creator" && (
                                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-amber-500/15 text-amber-500 px-1.5 py-0.5 rounded-full">
                                                        <Crown className="w-2.5 h-2.5" />
                                                        Creator
                                                    </span>
                                                )}
                                                {role === "admin" && (
                                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                                                        <Shield className="w-2.5 h-2.5" />
                                                        Admin
                                                    </span>
                                                )}
                                                <span className={`text-[10px] ${isOnline ? "text-emerald-400" : "text-zinc-500"}`}>
                                                    {isOnline ? "Online" : "Offline"}
                                                </span>
                                            </div>
                                        </div>

                                        {isAdmin && !isMe && role !== "creator" && (
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                {removingMemberId === member._id ? (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleRemoveMember(member._id)}
                                                            className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-all"
                                                        >
                                                            Remove
                                                        </button>
                                                        <button
                                                            onClick={() => setRemovingMemberId(null)}
                                                            className="px-2.5 py-1 rounded-lg bg-[#2a2a34] hover:bg-[#33333e] text-zinc-400 hover:text-white text-xs font-semibold transition-all"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setRemovingMemberId(member._id)}
                                                        className="w-8 h-8 rounded-full bg-[#2a2a34] hover:bg-red-500/20 flex items-center justify-center text-zinc-400 hover:text-red-400 transition-all"
                                                        title="Remove member"
                                                    >
                                                        <UserMinus className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Pending Requests */}
                    {isAdmin && selectedGroup.pendingRequests?.length > 0 && (
                        <>
                            <div className="border-t border-[#282832] mx-4" />
                            <div className="px-4 py-4">
                                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-amber-500 mb-3 px-2">
                                    Pending Requests ({selectedGroup.pendingRequests.length})
                                </h4>
                                <div className="space-y-1">
                                    {selectedGroup.pendingRequests.map(req => (
                                        <div key={req._id} className="flex items-center gap-3 p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10">
                                            <UserAvatar
                                                src={req.profilePic}
                                                alt={req.fullName}
                                                size="md"
                                                showStatus={false}
                                            />
                                            <span className="flex-1 text-sm font-medium text-white truncate">{req.fullName}</span>
                                            <button
                                                onClick={() => useGroupStore.getState().approveRequest(selectedGroup._id, req._id)}
                                                className="px-3 py-1.5 rounded-lg bg-primary/80 hover:bg-primary text-white text-xs font-semibold transition-all"
                                            >
                                                Approve
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Bottom Actions */}
                <div className="shrink-0 border-t border-[#282832] p-4 space-y-2 bg-[#1f1f26]/50">
                    {!showLeaveConfirm ? (
                        <button
                            onClick={() => setShowLeaveConfirm(true)}
                            className="w-full py-2 rounded-xl border border-red-500/30 hover:bg-red-500/10 text-red-400 hover:text-red-300 text-sm font-semibold transition-all flex items-center justify-center gap-2"
                        >
                            <LogOut className="w-4 h-4" />
                            Leave Group
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button onClick={handleLeaveGroup} className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-all">
                                Confirm Leave
                            </button>
                            <button onClick={() => setShowLeaveConfirm(false)} className="flex-1 py-2 rounded-xl bg-[#2a2a34] hover:bg-[#33333e] text-zinc-400 hover:text-white text-sm font-semibold transition-all">
                                Cancel
                            </button>
                        </div>
                    )}

                    {isCreator && (
                        <>
                            {!showDeleteConfirm ? (
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="w-full py-2 rounded-xl bg-red-600/70 hover:bg-red-600 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete Group
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button onClick={handleDeleteGroup} className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-all">
                                        Confirm Delete
                                    </button>
                                    <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 rounded-xl bg-[#2a2a34] hover:bg-[#33333e] text-zinc-400 hover:text-white text-sm font-semibold transition-all">
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .animate-slide-in-right {
                    animation: slideInRight 0.25s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default GroupInfoPanel;
