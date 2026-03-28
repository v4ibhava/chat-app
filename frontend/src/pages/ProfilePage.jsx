import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Camera, Mail, User, Calendar, Shield, Clock, Sparkles } from 'lucide-react';
import UserAvatar from '../components/UserAvatar';

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsLoaded(true), 100);
  }, []);

  const getDaysSince = (dateString) => {
    if (!dateString) return "Unknown";
    const created = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - created);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1 ? "1 day" : `${diffDays} days`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64Image = reader.result;
      setSelectedImg(base64Image);
      updateProfile({ profilePic: base64Image });
    };
  };

  const infoCards = [
    {
      icon: <Calendar className="w-5 h-5" />,
      label: "Member Since",
      value: formatDate(authUser?.createdAt),
      color: "text-blue-400"
    },
    {
      icon: <Clock className="w-5 h-5" />,
      label: "Days on Zync",
      value: getDaysSince(authUser?.createdAt),
      color: "text-purple-400",
      highlight: true
    },
    {
      icon: <Shield className="w-5 h-5" />,
      label: "Account Status",
      value: "Active",
      color: "text-green-400"
    }
  ];

  return (
    <div className="min-h-screen pt-16 pb-8 px-3 sm:px-4">
      <div className="max-w-lg mx-auto">
        <div className={`relative overflow-hidden bg-gradient-to-br from-base-300 via-base-300 to-base-200 rounded-3xl p-6 sm:p-8 space-y-6 transition-all duration-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 opacity-50 blur-3xl"></div>
          
          <div className="text-center relative">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-full text-primary text-xs font-medium mb-3">
              <Sparkles className="w-3 h-3" />
              <span>Your Profile</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-base-content to-base-content/70 bg-clip-text text-transparent">
              {authUser?.fullName}
            </h1>
          </div>

          <div className="flex flex-col items-center gap-4 relative">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-primary rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500"></div>
              <div className="relative">
                <UserAvatar
                  src={selectedImg || authUser?.profilePic}
                  alt={authUser?.fullName}
                  size="2xl"
                  showStatus={false}
                  className="transform group-hover:scale-105 transition-transform duration-300"
                />
                <label
                  htmlFor="avatar-upload"
                  className={`absolute bottom-1 right-1 p-2.5 sm:p-3 rounded-full bg-primary cursor-pointer hover:bg-primary/90 transition-all duration-200 hover:scale-110 shadow-lg shadow-primary/30 ${isUpdatingProfile ? "animate-pulse pointer-events-none" : "group-hover:scale-110"}`}
                >
                  {isUpdatingProfile ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    <Camera className="w-5 h-5 text-primary-content" />
                  )}
                  <input
                    type="file"
                    id="avatar-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUpdatingProfile}
                  />
                </label>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400">
              {isUpdatingProfile ? "Uploading your photo..." : "Tap the camera icon to update your photo"}
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-base-200/50 backdrop-blur-sm rounded-2xl p-4 sm:p-5 space-y-4 border border-base-300/50">
              <div className="flex items-center gap-2 text-base-content/60 text-sm font-medium">
                <User className="w-4 h-4" />
                <span>Personal Info</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-base-100/50 rounded-xl hover:bg-base-100/70 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Full Name</p>
                      <p className="font-medium text-sm sm:text-base">{authUser?.fullName}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-base-100/50 rounded-xl hover:bg-base-100/70 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-secondary/10 rounded-lg">
                      <Mail className="w-4 h-4 text-secondary" />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Email Address</p>
                      <p className="font-medium text-sm sm:text-base truncate max-w-[200px]">{authUser?.email}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-base-200/50 backdrop-blur-sm rounded-2xl p-4 sm:p-5 space-y-3 border border-base-300/50">
              <div className="flex items-center gap-2 text-base-content/60 text-sm font-medium">
                <Shield className="w-4 h-4" />
                <span>Account Information</span>
              </div>
              
              <div className="grid gap-2">
                {infoCards.map((card, index) => (
                  <div 
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-xl transition-all duration-300 hover:bg-base-100/50 ${card.highlight ? 'bg-primary/5 border border-primary/20' : 'bg-base-100/30 border border-transparent'}`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${card.color.replace('text-', 'bg-')}/10`}>
                        {card.icon}
                      </div>
                      <span className="text-sm text-zinc-400">{card.label}</span>
                    </div>
                    <span className={`font-semibold text-sm ${card.highlight ? 'text-primary' : card.color.replace('text-', 'text-')}`}>
                      {card.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 text-center">
            <p className="text-xs text-zinc-500">Zync Chat Application</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;