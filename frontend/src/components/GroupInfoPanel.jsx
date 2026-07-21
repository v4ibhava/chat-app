import React, { useState, useRef } from "react";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import {
    X, Camera, Trash2, LogOut, UserMinus, Shield, Crown,
    Copy, Check, Pencil, KeyRound, Users
} from "lucide-react";
import { toast } from "react-hot-toast";
import UserAvatar from "./UserAvatar";

const GroupInfoPanel = () => {
    const {
        selectedGroup, setSelectedGroup, isGroupInfoOpen, setGroupInfoOpen,
        updateGroupName, updateGroupAvatar, removeGroupAvatar,
        deleteGroup, leaveGroup, removeMember, requestGroupKey
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
    const isPendingKey = selectedGroup.name === "Encrypted Group";

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
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setGroupInfoOpen(false)}
            />

            {/* Panel */}
            <div className="relative w-full max-w-sm bg-base-100 border-l border-base-300 shadow-2xl flex flex-col animate-slide-in-right overflow-hidden">
                {/* Header */}
                <div className="shrink-0 p-4 border-b border-base-300 flex items-center justify-between bg-base-200/50">
                    <h3 className="font-bold text-sm flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        Group Info
                    </h3>
                    <button
                        onClick={() => setGroupInfoOpen(false)}
                        className="btn btn-sm btn-ghost btn-circle"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Scrollable Content */}
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
                                    {selectedGroup.name.substring(0, 2).toUpperCase()}
                                </div>
                            )}
                            {isAdmin && !isPendingKey && (
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

                        {/* Remove avatar button */}
                        {isAdmin && selectedGroup.groupPic && !isPendingKey && (
                            <button
                                onClick={() => removeGroupAvatar(selectedGroup._id)}
                                className="mt-2 text-xs text-error hover:underline"
                            >
                                Remove photo
                            </button>
                        )}

                        {/* Group Name */}
                        <div className="mt-4 flex items-center gap-2">
                            {isEditingName ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                                        className="input input-sm input-bordered w-48 text-center"
                                        autoFocus
                                        maxLength={50}
                                    />
                                    <button onClick={handleSaveName} className="btn btn-sm btn-primary btn-circle">
                                        <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => setIsEditingName(false)} className="btn btn-sm btn-ghost btn-circle">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xl font-bold text-base-content">{selectedGroup.name}</h2>
                                    {isAdmin && !isPendingKey && (
                                        <button
                                            onClick={handleEditName}
                                            className="btn btn-xs btn-ghost btn-circle opacity-60 hover:opacity-100"
                                            title="Edit name"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">{selectedGroup.desc}</p>
                        <p className="text-xs text-zinc-400 mt-1">{selectedGroup.members?.length || 0} members</p>
                    </div>

                    {/* Key Request Button (shown when pending) */}
                    {isPendingKey && (
                        <div className="px-6 pb-4">
                            <button
                                onClick={() => requestGroupKey(selectedGroup._id)}
                                className="btn btn-sm btn-warning w-full gap-2"
                            >
                                <KeyRound className="w-4 h-4" />
                                Request Encryption Key
                            </button>
                            <p className="text-xs text-zinc-500 text-center mt-2">
                                An admin needs to be online to share the key
                            </p>
                        </div>
                    )}

                    {/* Invite Link */}
                    {selectedGroup.inviteCode && (
                        <div className="px-6 pb-4">
                            <button
                                onClick={handleCopyInvite}
                                className="btn btn-sm btn-outline w-full gap-2"
                            >
                                {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                                {copied ? "Copied!" : "Copy Invite Link"}
                            </button>
                        </div>
                    )}

                    {/* Divider */}
                    <div className="border-t border-base-300 mx-4" />

                    {/* Members List */}
                    <div className="px-4 py-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3 px-2">
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
                                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-base-200/60 transition-colors group"
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
                                                <span className="font-medium text-sm truncate">
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
                                                <span className={`text-[10px] ${isOnline ? "text-green-500" : "text-zinc-500"}`}>
                                                    {isOnline ? "Online" : "Offline"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Remove button (admin only, can't remove self or creator) */}
                                        {isAdmin && !isMe && role !== "creator" && (
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                {removingMemberId === member._id ? (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleRemoveMember(member._id)}
                                                            className="btn btn-xs btn-error"
                                                        >
                                                            Remove
                                                        </button>
                                                        <button
                                                            onClick={() => setRemovingMemberId(null)}
                                                            className="btn btn-xs btn-ghost"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setRemovingMemberId(member._id)}
                                                        className="btn btn-xs btn-ghost text-error"
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
                            <div className="border-t border-base-300 mx-4" />
                            <div className="px-4 py-4">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-500 mb-3 px-2">
                                    Pending Requests ({selectedGroup.pendingRequests.length})
                                </h4>
                                <div className="space-y-1">
                                    {selectedGroup.pendingRequests.map(req => (
                                        <div key={req._id} className="flex items-center gap-3 p-2.5 rounded-xl bg-amber-500/5">
                                            <UserAvatar
                                                src={req.profilePic}
                                                alt={req.fullName}
                                                size="md"
                                                showStatus={false}
                                            />
                                            <span className="flex-1 text-sm font-medium truncate">{req.fullName}</span>
                                            <button
                                                onClick={() => useGroupStore.getState().approveRequest(selectedGroup._id, req._id)}
                                                className="btn btn-xs btn-primary"
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
                <div className="shrink-0 border-t border-base-300 p-4 space-y-2 bg-base-200/30">
                    {/* Leave Group */}
                    {!showLeaveConfirm ? (
                        <button
                            onClick={() => setShowLeaveConfirm(true)}
                            className="btn btn-sm btn-outline btn-error w-full gap-2"
                        >
                            <LogOut className="w-4 h-4" />
                            Leave Group
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button onClick={handleLeaveGroup} className="btn btn-sm btn-error flex-1">
                                Confirm Leave
                            </button>
                            <button onClick={() => setShowLeaveConfirm(false)} className="btn btn-sm btn-ghost flex-1">
                                Cancel
                            </button>
                        </div>
                    )}

                    {/* Delete Group (creator only) */}
                    {isCreator && (
                        <>
                            {!showDeleteConfirm ? (
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="btn btn-sm btn-error w-full gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete Group
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button onClick={handleDeleteGroup} className="btn btn-sm btn-error flex-1">
                                        Confirm Delete
                                    </button>
                                    <button onClick={() => setShowDeleteConfirm(false)} className="btn btn-sm btn-ghost flex-1">
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
