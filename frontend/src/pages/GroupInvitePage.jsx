import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGroupStore } from "../store/useGroupStore";
import { ArrowLeft, CheckCircle } from "lucide-react";

const GroupInvitePage = () => {
    const { inviteCode } = useParams();
    const { joinGroupViaLink } = useGroupStore();
    const navigate = useNavigate();

    const handleJoin = async () => {
        await joinGroupViaLink(inviteCode);
        navigate("/");
    };

    return (
        <div className="min-h-screen bg-base-200 flex items-center justify-center p-4 pt-20">
            <div className="w-full max-w-md bg-base-100 border border-base-300 rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
                <div className="size-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold mb-2">Group Chat Invitation</h2>
                <p className="text-sm text-zinc-500 mb-8">
                    You have been invited to join an E2EE group chat. Non-friends will be sent to the admin approval queue first.
                </p>
                <div className="space-y-3">
                    <button onClick={handleJoin} className="btn btn-primary w-full py-3">
                        Request to Join Group
                    </button>
                    <button onClick={() => navigate("/")} className="btn btn-ghost w-full">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Chats
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GroupInvitePage;
