import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import UserAvatar from "./UserAvatar";
import { Search, SquarePen } from "lucide-react";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  if (isUsersLoading) return <SidebarSkeleton selectedUser={selectedUser} />;

  const filteredUsers = users.filter(user => {
    if (!user) return false;
    const term = (searchTerm || "").toLowerCase();
    const fullName = (user.fullName || "").toLowerCase();
    const username = (user.username || "").toLowerCase();
    return fullName.includes(term) || username.includes(term);
  });

  return (
    <div className="flex flex-col h-full w-full bg-[#121215] border-r border-[#1e1e24]">
      {/* Header with Title & Action */}
      <div className="p-4 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-white hidden lg:block">Zync</h1>
        <button className="btn btn-sm btn-ghost btn-circle text-zinc-400 hover:text-white hidden lg:flex" title="New Chat">
          <SquarePen className="w-5 h-5" />
        </button>
      </div>

      {/* Filter / Search Input */}
      <div className="px-3 pb-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Filter friends..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input input-sm w-full pl-9 bg-[#1a1a20] border-none text-xs text-zinc-200 placeholder-zinc-500 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        </div>
      </div>

      {/* Friends List */}
      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1.5">
        {filteredUsers.map((user) => {
          const isSelected = selectedUser?._id === user._id;
          const isOnline = onlineUsers.includes(user._id);

          return (
            <button
              key={user._id}
              onClick={() => setSelectedUser(user)}
              className={`
                w-full p-3 flex items-center gap-3.5 rounded-2xl transition-all duration-200 text-left
                ${isSelected 
                  ? "bg-[#22222a] text-white shadow-md border border-[#2e2e38]" 
                  : "hover:bg-[#1a1a20] text-zinc-300"}
              `}
            >
              <UserAvatar
                src={user.profilePic}
                alt={user.fullName}
                size="lg"
                isOnline={isOnline}
                showStatus={!user.isDeletedAccount}
              />

              <div className="block md:hidden lg:block min-w-0 flex-1">
                <div className="font-semibold text-sm truncate text-white">
                  {user.isDeletedAccount ? "Deleted User" : user.fullName}
                </div>
                {user.isDeletedAccount ? (
                  <div className="text-xs text-zinc-500 truncate">Account Deleted</div>
                ) : (
                  <div className="text-xs text-zinc-400 truncate mt-0.5 font-mono">
                    @{user.username || "user"}
                  </div>
                )}
              </div>
            </button>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="text-center text-zinc-500 py-10 px-2">
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
