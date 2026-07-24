import React, { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { Trash2, X, MoreVertical, Check, CheckCheck, Clock } from "lucide-react";
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
  
  const { authUser, socket } = useAuthStore();
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
  }, [selectedUser._id, getMessages, subscribeToMessages, unSubscribeToMessages, socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, fileProgress]);

  const renderStatusTicks = (status) => {
    if (status === "sending") {
      return <Clock className="size-3 text-zinc-400 animate-pulse inline-block" title="Sending..." />;
    }
    if (status === "seen") {
      return <CheckCheck className="size-3.5 text-sky-400 inline-block" title="Seen" />;
    }
    if (status === "delivered") {
      return <CheckCheck className="size-3.5 text-zinc-300 inline-block" title="Delivered" />;
    }
    return <Check className="size-3.5 text-zinc-400 inline-block" title="Sent" />;
  };

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
      <div className="flex-1 flex flex-col h-full overflow-hidden min-h-0">
        <ChatHeader />
        <div className="flex-1 overflow-y-auto min-h-0">
          <MessageSkeleton />
        </div>
        {!selectedUser?.isDeletedAccount && <div className="shrink-0"><MessageInput /></div>}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative min-h-0 bg-[#121215]">
      <ChatHeader />
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
      >
        {messages.map((message) => {
          const isMe = message.senderId === authUser._id;
          return (
            <div 
              key={message._id} 
              className={message.isSystem ? "flex justify-center my-2 w-full" : `flex ${isMe ? "flex-row-reverse" : ""} items-end gap-2 group/msg relative`}
              onTouchStart={() => handleTouchStart(message._id)}
              onTouchEnd={handleTouchEnd}
            >
              {!message.isSystem && (
                <div className="shrink-0 size-9 rounded-full overflow-hidden">
                  <img
                    src={isMe
                      ? authUser.profilePic || DEFAULT_AVATAR
                      : selectedUser.profilePic || DEFAULT_AVATAR}
                    alt="Users Profile" />
                </div>
              )}
              <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[75%]`}>
                {message.isSystem ? (
                  <div className="px-4 py-1.5 rounded-full bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20">
                    ⚠️ {message.text}
                  </div>
                ) : (
                  <>
                    <div className='text-zinc-500 text-[10px] mb-0.5 px-1 flex items-center gap-1'>
                      <span>{message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</span>
                      {isMe && renderStatusTicks(message.status)}
                    </div>
                    {message.image ? (
                      <div className="flex flex-col gap-1">
                        <div className="relative rounded-2xl overflow-hidden shadow-md border border-[#2e2e38] group/img-container max-w-[280px] sm:max-w-[360px]">
                          <img 
                            src={message.image} 
                            alt="Attachment" 
                            className="w-full h-auto object-cover max-h-[320px] rounded-2xl" 
                          />
                          {message.fileName && (
                            <a 
                              href={message.image}
                              download={message.fileName}
                              className="absolute bottom-3 right-3 p-2.5 rounded-full bg-black/70 hover:bg-black/90 text-white transition-all shadow-md flex items-center justify-center cursor-pointer"
                              title={`Download ${message.fileName}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                              </svg>
                            </a>
                          )}
                        </div>
                        {message.text && (
                          <div className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                            isMe ? "bg-[#2563eb] text-white shadow-md" : "bg-[#24242b] text-zinc-200"
                          }`}>
                            {message.text}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        {!isMe && (
                          <button 
                            onClick={() => setActiveMessageOptions(activeMessageOptions === message._id ? null : message._id)}
                            className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-1 text-zinc-500 hover:text-white rounded-full self-end"
                            title="Options"
                          >
                            <MoreVertical size={14} />
                          </button>
                        )}
                        <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm whitespace-pre-wrap ${
                          isMe 
                            ? "bg-[#2563eb] text-white" 
                            : "bg-[#24242b] text-zinc-200"
                        }`}>
                          {message.text}
                        </div>
                        {isMe && (
                          <button 
                            onClick={() => setActiveMessageOptions(activeMessageOptions === message._id ? null : message._id)}
                            className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-1 text-zinc-500 hover:text-white rounded-full self-end"
                            title="Options"
                          >
                            <MoreVertical size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
        {isTyping && (
          <div className="flex items-end gap-2">
            <div className="shrink-0 size-9 rounded-full overflow-hidden">
              <img
                src={selectedUser.profilePic || DEFAULT_AVATAR}
                alt="User avatar"
              />
            </div>
            <div className="bg-[#24242b] px-4 py-3 rounded-2xl min-h-8 flex items-center gap-2">
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
              {(() => {
                const targetMsg = messages.find(m => m._id === activeMessageOptions);
                const isMe = targetMsg?.senderId === authUser._id;
                const hoursOld = targetMsg?.createdAt ? (new Date() - new Date(targetMsg.createdAt)) / 3600000 : 0;
                const isWithinSixHours = hoursOld < 6;

                return isMe && isWithinSixHours && (
                  <button 
                    onClick={() => {
                      deleteMessage(activeMessageOptions, true);
                      setActiveMessageOptions(null);
                    }}
                    className="w-full btn btn-sm btn-error"
                  >
                    Delete for Everyone
                  </button>
                );
              })()}
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
