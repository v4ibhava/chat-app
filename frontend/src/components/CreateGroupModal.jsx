import React, { useState } from "react";

const CreateGroupModal = ({ isOpen, onClose, friends, onCreateGroup }) => {
    const [groupName, setGroupName] = useState("");
    const [selectedMembers, setSelectedMembers] = useState([]);

    if (!isOpen) return null;

    const handleToggleMember = (userId) => {
        setSelectedMembers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!groupName.trim() || selectedMembers.length === 0) return;
        onCreateGroup(groupName, selectedMembers);
        setGroupName("");
        setSelectedMembers([]);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md bg-base-200 border border-base-300 rounded-3xl p-6 shadow-2xl animate-fade-in">
                <h3 className="text-lg font-bold mb-4">Create New Group</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-2">Group Name</label>
                        <input
                            type="text"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="Enter group name..."
                            className="input input-bordered w-full"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-2">Add Friends (Min 1, Max 7)</label>
                        <div className="max-h-48 overflow-y-auto space-y-2 border border-base-300 rounded-xl p-2 bg-base-100">
                            {friends.map(friend => (
                                <label key={friend._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-200 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedMembers.includes(friend._id)}
                                        onChange={() => handleToggleMember(friend._id)}
                                        className="checkbox checkbox-primary"
                                    />
                                    <span>{friend.fullName}</span>
                                </label>
                            ))}
                            {friends.length === 0 && (
                                <p className="text-zinc-500 text-xs p-2">No friends to invite.</p>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
                        <button
                            type="submit"
                            disabled={!groupName.trim() || selectedMembers.length === 0}
                            className="btn btn-primary"
                        >
                            Create Group
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateGroupModal;
