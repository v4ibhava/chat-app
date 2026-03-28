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

  useEffect(() => {
    if (authUser) {
      fetchFriendRequests();
      const interval = setInterval(fetchFriendRequests, 10000);
      return () => clearInterval(interval);
    }
  }, [authUser]);

  useEffect(() => {
    if (friendRequests.length > prevCount && prevCount > 0) {
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
        className="btn btn-ghost btn-sm btn-circle relative"
      >
        <Bell className="w-5 h-5" />
        {friendRequests.length > 0 && (
          <span className="absolute -top-1 -right-1 badge badge-primary badge-xs animate-pulse">
            {friendRequests.length}
          </span>
        )}
      </button>

      {showPanel && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-base-100 border border-base-300 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-3 border-b border-base-300 flex justify-between items-center bg-base-200">
            <h3 className="font-semibold flex items-center gap-2">
              <Bell className="w-4 h-4" /> Notifications
            </h3>
            <button onClick={() => setShowPanel(false)} className="btn btn-ghost btn-xs btn-circle">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-80 sm:max-h-96 overflow-y-auto">
            {friendRequests.length === 0 ? (
              <div className="p-6 text-center text-zinc-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No new notifications</p>
              </div>
            ) : (
              friendRequests.map(user => (
                <div key={user._id} className="p-3 sm:p-4 border-b border-base-300 hover:bg-base-200 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <UserAvatar 
                      src={user.profilePic} 
                      alt={user.fullName} 
                      size="md"
                      showStatus={false}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.fullName}</p>
                      <p className="text-xs text-zinc-500">Wants to connect</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => acceptRequest(user._id)}
                      className="btn btn-sm btn-success flex-1 gap-1"
                    >
                      <UserCheck className="w-3 h-3" /> Accept
                    </button>
                    <button 
                      onClick={() => rejectRequest(user._id)}
                      className="btn btn-sm btn-ghost flex-1"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-2 border-t border-base-300 bg-base-200">
            <button 
              onClick={() => { setShowPanel(false); navigate('/friends'); }}
              className="btn btn-sm btn-ghost w-full gap-2"
            >
              <MessageSquare className="w-4 h-4" /> View All Chats
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;