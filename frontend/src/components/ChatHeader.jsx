import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { X, ArrowLeft, Phone, Video, Trash2 } from 'lucide-react';
import UserAvatar from './UserAvatar';

const ChatHeader = () => {
    const { selectedUser, setSelectedUser, p2pStatus, startCall, clearChatHistory } = useChatStore();
    const { onlineUsers } = useAuthStore();
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    
    const isOnline = onlineUsers.includes(selectedUser?._id);

    const handleClearChat = async () => {
        if (!selectedUser?._id) return;
        await clearChatHistory(selectedUser._id);
        setShowClearConfirm(false);
    };

    if (!selectedUser) return null;

    return (
        <div className='shrink-0 border-b border-[#1e1e24] p-4 bg-[#121215]'>
            <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                    <button 
                        onClick={() => setSelectedUser(null)} 
                        className="md:hidden btn btn-sm btn-ghost btn-circle text-zinc-400 hover:text-white -ml-1"
                        title="Back to friends"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div 
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={() => !selectedUser.isDeletedAccount && setShowProfileModal(true)}
                        title={selectedUser.isDeletedAccount ? "" : "View Profile Info"}
                    >
                        <UserAvatar
                            src={selectedUser.profilePic}
                            alt={selectedUser.fullName}
                            size="lg"
                            isOnline={isOnline}
                            showStatus={!selectedUser.isDeletedAccount}
                            className="group-hover:scale-105 transition-transform duration-200"
                        />
                        <div>
                            <h3 className='font-bold text-base text-white group-hover:text-primary transition-colors duration-200'>
                                {selectedUser.isDeletedAccount ? "Deleted User" : selectedUser.fullName}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                {isOnline && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>}
                                <span className={`text-xs ${isOnline ? 'text-emerald-400 font-medium' : 'text-zinc-500'}`}>
                                    {selectedUser.isDeletedAccount ? 'Account Deleted' :
                                     p2pStatus === 'connected' ? 'Connected' :
                                     p2pStatus === 'connecting' ? 'Connecting...' : 
                                     isOnline ? 'Online' : 'Offline'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Action Icons (Stitch Style Circular Buttons) */}
                <div className="flex items-center gap-2">
                    {!selectedUser.isDeletedAccount && (
                        <>
                            <button 
                                onClick={() => startCall(selectedUser, "audio")}
                                className="w-10 h-10 rounded-full bg-[#1f1f26] hover:bg-[#2a2a34] flex items-center justify-center text-zinc-300 hover:text-white transition-all shadow-sm"
                                title="Audio Call"
                            >
                                <Phone className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => startCall(selectedUser, "video")}
                                className="w-10 h-10 rounded-full bg-[#1f1f26] hover:bg-[#2a2a34] flex items-center justify-center text-zinc-300 hover:text-white transition-all shadow-sm"
                                title="Video Call"
                            >
                                <Video className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setShowClearConfirm(true)}
                                className="w-10 h-10 rounded-full bg-[#1f1f26] hover:bg-red-500/20 flex items-center justify-center text-zinc-400 hover:text-red-400 transition-all shadow-sm"
                                title="Clear Chat History"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </>
                    )}
                    <button 
                        onClick={() => setSelectedUser(null)} 
                        className="w-10 h-10 rounded-full bg-[#1f1f26] hover:bg-[#2a2a34] flex items-center justify-center text-zinc-400 hover:text-white transition-all shadow-sm"
                        title="Close Chat"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Confirm Clear Chat Modal */}
            {showClearConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowClearConfirm(false)} />
                    <div className="relative w-full max-w-xs bg-[#18181c] border border-[#282832] rounded-3xl p-6 text-center shadow-2xl animate-fade-in">
                        <h3 className="text-lg font-bold text-white mb-2">Clear Chat?</h3>
                        <p className="text-xs text-zinc-400 mb-6">
                            This will delete all local chat history for this user and remove any pending offline messages from the server.
                        </p>
                        <div className="flex gap-2">
                            <button onClick={() => setShowClearConfirm(false)} className="btn btn-sm btn-ghost flex-1 text-zinc-400 hover:text-white">
                                Cancel
                            </button>
                            <button onClick={handleClearChat} className="btn btn-sm bg-red-600 hover:bg-red-700 text-white border-none flex-1">
                                Clear
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Public Profile Detail Modal */}
            {showProfileModal && !selectedUser.isDeletedAccount && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowProfileModal(false)} />
                    <div className="relative w-full max-w-sm bg-[#18181c] border border-[#282832] rounded-3xl p-6 text-center shadow-2xl animate-fade-in">
                        <button 
                            onClick={() => setShowProfileModal(false)}
                            className="absolute top-4 right-4 btn btn-sm btn-circle btn-ghost text-zinc-400 hover:text-white"
                            title="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        
                        <div className="flex flex-col items-center mt-4">
                            <UserAvatar
                                src={selectedUser.profilePic}
                                alt={selectedUser.fullName}
                                size="2xl"
                                showStatus={false}
                                className="border-4 border-[#121215] shadow-xl mb-4"
                            />
                            <h2 className="text-xl font-bold text-white">{selectedUser.fullName}</h2>
                            {selectedUser.username && (
                                <p className="text-sm text-zinc-400 font-mono mt-1">@{selectedUser.username}</p>
                            )}
                            <div className="mt-5 inline-flex items-center gap-1.5 px-3 py-1 bg-[#22222a] border border-[#2e2e38] rounded-full text-xs font-semibold">
                                <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"}`}></span>
                                <span className={isOnline ? "text-emerald-400" : "text-zinc-400"}>
                                    {isOnline ? "Online" : "Offline"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatHeader;