import React, { useRef, useState, useEffect } from 'react';
import { useChatStore } from '../store/useChatStore';
import { Paperclip, Send, X } from 'lucide-react';

const MessageInput = () => {
    const [text, setText] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const fileInputRef = useRef(null);
    const { sendMessage, selectedUser, handleTyping, handleStopTyping } = useChatStore();
    const typingTimeoutRef = useRef(null);

    const handleTextChange = (e) => {
        setText(e.target.value);
        
        // Emit typing event
        handleTyping(selectedUser._id);

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Set new timeout
        typingTimeoutRef.current = setTimeout(() => {
            handleStopTyping(selectedUser._id);
        }, 2000);
    };

    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, []);

    const handleFileChange = (e) => {
      const file = e.target.files[0];
      if(!file) return;

      setSelectedFile(file);

      // Create local image preview if it is an image
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    };

    const removeFile = () => {
      setSelectedFile(null);
      setFilePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSendMessage = async (e) => {
      e.preventDefault();
      if (!text.trim() && !selectedFile) return;

      // Stop typing indicator when sending
      handleStopTyping(selectedUser._id);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      try {
        if (selectedFile) {
          await sendMessage({
            file: selectedFile,
            text: text.trim()
          });
        } else {
          await sendMessage({
            text: text.trim()
          });
        }
        // clear form
        setText("");
        removeFile();
      } catch (error) {
        console.log("Failed to send message", error);
      }
    }

  return (
    <div className='p-4 w-full border-t border-base-300'>
      {selectedFile && (
        <div className='mb-3 flex items-center gap-2'>
          <div className='relative bg-base-200 border border-base-300 rounded-xl p-3 flex items-center gap-3 pr-8 max-w-[280px]'>
            {selectedFile.type.startsWith("image/") && filePreview ? (
              <img
                src={filePreview}
                alt='preview'
                className='size-14 rounded-lg object-cover border border-zinc-700'
              />
            ) : (
              <div className="size-14 bg-base-300 rounded-lg flex items-center justify-center text-lg select-none">
                📄
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate text-base-content">{selectedFile.name}</p>
              <p className="text-[10px] text-zinc-500">
                {selectedFile.size > 1024 * 1024 
                  ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` 
                  : `${Math.round(selectedFile.size / 1024)} KB`}
              </p>
            </div>
            <button
              type="button"
              onClick={removeFile}
              className='absolute -top-1.5 -right-1.5 size-5 rounded-full bg-base-300 flex items-center justify-center hover:bg-base-200 border border-base-300'
            >
              <X className='size-3' />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className='flex items-center gap-2'>
        <div className='flex-1 flex gap-2'>
          <input
            type='text'
            placeholder='Type a message...'
            className='w-full input input-border rounded-lg input-sm sm:input-md'
            value={text}
            onChange={handleTextChange} 
          />
          <input
            type='file'
            className='hidden'
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <button 
            type='button'
            className={`flex btn btn-circle ${selectedFile ? "text-primary" : "text-zinc-400"}`} 
            onClick={() => { fileInputRef.current?.click() }}
          >
            <Paperclip size={20} />
          </button>
        </div>
        <button 
          type='submit'
          className='btn btn-sm btn-circle'
          disabled={!text.trim() && !selectedFile}
        >
          <Send size={22} />
        </button>
      </form>
    </div>
  )
}

export default MessageInput;
