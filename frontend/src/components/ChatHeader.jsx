import React from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { useChatStore } from '../store/useChatStore'
import { X, ArrowLeft } from 'lucide-react'
import UserAvatar from './UserAvatar'

const ChatHeader = () => {
    const { selectedUser, setSelectedUser, p2pStatus } = useChatStore()
    const { onlineUsers } = useAuthStore()
    
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
                    <UserAvatar
                        src={selectedUser.profilePic}
                        alt={selectedUser.fullName}
                        size="lg"
                        isOnline={onlineUsers.includes(selectedUser._id)}
                        showStatus={!selectedUser.isDeletedAccount}
                    />
                    <div>
                        <h3 className='font-medium text-sm sm:text-base'>
                            {selectedUser.isDeletedAccount ? "Deleted User" : selectedUser.fullName}
                        </h3>
                        <p className={`text-xs ${
                            selectedUser.isDeletedAccount ? 'text-zinc-500' :
                            p2pStatus === 'connected' ? 'text-green-500' :
                            p2pStatus === 'connecting' ? 'text-amber-500' : 'text-zinc-500'
                        }`}>
                            {selectedUser.isDeletedAccount ? 'Account Deleted' :
                             p2pStatus === 'connected' ? '● Connected (P2P)' :
                             p2pStatus === 'connecting' ? '● Connecting P2P...' : '○ Offline'}
                        </p>
                    </div>
                </div>
                <button onClick={() => setSelectedUser(null)} className="hidden md:flex btn btn-sm btn-ghost btn-circle items-center justify-center">
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    )
}

export default ChatHeader