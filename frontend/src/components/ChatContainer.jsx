import React, { useEffect, useRef } from "react";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";


const ChatContainer = () => {
  const { messages, getMessages, isMessagesLoading, selectedUser, subscribeToMessages, unSubscribeToMessages, isTyping } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    getMessages(selectedUser._id);
    subscribeToMessages();
    return () => unSubscribeToMessages();
  }, [selectedUser._id, getMessages, subscribeToMessages, unSubscribeToMessages]);

  // Scroll to bottom when messages change or typing status changes
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message._id} className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}>
            <div className="chat-image avatar">
              <div className="size-10 rounded-full">
                <img
                  src={message.senderId === authUser._id
                    ? authUser.profilePic || "/avatar.png"
                    : selectedUser.profilePic || "/avatar.png"}
                  alt="Users Profile" />
              </div>
            </div>
            <div className='chat-header mb-1'>
              <time className='text-xs opacity-50 ml-1'>
                {message.createdAt.split("T")[1].slice(0, 5)}
              </time>
            </div>
            <div className='chat-bubble flex'>
              {message.image && (
                <img src={message.image}
                  alt="Attachment"
                  className='max-w-[200px] h-auto rounded-lg' />
              )}
              {message.text && <p>{message.text}</p>}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="chat chat-start">
            <div className="chat-image avatar">
              <div className="size-10 rounded-full">
                <img
                  src={selectedUser.profilePic || "/avatar.png"}
                  alt="User avatar"
                />
              </div>
            </div>
            <div className="chat-bubble min-h-8 flex items-center gap-2">
              <div className="loading loading-dots loading-sm"></div>
            </div>
          </div>
        )}
        <div ref={messageEndRef} />
      </div>
      <MessageInput />
    </div>
  );
}

export default ChatContainer
