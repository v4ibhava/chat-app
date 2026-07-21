import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import UserAvatar from "./UserAvatar";
import { Search } from "lucide-react";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  if (isUsersLoading) return <SidebarSkeleton selectedUser={selectedUser} />;

  const filteredUsers = users.filter(user =>
    user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full w-full">
      {/* Search Input */}
      <div className="p-2 border-b border-base-300">
        <div className="relative">
          <input
            type="text"
            placeholder="Filter friends..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input input-xs sm:input-sm input-bordered w-full pl-8 text-xs bg-base-200/50 focus:bg-base-100"
          />
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
        </div>
      </div>

      {/* Friends List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredUsers.map((user) => {
          const isSelected = selectedUser?._id === user._id;
          const isOnline = onlineUsers.includes(user._id);

          return (
            <button
              key={user._id}
              onClick={() => setSelectedUser(user)}
              className={`
                w-full p-2.5 flex items-center gap-3 rounded-xl transition-all duration-200 text-left
                ${isSelected 
                  ? "bg-primary/10 text-primary font-medium ring-1 ring-primary/20 shadow-sm" 
                  : "hover:bg-base-200/70 text-base-content"}
              `}
            >
              <UserAvatar
                src={user.profilePic}
                alt={user.fullName}
                size="md"
                isOnline={isOnline}
                showStatus={!user.isDeletedAccount}
              />

              <div className="hidden lg:block min-w-0 flex-1">
                <div className="font-semibold text-sm truncate">
                  {user.isDeletedAccount ? "Deleted User" : user.fullName}
                </div>
                {user.isDeletedAccount ? (
                  <div className="text-xs text-zinc-500 truncate">Account Deleted</div>
                ) : (
                  <div className="flex items-center justify-between text-xs text-zinc-400 mt-0.5">
                    <span className="truncate">@{user.username || "user"}</span>
                    {isOnline && (
                      <span className="text-[10px] text-green-500 font-semibold shrink-0">Online</span>
                    )}
                  </div>
                )}
              </div>
            </button>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="text-center text-zinc-500 py-8 px-2">
            <p className="text-xs">
              {searchTerm ? "No matching friends found" : "No friends added yet"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;