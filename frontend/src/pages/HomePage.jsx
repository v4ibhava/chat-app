import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import ChatContainer from "../components/ChatContainer";
import GroupChatView from "../components/GroupChatView";
import NoChatSelected from "../components/NoChatSelected";
import Sidebar from "../components/Sidebar";
import CreateGroupModal from "../components/CreateGroupModal";
import { Users, FolderPlus, Plus, Search } from "lucide-react";

const HomePage = () => {
  const { selectedUser, setSelectedUser, users } = useChatStore();
  const { selectedGroup, setSelectedGroup, getGroups, groups, createGroup, subscribeToGroupSignals, unsubscribeFromGroupSignals } = useGroupStore();
  const [searchParams] = useSearchParams();
  const userIdFromUrl = searchParams.get("userId");

  const [activeTab, setActiveTab] = useState("friends"); // "friends" | "groups"
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [groupSearchTerm, setGroupSearchTerm] = useState("");

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

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(groupSearchTerm.toLowerCase()) ||
    (g.desc && g.desc.toLowerCase().includes(groupSearchTerm.toLowerCase()))
  );

  return (
    <div className="fixed inset-x-0 top-14 bottom-0 bg-base-200 overflow-hidden">
      <div className="flex flex-col h-full max-w-[1600px] mx-auto p-0 sm:p-2 md:p-3">
        <div className="bg-base-100 rounded-none sm:rounded-2xl border border-base-300 shadow-xl w-full h-full overflow-hidden flex flex-1">
          <div className="flex h-full w-full">
            {/* Unified Desktop Sidebar */}
            <aside className={`h-full border-r border-base-300 flex flex-col bg-base-100/90 transition-all duration-200 shrink-0
              ${selectedUser || selectedGroup ? "hidden md:flex" : "w-full md:flex"} md:w-20 lg:w-80`}>

              {/* Tab Selector Headers */}
              <div className="border-b border-base-300 p-2 flex items-center gap-1 bg-base-200/40">
                <button
                  onClick={() => { setActiveTab("friends"); setSelectedGroup(null); }}
                  className={`flex-1 py-2 px-3 flex items-center justify-center gap-2 text-xs font-semibold rounded-xl transition-all duration-200 ${activeTab === "friends" ? "bg-base-100 shadow-sm text-primary ring-1 ring-primary/20" : "text-zinc-500 hover:text-base-content hover:bg-base-200/50"}`}
                >
                  <Users className="w-4 h-4 shrink-0" />
                  <span className="hidden lg:inline truncate">Friends</span>
                </button>
                <button
                  onClick={() => { setActiveTab("groups"); setSelectedUser(null); }}
                  className={`flex-1 py-2 px-3 flex items-center justify-center gap-2 text-xs font-semibold rounded-xl transition-all duration-200 ${activeTab === "groups" ? "bg-base-100 shadow-sm text-primary ring-1 ring-primary/20" : "text-zinc-500 hover:text-base-content hover:bg-base-200/50"}`}
                >
                  <FolderPlus className="w-4 h-4 shrink-0" />
                  <span className="hidden lg:inline truncate">Groups</span>
                </button>
              </div>

              {/* Sidebar Content Switch */}
              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                {activeTab === "friends" ? (
                  <Sidebar />
                ) : (
                  <div className="flex flex-col h-full w-full">
                    {/* Search & Create Header */}
                    <div className="p-2 border-b border-base-300 space-y-2">
                      <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="w-full btn btn-xs sm:btn-sm btn-primary flex items-center justify-center gap-1.5 rounded-xl shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="hidden lg:inline">New Group</span>
                      </button>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Filter groups..."
                          value={groupSearchTerm}
                          onChange={(e) => setGroupSearchTerm(e.target.value)}
                          className="input input-xs sm:input-sm input-bordered w-full pl-8 text-xs bg-base-200/50 focus:bg-base-100"
                        />
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                      </div>
                    </div>

                    {/* Group Items */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                      {filteredGroups.map(group => {
                        const isSelected = selectedGroup?._id === group._id;
                        const isPending = group.name === "Encrypted Group";

                        return (
                          <button
                            key={group._id}
                            onClick={() => { setSelectedGroup(group); setSelectedUser(null); }}
                            className={`w-full p-2.5 flex items-center gap-3 rounded-xl transition-all duration-200 text-left ${isSelected ? "bg-primary/10 text-primary font-medium ring-1 ring-primary/20 shadow-sm" : "hover:bg-base-200/70 text-base-content"}`}
                          >
                            {group.groupPic ? (
                              <img
                                src={group.groupPic}
                                alt={group.name}
                                className="size-10 rounded-full object-cover ring-2 ring-primary/20 shrink-0"
                              />
                            ) : (
                              <div className="size-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-primary font-bold shrink-0">
                                {group.name.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="hidden lg:block min-w-0 flex-1">
                              <div className="font-semibold text-sm truncate">{group.name}</div>
                              <div className={`text-xs truncate ${isPending ? "text-amber-500 font-medium" : "text-zinc-500"}`}>
                                {isPending ? "Pending Key Exchange" : (group.desc || `${group.members?.length || 0} members`)}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                      {filteredGroups.length === 0 && (
                        <div className="text-center text-zinc-500 py-8 px-2">
                          <p className="text-xs">
                            {groupSearchTerm ? "No matching groups found" : "No groups created yet"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </aside>

            {/* Main Workspace Area (Direct Chat / Group Chat / No Chat) */}
            <main className={`flex-1 ${!selectedUser && !selectedGroup ? "hidden md:flex" : "flex"} flex-col h-full min-w-0 bg-base-100`}>
              {!selectedUser && !selectedGroup ? (
                <NoChatSelected />
              ) : selectedGroup ? (
                <GroupChatView />
              ) : (
                <ChatContainer />
              )}
            </main>
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
  );
};

export default HomePage;