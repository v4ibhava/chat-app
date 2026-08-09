import React, { useState, useEffect } from 'react';
import { MessageCircle, UserMinus, Search, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { axiosInstance } from '../lib/axios';
import { useNavigate } from 'react-router-dom';
import UserAvatar from '../components/UserAvatar';

const FriendsPage = () => {
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { authUser, checkAuth, onlineUsers } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchFriends();
  }, [authUser]);

  const fetchFriends = async () => {
    try {
      const res = await axiosInstance.get("/users/friends");
      setFriends(res.data);
    } catch (error) {
      console.log("Error fetching friends:", error);
    }
  };

  const removeFriend = async (userId) => {
    if (!window.confirm("Are you sure you want to remove this friend?")) return;
    try {
      await axiosInstance.post(`/users/remove-friend/${userId}`);
      setFriends(prev => prev.filter(f => f._id !== userId));
      checkAuth();
    } catch (error) {
      console.log("Error removing friend:", error);
    }
  };

  const filteredFriends = friends.filter(friend => {
    if (!friend) return false;
    const query = (searchQuery || "").toLowerCase();
    const fullName = (friend.fullName || "").toLowerCase();
    return fullName.includes(query);
  });

  const formatLastActive = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + 
      " at " + 
      date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-screen pt-14">
      <div className="max-w-4xl mx-auto p-3 sm:p-4 py-4 sm:py-6">
        <div className="bg-base-300 rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <button onClick={() => navigate('/')} className="btn btn-sm btn-ghost btn-circle">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl sm:text-2xl font-semibold">Friends ({friends.length})</h1>
          </div>
          
          <div className="relative mb-6">
            <input
              type="text"
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-bordered w-full pl-10"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          </div>

          {filteredFriends.length === 0 ? (
            <div className="text-center py-8 text-zinc-400 text-sm sm:text-base">
              {searchQuery ? "No friends found" : "No friends yet. Search and add friends to start chatting!"}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[65vh] overflow-y-auto p-1">
              {filteredFriends.map(friend => {
                const isOnline = onlineUsers.includes(friend._id);
                return (
                  <div 
                    key={friend._id} 
                    onClick={() => navigate(`/?userId=${friend._id}`)}
                    className="relative flex flex-col items-center p-6 bg-base-200 hover:bg-base-200/80 border border-base-100 rounded-xl transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group cursor-pointer"
                  >
                    {/* User Avatar */}
                    <div className="relative mb-4">
                      <UserAvatar
                        src={friend.profilePic}
                        alt={friend.fullName}
                        size="xl"
                        isOnline={isOnline}
                        showStatus={true}
                      />
                    </div>
                    
                    {/* User Info */}
                    <h3 className="font-semibold text-base mb-1 truncate max-w-full text-center">{friend.fullName}</h3>
                    
                    {/* Status Badge */}
                    <div className="flex items-center gap-1.5 mb-3">
                      <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-zinc-400'}`} />
                      <span className={`text-xs font-medium ${isOnline ? 'text-green-500' : 'text-zinc-500'}`}>
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>

                    {/* Last Login/Active Time */}
                    <p className="text-xs text-zinc-500 text-center mb-6 mt-auto">
                      Last active: <span className="text-zinc-400">{formatLastActive(friend.updatedAt)}</span>
                    </p>

                    {/* Action Buttons */}
                    <div className="flex gap-2 w-full mt-auto" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => navigate(`/?userId=${friend._id}`)}
                        className="btn btn-sm btn-primary flex-1 gap-1.5"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Chat
                      </button>
                      <button 
                        onClick={() => removeFriend(friend._id)}
                        className="btn btn-sm btn-outline btn-error btn-circle"
                        title="Remove Friend"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendsPage;