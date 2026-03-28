import React from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { useChatStore } from '../store/useChatStore'
import { X } from 'lucide-react'
import UserAvatar from './UserAvatar'

const ChatHeader = () => {
    const { selectedUser, setSelectedUser } = useChatStore()
    const { onlineUsers } = useAuthStore()
    
    return (
        <div className='border-b border-base-300 p-3 sm:p-4'>
            <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                    <UserAvatar
                        src={selectedUser.profilePic}
                        alt={selectedUser.fullName}
                        size="lg"
                        isOnline={onlineUsers.includes(selectedUser._id)}
                    />
                    <div>
                        <h3 className='font-medium text-sm sm:text-base'>{selectedUser.fullName}</h3>
                        <p className={`text-xs ${onlineUsers.includes(selectedUser._id) ? 'text-green-500' : 'text-zinc-500'}`}>
                            {onlineUsers.includes(selectedUser._id) ? '● Online' : '○ Offline'}
                        </p>
                    </div>
                </div>
                <button onClick={() => setSelectedUser(null)} className="btn btn-sm btn-ghost btn-circle">
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    )
}

export default ChatHeader