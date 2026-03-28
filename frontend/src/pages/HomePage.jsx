import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useChatStore } from "../store/useChatStore"
import ChatContainer from "../components/ChatContainer"
import NoChatSelected from "../components/NoChatSelected"
import Sidebar from "../components/Sidebar"

const HomePage = () => {
  const { selectedUser, setSelectedUser, users } = useChatStore();
  const [searchParams] = useSearchParams();
  const userIdFromUrl = searchParams.get("userId");

  useEffect(() => {
    if (userIdFromUrl) {
      const user = users.find(u => u._id === userIdFromUrl);
      if (user) {
        setSelectedUser(user);
      }
    }
  }, [userIdFromUrl, users, setSelectedUser]);

  return (
    <div className="h-screen bg-base-200 pt-14">
      <div className="flex items-center justify-center h-full px-0 sm:px-4 py-2 sm:py-4">
        <div className="bg-base-100 rounded-lg sm:rounded-xl w-full h-full sm:h-[calc(100vh-8rem)] max-w-7xl overflow-hidden">
          <div className="flex h-full">
            <Sidebar />
            {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage