import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import UserAvatar from "./UserAvatar";
import { Users } from "lucide-react";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-16 lg:w-72 border-r border-base-300 flex flex-col bg-base-100">
      <div className="border-b border-base-300 w-full p-3 lg:p-5">
        <div className="flex items-center gap-2">
          <Users className="size-5 lg:size-6" />
          <span className="font-medium hidden lg:block">Contacts</span>
        </div>
        <div className="mt-2 lg:mt-3 hidden lg:flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-sm checkbox-primary"
            />
            <span className="text-sm">Online only</span>
          </label>
          <span className="text-xs text-zinc-500">({onlineUsers.length - 1})</span>
        </div>
      </div>

      <div className="overflow-y-auto w-full py-2 lg:py-3">
        {filteredUsers.map((user) => (
          <button
            key={user._id}
            onClick={() => setSelectedUser(user)}
            className={`
              w-full p-2 lg:p-3 flex items-center gap-2 lg:gap-3
              hover:bg-base-200 transition-colors
              ${selectedUser?._id === user._id ? "bg-base-200 ring-1 ring-primary/30" : ""}
            `}
          >
            <UserAvatar
                src={user.profilePic}
                alt={user.fullName}
                size="lg"
                isOnline={onlineUsers.includes(user._id)}
              />

            <div className="hidden lg:block text-left min-w-0 flex-1">
              <div className="font-medium truncate">{user.fullName}</div>
              <div className="text-xs text-green-500/80 truncate">
                {onlineUsers.includes(user._id) ? "● Online" : "○ Offline"}
              </div>
            </div>
          </button>
        ))}

        {filteredUsers.length === 0 && (
          <div className="text-center text-zinc-500 py-6 px-2">
            <p className="text-xs sm:text-sm">Search and add friends to start chatting</p>
          </div>
        )}
      </div>
    </aside>
  );
};
export default Sidebar;