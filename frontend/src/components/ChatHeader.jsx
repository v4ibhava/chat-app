import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { X, ArrowLeft, Phone, Video, Trash2, MoreVertical, User } from 'lucide-react';
import UserAvatar from './UserAvatar';

const ChatHeader = () => {
    const { selectedUser, setSelectedUser, p2pStatus, startCall, clearChatHistory } = useChatStore();
    const { onlineUsers } = useAuthStore();
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [showCallMenu, setShowCallMenu] = useState(false);
    const [showOptionsMenu, setShowOptionsMenu] = useState(false);

    const callMenuRef = useRef(null);
    const optionsMenuRef = useRef(null);

    const isOnline = onlineUsers.includes(selectedUser?._id);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (callMenuRef.current && !callMenuRef.current.contains(event.target)) {
                setShowCallMenu(false);
            }
            if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target)) {
                setShowOptionsMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleClearChat = async () => {
        if (!selectedUser?._id) return;
        await clearChatHistory(selectedUser._id);
        setShowClearConfirm(false);
    };

    if (!selectedUser) return null;

    return (
        <div className='shrink-0 border-b border-base-300 px-3 py-2.5 sm:p-4 bg-base-200 transition-colors duration-200 relative z-20'>
            <div className='flex items-center justify-between gap-2'>
                {/* Left Profile Info */}
                <div className='flex items-center gap-2 sm:gap-3 min-w-0'>
                    <button 
                        onClick={() => setSelectedUser(null)} 
                        className="md:hidden p-1.5 rounded-full text-base-content/70 hover:text-base-content hover:bg-base-300/50 transition-all shrink-0"
                        title="Back to friends"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div 
                        className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group min-w-0"
                        onClick={() => !selectedUser.isDeletedAccount && setShowProfileModal(true)}
                        title={selectedUser.isDeletedAccount ? "" : "View Profile Info"}
                    >
                        <UserAvatar
                            src={selectedUser.profilePic}
                            alt={selectedUser.fullName}
                            size="md"
                            isOnline={isOnline}
                            showStatus={!selectedUser.isDeletedAccount}
                            className="group-hover:scale-105 transition-transform duration-200 shrink-0"
                        />
                        <div className="min-w-0">
                            <h3 className='font-bold text-sm sm:text-base text-base-content group-hover:text-primary transition-colors duration-200 truncate'>
                                {selectedUser.isDeletedAccount ? "Deleted User" : selectedUser.fullName}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                {isOnline && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>}
                                <span className={`text-xs truncate ${isOnline ? 'text-emerald-400 font-medium' : 'text-base-content/50'}`}>
                                    {selectedUser.isDeletedAccount ? 'Account Deleted' :
                                     isOnline ? (p2pStatus === 'connected' ? 'Online • P2P' : 'Online') : 'Offline'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {!selectedUser.isDeletedAccount && (
                        /* Call Button Dropdown */
                        <div className="relative" ref={callMenuRef}>
                            <button 
                                onClick={() => {
                                    setShowCallMenu(!showCallMenu);
                                    setShowOptionsMenu(false);
                                }}
                                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-base-100 border border-base-300 flex items-center justify-center transition-all shadow-sm ${
                                    showCallMenu 
                                        ? 'bg-primary text-primary-content border-primary' 
                                        : 'text-base-content/70 hover:text-base-content hover:bg-base-300/50'
                                }`}
                                title="Call Options"
                            >
                                <Phone className="w-4 h-4" />
                            </button>

                            {showCallMenu && (
                                <div className="absolute right-0 mt-2 w-44 bg-base-100 border border-base-300 rounded-2xl shadow-xl py-1.5 z-30 animate-fade-in">
                                    <button
                                        onClick={() => {
                                            setShowCallMenu(false);
                                            startCall(selectedUser, "audio");
                                        }}
                                        className="w-full px-4 py-2 text-xs sm:text-sm text-left flex items-center gap-3 text-base-content hover:bg-base-200 transition-colors"
                                    >
                                        <Phone className="w-4 h-4 text-emerald-500" />
                                        <span>Voice Call</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowCallMenu(false);
                                            startCall(selectedUser, "video");
                                        }}
                                        className="w-full px-4 py-2 text-xs sm:text-sm text-left flex items-center gap-3 text-base-content hover:bg-base-200 transition-colors"
                                    >
                                        <Video className="w-4 h-4 text-primary" />
                                        <span>Video Call</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {!selectedUser.isDeletedAccount && (
                        /* Options Button Dropdown (Three Dots) */
                        <div className="relative" ref={optionsMenuRef}>
                            <button 
                                onClick={() => {
                                    setShowOptionsMenu(!showOptionsMenu);
                                    setShowCallMenu(false);
                                }}
                                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-base-100 border border-base-300 flex items-center justify-center transition-all shadow-sm ${
                                    showOptionsMenu 
                                        ? 'bg-base-300 text-base-content' 
                                        : 'text-base-content/70 hover:text-base-content hover:bg-base-300/50'
                                }`}
                                title="More Options"
                            >
                                <MoreVertical className="w-4 h-4" />
                            </button>

                            {showOptionsMenu && (
                                <div className="absolute right-0 mt-2 w-48 bg-base-100 border border-base-300 rounded-2xl shadow-xl py-1.5 z-30 animate-fade-in">
                                    <button
                                        onClick={() => {
                                            setShowOptionsMenu(false);
                                            setShowProfileModal(true);
                                        }}
                                        className="w-full px-4 py-2 text-xs sm:text-sm text-left flex items-center gap-3 text-base-content hover:bg-base-200 transition-colors"
                                    >
                                        <User className="w-4 h-4 text-base-content/70" />
                                        <span>View Profile</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowOptionsMenu(false);
                                            setShowClearConfirm(true);
                                        }}
                                        className="w-full px-4 py-2 text-xs sm:text-sm text-left flex items-center gap-3 text-red-500 hover:bg-red-500/10 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span>Delete Chat</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Close Chat Button */}
                    <button 
                        onClick={() => setSelectedUser(null)} 
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-base-100 border border-base-300 hover:bg-base-300/50 flex items-center justify-center text-base-content/70 hover:text-base-content transition-all shadow-sm shrink-0"
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
                    <div className="relative w-full max-w-xs bg-base-200 border border-base-300 rounded-3xl p-6 text-center shadow-2xl animate-fade-in">
                        <h3 className="text-lg font-bold text-base-content mb-2">Clear Chat?</h3>
                        <p className="text-xs text-base-content/60 mb-6">
                            This will delete all local chat history for this user and remove any pending offline messages from the server.
                        </p>
                        <div className="flex gap-2">
                            <button onClick={() => setShowClearConfirm(false)} className="btn btn-sm btn-ghost flex-1 text-base-content/70 hover:text-base-content">
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
                    <div className="relative w-full max-w-sm bg-base-200 border border-base-300 rounded-3xl p-6 text-center shadow-2xl animate-fade-in">
                        <button 
                            onClick={() => setShowProfileModal(false)}
                            className="absolute top-4 right-4 p-2 rounded-full text-base-content/60 hover:text-base-content"
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
                                className="border-4 border-base-100 shadow-xl mb-4"
                            />
                            <h2 className="text-xl font-bold text-base-content">{selectedUser.fullName}</h2>
                            {selectedUser.username && (
                                <p className="text-sm text-base-content/60 font-mono mt-1">@{selectedUser.username}</p>
                            )}
                            <div className="mt-5 inline-flex items-center gap-1.5 px-3 py-1 bg-base-100 border border-base-300 rounded-full text-xs font-semibold">
                                <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-400 animate-pulse" : "bg-base-content/40"}`}></span>
                                <span className={isOnline ? "text-emerald-400" : "text-base-content/60"}>
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