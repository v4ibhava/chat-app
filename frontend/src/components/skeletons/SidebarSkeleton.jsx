import { Users } from "lucide-react";

const SidebarSkeleton = ({ selectedUser }) => {
  // Create 8 skeleton items
  const skeletonFriends = Array(8).fill(null);

  return (
    <aside
      className={`h-full border-r border-base-300 flex flex-col transition-all duration-200
        ${selectedUser ? "hidden md:flex" : "w-full md:flex"} md:w-16 lg:w-72`}
    >
      {/* Header */}
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6" />
          <span className="font-medium block md:hidden lg:block">Friends</span>
        </div>
      </div>

      {/* Skeleton Friends */}
      <div className="overflow-y-auto w-full py-3">
        {skeletonFriends.map((_, idx) => (
          <div key={idx} className="w-full p-3 flex items-center gap-3">
            {/* Avatar skeleton */}
            <div className="relative mx-auto lg:mx-0">
              <div className="skeleton size-12 rounded-full" />
            </div>

            {/* User info skeleton - visible on mobile and desktop, hidden on md */}
            <div className="block md:hidden lg:block text-left min-w-0 flex-1">
              <div className="skeleton h-4 w-32 mb-2" />
              <div className="skeleton h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default SidebarSkeleton;