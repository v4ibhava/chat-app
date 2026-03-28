import React from 'react';

const UserAvatar = ({ src, alt, size = "md", isOnline = false, showStatus = true, className = "" }) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
    "2xl": "w-24 h-24"
  };

  const dotSizes = {
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5",
    lg: "w-3 h-3",
    xl: "w-4 h-4",
    "2xl": "w-5 h-5"
  };

  const ringSizes = {
    sm: "ring-1",
    md: "ring-2", 
    lg: "ring-2",
    xl: "ring-2",
    "2xl": "ring-4"
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <img
        src={src || "/avatar.png"}
        alt={alt}
        className={`${sizeClasses[size]} object-cover rounded-full ${ringSizes[size]} ring-base-300`}
      />
      {showStatus && (
        <span 
          className={`absolute bottom-0.5 right-0.5 ${dotSizes[size]} rounded-full border-2 border-base-100 shrink-0
            ${isOnline 
              ? "bg-green-500 shadow-md shadow-green-500/60" 
              : "bg-zinc-500"
            }`}
        />
      )}
    </div>
  );
};

export default UserAvatar;