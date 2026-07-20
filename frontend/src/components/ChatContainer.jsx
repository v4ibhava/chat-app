import React, { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { Trash2, X, MoreVertical } from "lucide-react";
import { DEFAULT_AVATAR } from "../constants";

const ChatContainer = () => {
  const { 
    messages, 
    getMessages, 
    isMessagesLoading, 
    selectedUser, 
    subscribeToMessages, 
    unSubscribeToMessages, 
    isTyping, 
    deleteMessage, 
    fileProgress 
  } = useChatStore();
  
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const [activeMessageOptions, setActiveMessageOptions] = useState(null); // messageId
  const longPressTimeout = useRef(null);

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    getMessages(selectedUser._id);
    subscribeToMessages();
    return () => unSubscribeToMessages();
  }, [selectedUser._id, getMessages, subscribeToMessages, unSubscribeToMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, fileProgress]);

  // Touch Long-Press Handlers
  const handleTouchStart = (messageId) => {
    longPressTimeout.current = setTimeout(() => {
      setActiveMessageOptions(messageId);
    }, 700); // 700ms hold trigger
  };

  const handleTouchEnd = () => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
    }
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <ChatHeader />
        <div className="flex-1 overflow-y-auto">
          <MessageSkeleton />
        </div>
        {!selectedUser?.isDeletedAccount && <MessageInput />}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      <ChatHeader />
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.map((message) => {
          const isMe = message.senderId === authUser._id;
          return (
            <div 
              key={message._id} 
              className={message.isSystem ? "flex justify-center my-2 w-full" : `chat ${isMe ? "chat-end" : "chat-start"} group/msg relative`}
              onTouchStart={() => handleTouchStart(message._id)}
              onTouchEnd={handleTouchEnd}
            >
              {!message.isSystem && (
                <div className="chat-image avatar">
                  <div className="size-10 rounded-full">
                    <img
                      src={isMe
                        ? authUser.profilePic || DEFAULT_AVATAR
                        : selectedUser.profilePic || DEFAULT_AVATAR}
                      alt="Users Profile" />
                  </div>
                </div>
              )}
              {!message.isSystem && (
                <div className='chat-header mb-1'>
                  <time className='text-xs opacity-50 ml-1'>
                    {message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                  </time>
                </div>
              )}
              {message.isSystem ? (
                <div className="px-4 py-1.5 rounded-full bg-red-500/10 text-red-500 text-xs font-medium border border-red-500/20">
                  ⚠️ {message.text}
                </div>
              ) : message.image ? (
                /* Premium image message layout (no blocky solid bubble) */
                <div className="flex flex-col items-start gap-1 relative">
                  <div className="relative rounded-2xl overflow-hidden shadow-md border border-base-300/50 hover:shadow-lg transition-shadow group/img-container max-w-[280px] sm:max-w-[360px]">
                    <img 
                      src={message.image} 
                      alt="Attachment" 
                      className="w-full h-auto object-cover max-h-[320px] rounded-2xl" 
                    />
                    {message.fileName && (
                      <a 
                        href={message.image}
                        download={message.fileName}
                        className="absolute bottom-3 right-3 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all shadow-md flex items-center justify-center cursor-pointer"
                        title={`Download ${message.fileName}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                      </a>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 max-w-full">
                    <div className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                      isMe 
                        ? "bg-primary text-primary-content rounded-tr-none" 
                        : "bg-base-200 text-base-content rounded-tl-none"
                    }`}>
                      {message.text}
                    </div>
                    <button 
                      onClick={() => setActiveMessageOptions(message._id)}
                      className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-1 rounded-full hover:bg-base-300 shrink-0"
                      title="Options"
                    >
                      <MoreVertical className="w-4 h-4 text-zinc-400" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Standard chat bubble for text or files */
                <div className="chat-bubble flex items-center gap-2.5 relative">
                  <div className="flex-1 min-w-0">
                    {message.text && <p className="whitespace-pre-wrap text-sm sm:text-base">{message.text}</p>}
                    {message.fileName && (
                      <div className="flex items-center gap-2.5 p-2 bg-base-300/40 rounded-xl text-xs mt-1.5 border border-base-300/30">
                        <span className="font-semibold truncate max-w-[150px]">{message.fileName}</span>
                        <span className="opacity-60">({Math.round(message.fileSize / 1024)} KB)</span>
                        <a 
                          href={message.fileBlob ? URL.createObjectURL(message.fileBlob) : "#"}
                          download={message.fileName}
                          className="text-primary hover:underline font-bold ml-auto shrink-0"
                        >
                          Download
                        </a>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => setActiveMessageOptions(message._id)}
                    className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-1 rounded-full hover:bg-base-300/30 shrink-0"
                    title="Options"
                  >
                    <MoreVertical className="w-4 h-4 text-zinc-300" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {isTyping && (
          <div className="chat chat-start">
            <div className="chat-image avatar">
              <div className="size-10 rounded-full">
                <img
                  src={selectedUser.profilePic || DEFAULT_AVATAR}
                  alt="User avatar"
                />
              </div>
            </div>
            <div className="chat-bubble min-h-8 flex items-center gap-2">
              <div className="loading loading-dots loading-sm"></div>
            </div>
          </div>
        )}
        
        {fileProgress && fileProgress.peerId === selectedUser?._id && (
          <div className="flex items-center bg-base-200/90 backdrop-blur border border-base-300 rounded-2xl p-3 max-w-sm mx-auto space-x-3 text-xs animate-slide-up shadow-md">
            <div className="animate-pulse w-2.5 h-2.5 rounded-full bg-primary shrink-0"></div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">
                {fileProgress.type === "send" ? "Sending" : "Receiving"} {fileProgress.fileName}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-base-300 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-300" 
                    style={{ width: `${fileProgress.progress}%` }}
                  ></div>
                </div>
                <span className="font-bold text-primary shrink-0">{fileProgress.progress}%</span>
              </div>
            </div>
            <button 
              onClick={() => useChatStore.getState().cancelFileTransfer()}
              className="btn btn-xs btn-circle btn-ghost text-red-500 hover:bg-red-500/10 shrink-0"
              title="Stop Transfer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div ref={messageEndRef} />
      </div>

      {/* Delete Confirmation Context Modal */}
      {activeMessageOptions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setActiveMessageOptions(null)} />
          <div className="relative w-full max-w-xs bg-base-200 border border-base-300 rounded-2xl p-5 shadow-2xl animate-fade-in text-center">
            <h4 className="font-bold text-sm mb-4">Delete Message</h4>
            <div className="space-y-2">
              {messages.find(m => m._id === activeMessageOptions)?.senderId === authUser._id && (
                <button 
                  onClick={() => {
                    deleteMessage(activeMessageOptions, true);
                    setActiveMessageOptions(null);
                  }}
                  className="w-full btn btn-sm btn-error"
                >
                  Delete for Everyone
                </button>
              )}
              <button 
                onClick={() => {
                  deleteMessage(activeMessageOptions, false);
                  setActiveMessageOptions(null);
                }}
                className="w-full btn btn-sm btn-outline btn-error"
              >
                Delete for Me
              </button>
              <button 
                onClick={() => setActiveMessageOptions(null)}
                className="w-full btn btn-sm btn-ghost mt-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedUser?.isDeletedAccount ? (
        <div className="p-5 text-center bg-base-200 text-zinc-500 text-sm border-t border-base-300 font-medium shrink-0">
          This user has deleted their account.
        </div>
      ) : (
        <div className="shrink-0">
          <MessageInput />
        </div>
      )}
    </div>
  );
}

export default ChatContainer;
