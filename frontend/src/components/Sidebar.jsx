import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import UserAvatar from "./UserAvatar";
import { Users } from "lucide-react";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore();
  const { onlineUsers } = useAuthStore();

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  if (isUsersLoading) return <SidebarSkeleton selectedUser={selectedUser} />;

  return (
    <aside className={`h-full border-r border-base-300 flex flex-col bg-base-100 transition-all duration-200
      ${selectedUser ? "hidden md:flex" : "w-full md:flex"} md:w-16 lg:w-72`}>
      <div className="border-b border-base-300 w-full p-3 lg:p-5">
        <div className="flex items-center gap-2">
          <Users className="size-5 lg:size-6" />
          <span className="font-medium block md:hidden lg:block">Friends</span>
        </div>
      </div>

      <div className="overflow-y-auto w-full py-2 lg:py-3">
        {users.map((user) => (
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
                showStatus={!user.isDeletedAccount}
              />

            <div className="block md:hidden lg:block text-left min-w-0 flex-1">
              <div className="font-medium truncate">{user.isDeletedAccount ? "Deleted User" : user.fullName}</div>
              {user.isDeletedAccount ? (
                <div className="text-xs text-zinc-500 truncate">Account Deleted</div>
              ) : (
                user.username && (
                  <div className="text-xs text-zinc-400 truncate">@{user.username}</div>
                )
              )}
            </div>
          </button>
        ))}

        {users.length === 0 && (
          <div className="text-center text-zinc-500 py-6 px-2">
            <p className="text-xs sm:text-sm">Search and add friends to start chatting</p>
          </div>
        )}
      </div>
    </aside>
  );
};
export default Sidebar;