import React, { useState } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { useChatStore } from '../store/useChatStore'
import { X, ArrowLeft, Phone, Video } from 'lucide-react'
import UserAvatar from './UserAvatar'

const ChatHeader = () => {
    const { selectedUser, setSelectedUser, p2pStatus, startCall } = useChatStore()
    const { onlineUsers } = useAuthStore()
    const [showProfileModal, setShowProfileModal] = useState(false)
    
    return (
        <div className='border-b border-base-300 p-3 sm:p-4'>
            <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2 sm:gap-3'>
                    <button 
                        onClick={() => setSelectedUser(null)} 
                        className="md:hidden btn btn-sm btn-ghost btn-circle -ml-1"
                        title="Back to friends"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div 
                        className="flex items-center gap-2 sm:gap-3 cursor-pointer group"
                        onClick={() => !selectedUser.isDeletedAccount && setShowProfileModal(true)}
                        title={selectedUser.isDeletedAccount ? "" : "View Profile Info"}
                    >
                        <UserAvatar
                            src={selectedUser.profilePic}
                            alt={selectedUser.fullName}
                            size="lg"
                            isOnline={onlineUsers.includes(selectedUser._id)}
                            showStatus={!selectedUser.isDeletedAccount}
                            className="group-hover:scale-105 transition-transform duration-200"
                        />
                        <div>
                            <h3 className='font-medium text-sm sm:text-base group-hover:text-primary transition-colors duration-200'>
                                {selectedUser.isDeletedAccount ? "Deleted User" : selectedUser.fullName}
                            </h3>
                            <p className={`text-xs ${
                                selectedUser.isDeletedAccount ? 'text-zinc-500' :
                                p2pStatus === 'connected' ? 'text-green-500' :
                                p2pStatus === 'connecting' ? 'text-amber-500' : 'text-zinc-500'
                            }`}>
                                {selectedUser.isDeletedAccount ? 'Account Deleted' :
                                 p2pStatus === 'connected' ? 'Connected (P2P)' :
                                 p2pStatus === 'connecting' ? 'Connecting P2P...' : 'Offline'}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                    {onlineUsers.includes(selectedUser._id) && !selectedUser.isDeletedAccount && (
                        <>
                            <button 
                                onClick={() => startCall(selectedUser, "audio")}
                                className="btn btn-sm btn-ghost btn-circle text-zinc-500 hover:text-primary"
                                title="Audio Call"
                            >
                                <Phone className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => startCall(selectedUser, "video")}
                                className="btn btn-sm btn-ghost btn-circle text-zinc-500 hover:text-primary"
                                title="Video Call"
                            >
                                <Video className="w-5 h-5" />
                            </button>
                        </>
                    )}
                    <button onClick={() => setSelectedUser(null)} className="hidden md:flex btn btn-sm btn-ghost btn-circle items-center justify-center">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Public Profile Detail Modal */}
            {showProfileModal && !selectedUser.isDeletedAccount && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
                        onClick={() => setShowProfileModal(false)} 
                    />
                    
                    {/* Modal Content Card */}
                    <div className="relative w-full max-w-sm bg-base-200 border border-base-300 rounded-3xl p-6 text-center shadow-2xl animate-fade-in">
                        <button 
                            onClick={() => setShowProfileModal(false)}
                            className="absolute top-4 right-4 btn btn-sm btn-circle btn-ghost"
                            title="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        
                        <div className="flex flex-col items-center mt-4">
                            {/* Large Avatar */}
                            <div className="relative mb-4 group shrink-0">
                                <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-primary rounded-full blur opacity-25"></div>
                                <div className="relative">
                                    <UserAvatar
                                        src={selectedUser.profilePic}
                                        alt={selectedUser.fullName}
                                        size="2xl"
                                        showStatus={false}
                                        className="border-4 border-base-100 shadow-md"
                                    />
                                </div>
                            </div>
                            
                            {/* Name & Handle */}
                            <h2 className="text-xl font-bold text-base-content">{selectedUser.fullName}</h2>
                            {selectedUser.username && (
                                <p className="text-sm text-zinc-400 font-mono mt-1">@{selectedUser.username}</p>
                            )}
                            
                            {/* Status Pill */}
                            <div className="mt-5 inline-flex items-center gap-1.5 px-3 py-1 bg-base-300 border border-base-300/40 rounded-full text-xs font-semibold">
                                <span className={`w-1.5 h-1.5 rounded-full ${onlineUsers.includes(selectedUser._id) ? "bg-green-500 animate-pulse" : "bg-zinc-400"}`}></span>
                                <span className={onlineUsers.includes(selectedUser._id) ? "text-green-500" : "text-zinc-500"}>
                                    {onlineUsers.includes(selectedUser._id) ? "Online" : "Offline"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ChatHeader