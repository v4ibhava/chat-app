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
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#121215] relative min-h-0">
            {/* Header */}
            <div className="shrink-0 border-b border-[#1e1e24] p-4 flex items-center justify-between bg-[#121215]">
                <div className="flex items-center gap-3">
                    <button onClick={() => setSelectedGroup(null)} className="md:hidden btn btn-sm btn-ghost btn-circle text-zinc-400 hover:text-white">
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
                                className="w-10 h-10 rounded-full object-cover shrink-0"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600/30 to-indigo-600/30 flex items-center justify-center text-sm font-bold text-blue-400 shrink-0">
                                {selectedGroup.name.substring(0, 2).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <h3 className="font-bold text-base text-white group-hover:text-primary transition-colors">
                                {selectedGroup.name}
                            </h3>
                            <p className="text-xs text-zinc-400">
                                {selectedGroup.members?.length || 0} members
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleCopyInvite} className="btn btn-sm bg-[#1f1f26] hover:bg-[#2a2a34] text-zinc-300 border-none rounded-full flex items-center gap-1.5" title="Copy Invite Link">
                        <Copy className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-xs">Invite</span>
                    </button>
                    <button onClick={() => setGroupInfoOpen(true)} className="w-10 h-10 rounded-full bg-[#1f1f26] hover:bg-[#2a2a34] flex items-center justify-center text-zinc-300 hover:text-white transition-all shadow-sm" title="Group Info">
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
                            <div key={req._id} className="flex items-center gap-2 bg-[#1c1c22] border border-[#2a2a34] rounded-full pl-3 pr-1 py-0.5 text-xs text-zinc-200">
                                <span>{req.fullName}</span>
                                <button
                                    onClick={() => approveRequest(selectedGroup._id, req._id)}
                                    className="btn btn-xs bg-[#2563eb] hover:bg-blue-600 border-none text-white rounded-full px-2"
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
                            <div className="chat-header text-xs text-zinc-400 mb-1">
                                {sender ? sender.fullName : "Unknown User"}
                            </div>
                            <div className={`chat-bubble text-sm sm:text-base px-4 py-2.5 rounded-2xl shadow-sm ${
                                isMe 
                                    ? "bg-[#2563eb] text-white" 
                                    : "bg-[#24242b] text-zinc-200"
                            }`}>
                                {message.text}
                            </div>
                            <div className="chat-footer text-[10px] text-zinc-500 mt-1">
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
            <form onSubmit={handleSend} className="shrink-0 p-4 border-t border-[#1e1e24] flex gap-3 bg-[#121215]">
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type a group message..."
                    className="flex-1 bg-[#1a1a20] text-white text-sm placeholder-zinc-500 rounded-full px-5 py-3 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />
                <button type="submit" className="p-3.5 rounded-full bg-[#2563eb] hover:bg-blue-600 text-white transition-all shadow-md shrink-0 disabled:opacity-40" disabled={!text.trim()}>
                    <Send className="w-4 h-4" />
                </button>
            </form>

            {/* Group Info Panel */}
            <GroupInfoPanel />
        </div>
    );
};

export default GroupChatView;
