import React, { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { axiosInstance } from '../lib/axios';
import UserAvatar from './UserAvatar';
import { useChatStore } from '../store/useChatStore';

const SearchBar = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();
  const { authUser, onlineUsers } = useAuthStore();
  const { setSelectedUser, users: chatUsers } = useChatStore();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchUsers = async () => {
      if (query.length < 2) {
        setResults([]);
        setShowResults(false);
        return;
      }
      setLoading(true);
      setShowResults(true);
      try {
        const res = await axiosInstance.get(`/users/search?q=${query}`);
        setResults(res.data);
      } catch (error) {
        console.log("Search error:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const sendFriendRequest = async (userId) => {
    try {
      await axiosInstance.post(`/users/friend-request/${userId}`);
      setResults(prev => prev.map(u => u._id === userId ? { ...u, requestSent: true } : u));
    } catch (error) {
      console.log("Error sending friend request:", error);
    }
  };

  const handleUserClick = (user) => {
    if (user.isFriend) {
      const existingUser = chatUsers.find(u => u._id === user._id);
      if (existingUser) {
        setSelectedUser(existingUser);
      } else {
        navigate(`/?userId=${user._id}`);
      }
    }
    setShowResults(false);
    setQuery("");
  };

  const handleChat = (e, user) => {
    e.stopPropagation();
    const existingUser = chatUsers.find(u => u._id === user._id);
    if (existingUser) {
      setSelectedUser(existingUser);
    } else {
      navigate(`/?userId=${user._id}`);
    }
    setShowResults(false);
    setQuery("");
  };

  return (
    <div className="relative w-full max-w-md" ref={searchRef}>
      <div className="relative">
        <input
          type="text"
          placeholder="Search friends..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          className="input input-bordered w-full pl-10 h-10"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
      </div>

      {showResults && query.length >= 1 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-base-200 border rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
          {query.length < 2 ? (
            <div className="p-4 text-center text-zinc-400 text-sm">Type at least 2 characters to search</div>
          ) : loading ? (
            <div className="p-4 text-center text-zinc-400">Searching...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-zinc-400">No users found</div>
          ) : (
            results.map(user => (
              <div 
                key={user._id} 
                className="flex items-center justify-between p-3 hover:bg-base-300 border-b last:border-0 transition-colors"
              >
                <div 
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                  onClick={() => handleUserClick(user)}
                >
                  <UserAvatar 
                    src={user.profilePic} 
                    alt={user.fullName} 
                    size="md" 
                    isOnline={onlineUsers.includes(user._id)}
                  />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{user.fullName}</p>
                    <p className="text-xs text-zinc-400 truncate">{user.email}</p>
                  </div>
                </div>
                
                {user._id !== authUser._id && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {user.isFriend ? (
                      <button
                        onClick={(e) => handleChat(e, user)}
                        className="btn btn-xs sm:btn-sm btn-primary"
                      >
                        <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Chat</span>
                      </button>
                    ) : user.requestSent ? (
                      <button
                        disabled
                        className="btn btn-xs sm:btn-sm btn-disabled btn-outline"
                      >
                        <span className="text-xs">Sent</span>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); sendFriendRequest(user._id); }}
                        className="btn btn-xs sm:btn-sm btn-success"
                      >
                        <UserPlus className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Add</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;