import React, { useRef, useState, useEffect } from 'react';
import { useChatStore } from '../store/useChatStore';
import { Image, Send, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

const MessageInput = () => {
    const [text, setText] = useState("");
    const [imagePreview, setImagePreview] = useState(null);
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

    const handleImageChange = (e) => {
      const file = e.target.files[0];
      if(!file || !file.type.startsWith("image/")){
        toast.error("Please select an image file.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result)
      };
      reader.readAsDataURL(file);
    };

    const removeImage = () => {
      setImagePreview(null)
      if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSendMessage = async (e) => {
      e.preventDefault();
      if (!text.trim() && !imagePreview) return;

      try {
        await sendMessage({
          text: text.trim(),
          image: imagePreview,
        })
        // clear form
        setText("");
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (error) {
        console.log("Failed to send message", error);
      }
    }
  return (
    <div className='p-4 w-full'>
      {imagePreview && (
        <div className='mb-3 flex items-center gap-2'>
          <div className='relative'>
          <img
          src={imagePreview}
          alt='preview'
          className='size-20 rounded-lg object-cover border border-zinc-700'/>
          <button
          onClick={removeImage}
          className='absolute -top-1.5 -right-1.5 size-5 rounded-full bg-base-300 flex items-center justify-center'>
            <X className = 'size-3' />
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
          onChange={handleTextChange} />
          <input
          type='file'
          accept='image/*'
          className='hidden'
          ref={fileInputRef}
          onChange={handleImageChange}/>
          <button 
          type='button'
          className={`hidden sm:flex btn btn-circle ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`} onClick={()=>{ fileInputRef.current?.click()}}>
            <Image size={20} />
          </button>

        </div>
        <button 
        type='submit'
        className='btn btn-sm btn-circle'
        disabled={!text.trim() && !imagePreview}>
          <Send size={22} />

        </button>

      </form>
      
    </div>
  )
}

export default MessageInput
