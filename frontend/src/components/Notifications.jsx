import React, { useState, useEffect, useRef } from 'react';
import { Bell, UserCheck, X, MessageSquare } from 'lucide-react';
import UserAvatar from './UserAvatar';
import { useAuthStore } from '../store/useAuthStore';
import { axiosInstance } from '../lib/axios';
import { useNavigate } from 'react-router-dom';
import { playNotificationSound } from '../lib/sounds';

const Notifications = () => {
  const [showPanel, setShowPanel] = useState(false);
  const [friendRequests, setFriendRequests] = useState([]);
  const [prevCount, setPrevCount] = useState(0);
  const { authUser, checkAuth } = useAuthStore();
  const navigate = useNavigate();
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (authUser) {
      fetchFriendRequests().finally(() => {
        // Set isFirstLoad to false after the very first API response completes
        setTimeout(() => {
          isFirstLoad.current = false;
        }, 1000);
      });
      const interval = setInterval(fetchFriendRequests, 10000);

      window.addEventListener("refreshFriendRequests", fetchFriendRequests);

      return () => {
        clearInterval(interval);
        window.removeEventListener("refreshFriendRequests", fetchFriendRequests);
      };
    }
  }, [authUser]);

  useEffect(() => {
    if (!isFirstLoad.current && friendRequests.length > prevCount) {
      playNotificationSound('friendRequest');
    }
    setPrevCount(friendRequests.length);
  }, [friendRequests.length, prevCount]);

  const fetchFriendRequests = async () => {
    try {
      const res = await axiosInstance.get("/users/friend-requests");
      setFriendRequests(res.data);
    } catch (error) {
      console.log("Error fetching friend requests:", error);
    }
  };

  const acceptRequest = async (userId) => {
    try {
      await axiosInstance.post(`/users/accept-friend/${userId}`);
      setFriendRequests(prev => prev.filter(u => u._id !== userId));
      checkAuth();
    } catch (error) {
      console.log("Error accepting friend request:", error);
    }
  };

  const rejectRequest = async (userId) => {
    try {
      await axiosInstance.post(`/users/reject-friend/${userId}`);
      setFriendRequests(prev => prev.filter(u => u._id !== userId));
    } catch (error) {
      console.log("Error rejecting friend request:", error);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setShowPanel(!showPanel)} 
        className="w-10 h-10 rounded-full bg-[#1f1f26] hover:bg-[#2a2a34] flex items-center justify-center text-zinc-400 hover:text-white transition-all relative"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {friendRequests.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full animate-pulse shadow-sm">
            {friendRequests.length}
          </span>
        )}
      </button>

      {showPanel && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-[#18181c] border border-[#282832] rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="p-3 border-b border-[#282832] flex justify-between items-center bg-[#1f1f26]">
            <h3 className="font-semibold flex items-center gap-2 text-white text-sm">
              <Bell className="w-4 h-4 text-zinc-400" /> Notifications
            </h3>
            <button onClick={() => setShowPanel(false)} className="w-7 h-7 rounded-full bg-[#2a2a34] hover:bg-[#33333e] flex items-center justify-center text-zinc-400 hover:text-white transition-all">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="max-h-80 sm:max-h-96 overflow-y-auto">
            {friendRequests.length === 0 ? (
              <div className="p-6 text-center text-zinc-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">No new notifications</p>
              </div>
            ) : (
              friendRequests.map(user => (
                <div key={user._id} className="p-3 sm:p-4 border-b border-[#282832] hover:bg-[#1f1f26] transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <UserAvatar 
                      src={user.profilePic} 
                      alt={user.fullName} 
                      size="md"
                      showStatus={false}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-white text-sm">{user.fullName}</p>
                      <p className="text-xs text-zinc-500">Wants to connect</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => acceptRequest(user._id)}
                      className="flex-1 py-1.5 rounded-xl bg-emerald-600/70 hover:bg-emerald-600 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1"
                    >
                      <UserCheck className="w-3 h-3" /> Accept
                    </button>
                    <button 
                      onClick={() => rejectRequest(user._id)}
                      className="flex-1 py-1.5 rounded-xl bg-[#2a2a34] hover:bg-[#33333e] text-zinc-400 hover:text-white text-xs font-semibold transition-all"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-2 border-t border-[#282832] bg-[#1f1f26]">
            <button 
              onClick={() => { setShowPanel(false); navigate('/friends'); }}
              className="w-full py-1.5 rounded-xl bg-[#2a2a34] hover:bg-[#33333e] text-zinc-400 hover:text-white text-xs font-semibold transition-all flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-3.5 h-3.5" /> View All Chats
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;