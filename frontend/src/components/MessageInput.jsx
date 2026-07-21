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
        
        handleTyping(selectedUser._id);

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

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
        setText("");
        removeFile();
      } catch (error) {
        console.log("Failed to send message", error);
      }
    }

  return (
    <div className='p-4 w-full border-t border-[#1e1e24] bg-[#121215]'>
      {selectedFile && (
        <div className='mb-3 flex items-center gap-2'>
          <div className='relative bg-[#1a1a20] border border-[#2e2e38] rounded-2xl p-3 flex items-center gap-3 pr-8 max-w-[280px]'>
            {selectedFile.type.startsWith("image/") && filePreview ? (
              <img
                src={filePreview}
                alt='preview'
                className='size-14 rounded-xl object-cover border border-zinc-700'
              />
            ) : (
              <div className="size-14 bg-[#262630] rounded-xl flex items-center justify-center text-lg select-none">
                📄
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate text-white">{selectedFile.name}</p>
              <p className="text-[10px] text-zinc-400">
                {selectedFile.size > 1024 * 1024 
                  ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` 
                  : `${Math.round(selectedFile.size / 1024)} KB`}
              </p>
            </div>
            <button
              type="button"
              onClick={removeFile}
              className='absolute -top-1.5 -right-1.5 size-5 rounded-full bg-[#2a2a34] text-zinc-300 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors'
            >
              <X className='size-3' />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className='flex items-center gap-3'>
        <button 
          type='button'
          className={`p-2.5 rounded-full hover:bg-[#1f1f26] transition-colors shrink-0 ${selectedFile ? "text-blue-400" : "text-zinc-400"}`} 
          onClick={() => { fileInputRef.current?.click() }}
          title="Attach File"
        >
          <Paperclip className="w-5 h-5" />
        </button>
        
        <input
          type='file'
          className='hidden'
          ref={fileInputRef}
          onChange={handleFileChange}
        />

        <div className='flex-1 relative'>
          <input
            type='text'
            placeholder='Type a message...'
            className='w-full bg-[#1a1a20] text-white text-sm placeholder-zinc-500 rounded-full px-5 py-3 focus:outline-none focus:ring-1 focus:ring-blue-500/50'
            value={text}
            onChange={handleTextChange} 
          />
        </div>

        <button 
          type='submit'
          className='p-3.5 rounded-full bg-[#2563eb] hover:bg-blue-600 text-white transition-all shadow-md shrink-0 disabled:opacity-40 disabled:hover:bg-[#2563eb]'
          disabled={!text.trim() && !selectedFile}
          title="Send"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}

export default MessageInput;
