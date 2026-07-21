import React, { useState, useRef, useEffect } from "react";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import { ArrowLeft, Send, Copy, ShieldAlert, Info } from "lucide-react";
import { toast } from "react-hot-toast";
import GroupInfoPanel from "./GroupInfoPanel";

const GroupChatView = () => {
    const { selectedGroup, setSelectedGroup, groupMessages, sendGroupMessage, approveRequest, setGroupInfoOpen } = useGroupStore();
    const { authUser } = useAuthStore();
    const [text, setText] = useState("");
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [groupMessages, selectedGroup?._id]);

    if (!selectedGroup) return null;

    const messages = groupMessages[selectedGroup._id] || [];
    const isAdmin = selectedGroup.admins?.includes(authUser?._id);

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
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-base-100 relative min-h-0">
            {/* Header */}
            <div className="shrink-0 border-b border-base-300 p-3 sm:p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => setSelectedGroup(null)} className="md:hidden btn btn-sm btn-ghost btn-circle">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={() => setGroupInfoOpen(true)}
                        title="View Group Info"
                    >
                        {selectedGroup.groupPic ? (
                            <img
                                src={selectedGroup.groupPic}
                                alt={selectedGroup.name}
                                className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-sm font-bold text-primary ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
                                {selectedGroup.name.substring(0, 2).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <h3 className="font-bold text-sm sm:text-base group-hover:text-primary transition-colors">
                                {selectedGroup.name}
                            </h3>
                            <p className="text-xs text-zinc-500">
                                {selectedGroup.members?.length || 0} members
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleCopyInvite} className="btn btn-sm btn-outline flex items-center gap-1.5" title="Copy Invite Link">
                        <Copy className="w-4 h-4" />
                        <span className="hidden sm:inline">Invite</span>
                    </button>
                    <button onClick={() => setGroupInfoOpen(true)} className="btn btn-sm btn-ghost btn-circle" title="Group Info">
                        <Info className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Admin Approvals Banner */}
            {isAdmin && selectedGroup.pendingRequests?.length > 0 && (
                <div className="shrink-0 bg-amber-500/10 border-b border-amber-500/20 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-500">
                        <ShieldAlert className="w-4 h-4" />
                        <span>Pending Join Requests:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {selectedGroup.pendingRequests.map(req => (
                            <div key={req._id} className="flex items-center gap-2 bg-base-200 border border-base-300 rounded-full pl-3 pr-1 py-0.5 text-xs">
                                <span>{req.fullName}</span>
                                <button
                                    onClick={() => approveRequest(selectedGroup._id, req._id)}
                                    className="btn btn-xs btn-primary rounded-full px-2"
                                >
                                    Approve
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                {messages.map((message) => {
                    const isMe = message.senderId === authUser?._id;
                    const sender = selectedGroup.members?.find(m => m._id === message.senderId);
                    return (
                        <div key={message._id} className={`chat ${isMe ? "chat-end" : "chat-start"}`}>
                            <div className="chat-header text-xs opacity-60 mb-0.5">
                                {sender ? sender.fullName : "Unknown User"}
                            </div>
                            <div className={`chat-bubble text-sm sm:text-base ${isMe ? "bg-primary text-primary-content" : "bg-base-200 text-base-content"}`}>
                                {message.text}
                            </div>
                            <div className="chat-footer opacity-50 text-[10px] mt-0.5">
                                {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                        </div>
                    );
                })}
                {messages.length === 0 && (
                    <div className="text-center text-zinc-500 py-12 text-sm">
                        No messages yet. Say hello!
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="shrink-0 p-3 sm:p-4 border-t border-base-300 flex gap-2">
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type a group message..."
                    className="input input-bordered flex-1"
                />
                <button type="submit" className="btn btn-primary btn-circle">
                    <Send className="w-4 h-4" />
                </button>
            </form>

            {/* Group Info Panel */}
            <GroupInfoPanel />
        </div>
    );
};

export default GroupChatView;
