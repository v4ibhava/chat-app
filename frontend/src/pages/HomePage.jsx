import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import ChatContainer from "../components/ChatContainer";
import GroupChatView from "../components/GroupChatView";
import NoChatSelected from "../components/NoChatSelected";
import Sidebar from "../components/Sidebar";
import CreateGroupModal from "../components/CreateGroupModal";
import { Users, FolderPlus, Plus, Search, SquarePen } from "lucide-react";

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

  const filteredGroups = groups.filter(g => {
    if (!g) return false;
    const term = (groupSearchTerm || "").toLowerCase();
    const name = (g.name || "").toLowerCase();
    const desc = (g.desc || "").toLowerCase();
    return name.includes(term) || desc.includes(term);
  });

  return (
    <div className="fixed inset-x-0 top-14 bottom-0 bg-[#0a0a0c] overflow-hidden p-3 sm:p-4">
      <div className="flex h-full w-full max-w-[1600px] mx-auto gap-3.5">
        {/* Left Sidebar Card */}
        <aside className={`h-full flex flex-col bg-[#121215] rounded-3xl border border-[#1e1e24] shadow-2xl transition-all duration-200 shrink-0 overflow-hidden
          ${selectedUser || selectedGroup ? "hidden md:flex" : "w-full md:flex"} md:w-20 lg:w-80`}>

          {/* Top Title & Compose (for Mobile/Tab view) */}
          <div className="p-4 pb-2 flex items-center justify-between lg:hidden">
            <h1 className="text-xl font-extrabold text-white">Zync</h1>
          </div>

          {/* Pill Tab Selector */}
          <div className="px-3 py-2">
            <div className="bg-[#1a1a20] p-1 rounded-full flex items-center gap-1">
              <button
                onClick={() => { setActiveTab("friends"); setSelectedGroup(null); }}
                className={`flex-1 py-1.5 px-3 flex items-center justify-center gap-2 text-xs font-semibold rounded-full transition-all duration-200 ${
                  activeTab === "friends"
                    ? "bg-[#2a2a32] text-white shadow-md"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden lg:inline truncate">Friends</span>
              </button>
              <button
                onClick={() => { setActiveTab("groups"); setSelectedUser(null); }}
                className={`flex-1 py-1.5 px-3 flex items-center justify-center gap-2 text-xs font-semibold rounded-full transition-all duration-200 ${
                  activeTab === "groups"
                    ? "bg-[#2a2a32] text-white shadow-md"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <FolderPlus className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden lg:inline truncate">Groups</span>
              </button>
            </div>
          </div>

          {/* Sidebar Content Switch */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {activeTab === "friends" ? (
              <Sidebar />
            ) : (
              <div className="flex flex-col h-full w-full bg-[#121215]">
                {/* Search & Create Header */}
                <div className="px-3 pb-3 space-y-2">
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="w-full py-2 bg-[#2563eb] hover:bg-blue-600 text-white flex items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden lg:inline text-xs">New Group</span>
                  </button>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Filter groups..."
                      value={groupSearchTerm}
                      onChange={(e) => setGroupSearchTerm(e.target.value)}
                      className="w-full pl-9 py-2 bg-[#1a1a20] border-none text-xs text-zinc-200 placeholder-zinc-500 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  </div>
                </div>

                {/* Group Items */}
                <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1.5">
                  {filteredGroups.map(group => {
                    const isSelected = selectedGroup?._id === group._id;

                    return (
                      <button
                        key={group._id}
                        onClick={() => { setSelectedGroup(group); setSelectedUser(null); }}
                        className={`w-full p-3 flex items-center gap-3.5 rounded-2xl transition-all duration-200 text-left ${
                          isSelected 
                            ? "bg-[#22222a] text-white shadow-md border border-[#2e2e38]" 
                            : "hover:bg-[#1a1a20] text-zinc-300"
                        }`}
                      >
                        {group.groupPic ? (
                          <img
                            src={group.groupPic}
                            alt={group.name}
                            className="w-10 h-10 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600/30 to-indigo-600/30 flex items-center justify-center text-blue-400 font-bold shrink-0 text-sm">
                            {(group.name || "G").substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="hidden lg:block min-w-0 flex-1">
                          <div className="font-semibold text-sm truncate text-white">{group.name}</div>
                          <div className="text-xs text-zinc-400 truncate mt-0.5">
                            {group.desc || `${group.members?.length || 0} members`}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {filteredGroups.length === 0 && (
                    <div className="text-center text-zinc-500 py-10 px-2">
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

        {/* Right Main Workspace Card */}
        <main className={`flex-1 ${!selectedUser && !selectedGroup ? "hidden md:flex" : "flex"} flex-col h-full min-w-0 bg-[#121215] rounded-3xl border border-[#1e1e24] shadow-2xl overflow-hidden`}>
          {!selectedUser && !selectedGroup ? (
            <NoChatSelected />
          ) : selectedGroup ? (
            <GroupChatView />
          ) : (
            <ChatContainer />
          )}
        </main>
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