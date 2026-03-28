import React, { useState, useEffect } from 'react';
import { MessageCircle, UserMinus, Search, ArrowLeft, X } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { axiosInstance } from '../lib/axios';
import { useNavigate } from 'react-router-dom';
import UserAvatar from '../components/UserAvatar';

const FriendsPage = () => {
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFriend, setSelectedFriend] = useState(null);
  const { authUser, checkAuth } = useAuthStore();
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
    try {
      await axiosInstance.post(`/users/remove-friend/${userId}`);
      setFriends(prev => prev.filter(f => f._id !== userId));
      if (selectedFriend?._id === userId) setSelectedFriend(null);
      checkAuth();
    } catch (error) {
      console.log("Error removing friend:", error);
    }
  };

  const filteredFriends = friends.filter(friend => 
    friend.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen pt-14">
      <div className="max-w-2xl mx-auto p-3 sm:p-4 py-4 sm:py-6">
        <div className="bg-base-300 rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <button onClick={() => navigate('/')} className="btn btn-sm btn-ghost btn-circle">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl sm:text-2xl font-semibold">Friends ({friends.length})</h1>
          </div>
          
          <div className="relative mb-4">
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
            <div className="space-y-2 sm:space-y-3 max-h-[60vh] overflow-y-auto">
              {filteredFriends.map(friend => (
                <div key={friend._id} className="flex items-center justify-between p-3 sm:p-4 bg-base-200 rounded-lg gap-2">
                  <div 
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                    onClick={() => setSelectedFriend(friend)}
                  >
                    <UserAvatar
                      src={friend.profilePic}
                      alt={friend.fullName}
                      size="lg"
                      isOnline={false}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate text-sm sm:text-base">{friend.fullName}</p>
                      <p className="text-xs text-zinc-400 truncate">{friend.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 sm:gap-2 shrink-0">
                    <button 
                      onClick={() => navigate(`/?userId=${friend._id}`)}
                      className="btn btn-sm btn-primary"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">Chat</span>
                    </button>
                    <button 
                      onClick={() => setSelectedFriend(friend)}
                      className="btn btn-sm btn-ghost btn-circle"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedFriend && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedFriend(null)} />
          <div className="relative bg-base-100 w-full sm:max-w-sm rounded-t-2xl sm:rounded-xl p-4 sm:p-6 animate-slide-up">
            <button 
              onClick={() => setSelectedFriend(null)} 
              className="absolute top-4 right-4 btn btn-sm btn-ghost btn-circle"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex flex-col items-center text-center">
              <img 
                src={selectedFriend.profilePic || "/avatar.png"} 
                alt={selectedFriend.fullName} 
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover mb-4 ring-4 ring-base-300" 
              />
              <h2 className="text-xl font-semibold">{selectedFriend.fullName}</h2>
              <p className="text-sm text-zinc-400 mb-2">{selectedFriend.email}</p>
              <p className="text-xs text-green-500 flex items-center gap-1 mb-6">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span> Online
              </p>
              
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => { navigate(`/?userId=${selectedFriend._id}`); setSelectedFriend(null); }}
                  className="btn btn-primary flex-1"
                >
                  <MessageCircle className="w-4 h-4" /> Chat
                </button>
                <button 
                  onClick={() => removeFriend(selectedFriend._id)}
                  className="btn btn-error btn-outline flex-1"
                >
                  <UserMinus className="w-4 h-4" /> Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FriendsPage;