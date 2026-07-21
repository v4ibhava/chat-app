import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import UserAvatar from "./UserAvatar";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore();
  const { onlineUsers } = useAuthStore();

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  if (isUsersLoading) return <SidebarSkeleton selectedUser={selectedUser} />;

  return (
    <div className="flex flex-col h-full w-full bg-base-200 border-r border-base-300 transition-colors duration-200">
      {/* Friends List */}
      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1.5">
        {users.map((user) => {
          const isSelected = selectedUser?._id === user._id;
          const isOnline = onlineUsers.includes(user._id);

          return (
            <button
              key={user._id}
              onClick={() => setSelectedUser(user)}
              className={`
                w-full p-3 flex items-center gap-3.5 rounded-2xl transition-all duration-200 text-left
                ${isSelected 
                  ? "bg-base-100 text-base-content shadow-md border border-base-300" 
                  : "hover:bg-base-100/60 text-base-content/80"}
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
                <div className="font-semibold text-sm truncate text-base-content">
                  {user.isDeletedAccount ? "Deleted User" : user.fullName}
                </div>
                {user.isDeletedAccount ? (
                  <div className="text-xs text-base-content/50 truncate">Account Deleted</div>
                ) : (
                  <div className="text-xs text-base-content/60 truncate mt-0.5 font-mono">
                    @{user.username || "user"}
                  </div>
                )}
              </div>
            </button>
          );
        })}

        {users.length === 0 && (
          <div className="text-center text-base-content/50 py-8 text-sm">No friends online</div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
