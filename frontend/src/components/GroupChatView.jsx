import React, { useState, useRef, useEffect } from "react";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import { ArrowLeft, Send, Copy, ShieldAlert, Info, Loader2, Pencil, Check, X } from "lucide-react";
import { toast } from "react-hot-toast";
import GroupInfoPanel from "./GroupInfoPanel";

const GroupChatView = () => {
    const { selectedGroup, setSelectedGroup, groupMessages, sendGroupMessage, approveRequest, setGroupInfoOpen, updateGroupName, isMessagesLoading } = useGroupStore();
    const { authUser } = useAuthStore();
    const [text, setText] = useState("");
    const [isEditingName, setIsEditingName] = useState(false);
    const [editName, setEditName] = useState("");
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [groupMessages, selectedGroup?._id]);

    if (!selectedGroup) return null;

    const messages = groupMessages[selectedGroup._id] || [];
    const isAdmin = selectedGroup.admins?.includes(authUser?._id);

    const startEditingName = () => {
        setEditName(selectedGroup.name || "");
        setIsEditingName(true);
    };

    const saveGroupName = async () => {
        const nextName = editName.trim();
        if (!nextName || nextName === selectedGroup.name) {
            setIsEditingName(false);
            return;
        }
        await updateGroupName(selectedGroup._id, nextName);
        setIsEditingName(false);
    };

    const handleSend = (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        sendGroupMessage(selectedGroup._id, text);
        setText("");
    };

    const handleCopyInvite = () => {
        const inviteUrl = `${window.location.origin}/invite/${selectedGroup.inviteCode}`;
        navigator.clipboard.writeText(inviteUrl);
        toast.success("Invite link copied to clipboard!");
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#121215] relative min-h-0">
            {/* Header */}
            <div className="shrink-0 border-b border-[#1e1e24] p-3 sm:p-4 flex items-center justify-between bg-[#121215] min-h-[60px]">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <button onClick={() => setSelectedGroup(null)} className="md:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#1f1f26] hover:bg-[#2a2a34] flex items-center justify-center text-zinc-400 hover:text-white transition-all shrink-0">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div
                        className="flex items-center gap-2 sm:gap-3 cursor-pointer group min-w-0"
                        onClick={() => setGroupInfoOpen(true)}
                        title="View Group Info"
                    >
                        {selectedGroup.groupPic ? (
                            <img
                                src={selectedGroup.groupPic}
                                alt={selectedGroup.name}
                                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover shrink-0"
                            />
                        ) : (
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-600/30 to-indigo-600/30 flex items-center justify-center text-sm font-bold text-blue-400 shrink-0">
                                {(selectedGroup.name || "G").substring(0, 2).toUpperCase()}
                            </div>
                        )}
                        <div className="min-w-0">
                            {isEditingName ? (
                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") saveGroupName();
                                            if (e.key === "Escape") setIsEditingName(false);
                                        }}
                                        className="w-36 sm:w-52 px-2.5 py-1 rounded-lg bg-[#1a1a20] border border-[#2a2a34] text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                        autoFocus
                                        maxLength={50}
                                    />
                                    <button type="button" onClick={saveGroupName} className="w-7 h-7 rounded-full bg-[#2563eb] hover:bg-blue-600 flex items-center justify-center text-white" title="Save group name">
                                        <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button type="button" onClick={() => setIsEditingName(false)} className="w-7 h-7 rounded-full bg-[#2a2a34] hover:bg-[#33333e] flex items-center justify-center text-zinc-300" title="Cancel">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <h3 className="font-bold text-sm sm:text-base text-white group-hover:text-primary transition-colors truncate">
                                        {selectedGroup.name || "Untitled Group"}
                                    </h3>
                                    {isAdmin && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                startEditingName();
                                            }}
                                            className="w-6 h-6 rounded-full bg-[#1f1f26] hover:bg-[#2a2a34] flex items-center justify-center text-zinc-400 hover:text-white transition-all shrink-0"
                                            title="Edit group name"
                                        >
                                            <Pencil className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            )}
                            <p className="text-[11px] sm:text-xs text-zinc-400 truncate">
                                {selectedGroup.members?.length || 0} members
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button onClick={handleCopyInvite} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#1f1f26] hover:bg-[#2a2a34] flex items-center justify-center text-zinc-300 hover:text-white transition-all" title="Copy Invite Link">
                        <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setGroupInfoOpen(true)} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#1f1f26] hover:bg-[#2a2a34] flex items-center justify-center text-zinc-300 hover:text-white transition-all" title="Group Info">
                        <Info className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Admin Approvals Banner */}
            {isAdmin && selectedGroup.pendingRequests?.length > 0 && (
                <div className="shrink-0 bg-amber-500/10 border-b border-amber-500/20 p-2 sm:p-3 space-y-2">
                    <div className="flex items-center gap-2 text-[11px] sm:text-xs font-semibold text-amber-500">
                        <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>Pending Join Requests:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {selectedGroup.pendingRequests.map(req => (
                            <div key={req._id} className="flex items-center gap-1.5 bg-[#1c1c22] border border-[#2a2a34] rounded-full pl-2.5 sm:pl-3 pr-1 py-0.5 text-[11px] sm:text-xs text-zinc-200">
                                <span className="truncate max-w-[80px] sm:max-w-none">{req.fullName}</span>
                                <button
                                    onClick={() => approveRequest(selectedGroup._id, req._id)}
                                    className="px-2 py-0.5 rounded-full bg-[#2563eb] hover:bg-blue-600 text-white text-[10px] font-semibold transition-all"
                                >
                                    Approve
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 min-h-0">
                {isMessagesLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-zinc-500 py-12 text-sm">
                        No messages yet. Say hello!
                    </div>
                ) : (
                    messages.map((message) => {
                        const isMe = message.senderId === authUser?._id;
                        const sender = selectedGroup.members?.find(m => m._id === message.senderId);
                        return (
                            <div key={message._id} className={`chat ${isMe ? "chat-end" : "chat-start"} max-w-[92%] sm:max-w-[80%]`}>
                                {!isMe && (
                                    <div className="chat-header text-[11px] text-zinc-400 mb-0.5 truncate">
                                        {sender ? sender.fullName : "Unknown User"}
                                    </div>
                                )}
                                <div className={`chat-bubble text-sm sm:text-base px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl shadow-sm break-words ${
                                    isMe
                                        ? "bg-[#2563eb] text-white"
                                        : "bg-[#24242b] text-zinc-200"
                                }`}>
                                    {message.text}
                                </div>
                                <div className="chat-footer text-[10px] text-zinc-500 mt-0.5">
                                    {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="shrink-0 p-3 sm:p-4 border-t border-[#1e1e24] flex gap-2 sm:gap-3 bg-[#121215]">
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type a group message..."
                    className="flex-1 bg-[#1a1a20] text-white text-sm placeholder-zinc-500 rounded-full px-4 sm:px-5 py-2.5 sm:py-3 focus:outline-none focus:ring-1 focus:ring-blue-500/50 min-w-0"
                />
                <button type="submit" className="p-2.5 sm:p-3.5 rounded-full bg-[#2563eb] hover:bg-blue-600 text-white transition-all shrink-0 disabled:opacity-40" disabled={!text.trim()}>
                    <Send className="w-4 h-4" />
                </button>
            </form>

            <GroupInfoPanel />
        </div>
    );
};

export default GroupChatView;
