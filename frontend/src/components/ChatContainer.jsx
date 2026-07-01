import React, { useEffect, useRef, useCallback } from "react";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { Trash2 } from "lucide-react";
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

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        {!selectedUser?.isDeletedAccount && <MessageInput />}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.map((message) => (
          <div key={message._id} className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"} group/msg relative`}>
            <div className="chat-image avatar">
              <div className="size-10 rounded-full">
                <img
                  src={message.senderId === authUser._id
                    ? authUser.profilePic || DEFAULT_AVATAR
                    : selectedUser.profilePic || DEFAULT_AVATAR}
                  alt="Users Profile" />
              </div>
            </div>
            <div className='chat-header mb-1'>
              <time className='text-xs opacity-50 ml-1'>
                {message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
              </time>
            </div>
            <div className='chat-bubble flex items-center gap-2.5 relative'>
              <div className="flex-1 min-w-0">
                {message.image && (
                  <img src={message.image}
                    alt="Attachment"
                    className='max-w-[200px] h-auto rounded-lg mb-1' />
                )}
                {message.text && <p className="whitespace-pre-wrap">{message.text}</p>}
                {message.fileName && (
                  <div className="flex items-center gap-2 p-2 bg-base-300/40 rounded-lg text-xs mt-1">
                    <span className="font-semibold truncate max-w-[150px]">{message.fileName}</span>
                    <span className="opacity-60">({Math.round(message.fileSize / 1024)} KB)</span>
                    <a 
                      href={message.image || (message.fileBlob ? URL.createObjectURL(message.fileBlob) : "#")}
                      download={message.fileName}
                      className="text-primary hover:underline font-semibold"
                    >
                      Download
                    </a>
                  </div>
                )}
              </div>
              {message.senderId === authUser._id && (
                <button 
                  onClick={() => deleteMessage(message._id)}
                  className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-1.5 rounded-full text-zinc-400 hover:text-red-500 hover:bg-base-300/80 shrink-0"
                  title="Delete message"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
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
        
        {fileProgress && (
          <div className="flex items-center bg-base-200 border border-base-300 rounded-2xl p-3 max-w-sm mx-auto space-x-3 text-xs animate-slide-up">
            <div className="animate-pulse w-2.5 h-2.5 rounded-full bg-primary"></div>
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
          </div>
        )}

        <div ref={messageEndRef} />
      </div>

      {selectedUser?.isDeletedAccount ? (
        <div className="p-5 text-center bg-base-200 text-zinc-500 text-sm border-t border-base-300 font-medium">
          This user has deleted their account.
        </div>
      ) : (
        <MessageInput />
      )}
    </div>
  );
}

export default ChatContainer;
