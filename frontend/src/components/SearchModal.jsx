import React, { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, MessageCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { axiosInstance } from '../lib/axios';
import UserAvatar from './UserAvatar';
import { useChatStore } from '../store/useChatStore';

const SearchModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { authUser, onlineUsers } = useAuthStore();
  const { setSelectedUser, users: chatUsers } = useChatStore();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const searchUsers = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
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

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

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
    onClose();
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
    onClose();
    setQuery("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative pt-20 px-4">
        <div className="max-w-md mx-auto relative">
          <button 
            onClick={onClose}
            className="absolute -top-2 right-0 btn btn-sm btn-ghost btn-circle"
          >
            <X className="w-5 h-5" />
          </button>
          
          <input
            ref={inputRef}
            type="text"
            placeholder="Search friends..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input input-lg w-full pl-12 bg-base-100 border-base-300 shadow-xl text-lg"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
        </div>

        {query.length >= 2 && (
          <div className="mt-2 bg-base-100 border border-base-300 rounded-lg shadow-2xl max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-zinc-400">Searching...</div>
            ) : results.length === 0 ? (
              <div className="p-6 text-center text-zinc-400">No users found</div>
            ) : (
              results.map(user => (
                <div 
                  key={user._id} 
                  className="flex items-center justify-between p-4 hover:bg-base-200 transition-colors border-b border-base-300 last:border-0"
                >
                  <div 
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                    onClick={() => handleUserClick(user)}
                  >
                    <UserAvatar 
                      src={user.profilePic} 
                      alt={user.fullName} 
                      size="lg"
                      isOnline={onlineUsers.includes(user._id)}
                    />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{user.fullName}</p>
                      <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  
                  {user._id !== authUser._id && (
                    <div className="flex items-center gap-2 shrink-0">
                      {user.isFriend ? (
                        <button
                          onClick={(e) => handleChat(e, user)}
                          className="btn btn-sm btn-primary"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Chat
                        </button>
                      ) : user.requestSent ? (
                        <button
                          disabled
                          className="btn btn-sm btn-disabled btn-outline"
                        >
                          Sent
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); sendFriendRequest(user._id); }}
                          className="btn btn-sm btn-success"
                        >
                          <UserPlus className="w-4 h-4" />
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
    </div>
  );
};

export default SearchModal;