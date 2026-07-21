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
          className="w-full pl-10 h-10 bg-[#1a1a20] border-none text-xs text-zinc-200 placeholder-zinc-500 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
      </div>

      {showResults && query.length >= 1 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#18181c] border border-[#282832] rounded-2xl shadow-2xl z-50 max-h-96 overflow-y-auto">
          {query.length < 2 ? (
            <div className="p-4 text-center text-zinc-500 text-xs">Type at least 2 characters to search</div>
          ) : loading ? (
            <div className="p-4 text-center text-zinc-500 text-xs">Searching...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-zinc-500 text-xs">No users found</div>
          ) : (
            results.map(user => (
              <div 
                key={user._id} 
                className="flex items-center justify-between p-3 hover:bg-[#1f1f26] border-b border-[#282832] last:border-0 transition-colors"
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
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium truncate text-white text-sm">{user.fullName}</p>
                      {user.username && (
                        <span className="text-xs text-zinc-500 font-normal">@{user.username}</span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                  </div>
                </div>
                
                {user._id !== authUser._id && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {user.isFriend ? (
                      <button
                        onClick={(e) => handleChat(e, user)}
                        className="px-3 py-1.5 rounded-xl bg-primary/80 hover:bg-primary text-white text-xs font-semibold transition-all flex items-center gap-1"
                      >
                        <MessageCircle className="w-3 h-3" />
                        Chat
                      </button>
                    ) : user.requestSent ? (
                      <button
                        disabled
                        className="px-3 py-1.5 rounded-xl bg-[#2a2a34] text-zinc-500 text-xs font-semibold cursor-not-allowed"
                      >
                        Sent
                      </button>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); sendFriendRequest(user._id); }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600/70 hover:bg-emerald-600 text-white text-xs font-semibold transition-all flex items-center gap-1"
                      >
                        <UserPlus className="w-3 h-3" />
                        Add
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