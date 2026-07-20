import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import ChatContainer from "../components/ChatContainer";
import GroupChatView from "../components/GroupChatView";
import NoChatSelected from "../components/NoChatSelected";
import Sidebar from "../components/Sidebar";
import CreateGroupModal from "../components/CreateGroupModal";
import { Users, FolderPlus } from "lucide-react";

const HomePage = () => {
  const { selectedUser, setSelectedUser, users } = useChatStore();
  const { selectedGroup, setSelectedGroup, getGroups, groups, createGroup, subscribeToGroupSignals, unsubscribeFromGroupSignals } = useGroupStore();
  const [searchParams] = useSearchParams();
  const userIdFromUrl = searchParams.get("userId");
  
  const [activeTab, setActiveTab] = useState("friends"); // "friends" | "groups"
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    getGroups();
    subscribeToGroupSignals();
    return () => unsubscribeFromGroupSignals();
  }, [getGroups, subscribeToGroupSignals, unsubscribeFromGroupSignals]);

  useEffect(() => {
    if (userIdFromUrl) {
      const user = users.find(u => u._id === userIdFromUrl);
      if (user) {
        setSelectedUser(user);
        setSelectedGroup(null);
      }
    }
  }, [userIdFromUrl, users, setSelectedUser, setSelectedGroup]);

  return (
    <div className="h-[calc(100dvh-3.5rem)] bg-base-200 mt-14">
      <div className="flex flex-col h-full px-0 sm:px-4 py-2 sm:py-4">
        <div className="bg-base-100 rounded-lg sm:rounded-xl w-full max-w-7xl overflow-hidden flex-1">
          <div className="flex h-full w-full">
            {/* Split Sidebar for Friends / Groups */}
            <aside className={`h-full border-r border-base-300 flex flex-col bg-base-100 transition-all duration-200
              ${selectedUser || selectedGroup ? "hidden md:flex" : "w-full md:flex"} md:w-16 lg:w-72`}>
              
              {/* Tab Selector Headers */}
              <div className="border-b border-base-300 w-full p-2 flex items-center justify-around bg-base-200/50">
                <button 
                  onClick={() => { setActiveTab("friends"); setSelectedGroup(null); }}
                  className={`flex-1 py-2 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-lg transition-all ${activeTab === "friends" ? "bg-base-100 shadow text-primary" : "text-zinc-500 hover:text-base-content"}`}
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden lg:inline">Friends</span>
                </button>
                <button 
                  onClick={() => { setActiveTab("groups"); setSelectedUser(null); }}
                  className={`flex-1 py-2 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-lg transition-all ${activeTab === "groups" ? "bg-base-100 shadow text-primary" : "text-zinc-500 hover:text-base-content"}`}
                >
                  <FolderPlus className="w-4 h-4" />
                  <span className="hidden lg:inline">Groups</span>
                </button>
              </div>

              {/* Sidebar Content Switch */}
              <div className="flex-1 overflow-y-auto">
                {activeTab === "friends" ? (
                  <Sidebar />
                ) : (
                  <div className="p-2 space-y-2">
                    <button 
                      onClick={() => setIsCreateModalOpen(true)}
                      className="w-full btn btn-sm btn-primary flex items-center justify-center gap-2 mb-3"
                    >
                      <FolderPlus className="w-4 h-4" /> Create Group
                    </button>
                    <div className="space-y-1">
                      {groups.map(group => (
                        <button
                          key={group._id}
                          onClick={() => { setSelectedGroup(group); setSelectedUser(null); }}
                          className={`w-full p-3 flex items-center gap-3 rounded-xl hover:bg-base-200 transition-all ${selectedGroup?._id === group._id ? "bg-base-200 ring-1 ring-primary/30" : ""}`}
                        >
                          <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                            {group.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="text-left min-w-0 flex-1">
                            <div className="font-semibold text-sm truncate">{group.name}</div>
                            <div className="text-xs text-zinc-500 truncate">{group.desc}</div>
                          </div>
                        </button>
                      ))}
                      {groups.length === 0 && (
                        <p className="text-center text-xs text-zinc-500 py-6">No groups created yet.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </aside>

            {/* Message Chat Swapper */}
            <div className={`flex-1 ${!selectedUser && !selectedGroup ? "hidden md:flex" : "flex"}`}>
              {!selectedUser && !selectedGroup ? (
                <NoChatSelected />
              ) : selectedGroup ? (
                <GroupChatView />
              ) : (
                <ChatContainer />
              )}
            </div>
          </div>
        </div>
      </div>

      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        friends={users}
        onCreateGroup={createGroup}
      />
    </div>
  )
}

export default HomePage;