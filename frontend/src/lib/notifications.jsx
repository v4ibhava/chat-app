import toast from "react-hot-toast";

export async function showNewMessageNotification(senderName, senderId, text, avatarUrl) {
    const { useAuthStore } = await import("../store/useAuthStore");
    const authUser = useAuthStore.getState().authUser;
    if (authUser?.notificationsEnabled === false) return;

    const preview = text ? (text.length > 60 ? text.slice(0, 60) + "..." : text) : "Sent an attachment";

    toast.custom((t) => (
        <div
            onClick={() => toast.dismiss(t.id)}
            className="flex items-center gap-3 bg-[#1a1a20] border border-[#2e2e38] rounded-2xl p-3 shadow-2xl cursor-pointer hover:bg-[#22222a] transition-all max-w-sm w-full"
        >
            {avatarUrl ? (
                <img src={avatarUrl} alt="" className="size-10 rounded-full object-cover shrink-0" />
            ) : (
                <div className="size-10 rounded-full bg-[#2563eb] flex items-center justify-center text-white font-bold shrink-0">
                    {senderName?.charAt(0)?.toUpperCase() || "?"}
                </div>
            )}
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">{senderName}</p>
                <p className="text-xs text-zinc-400 truncate">{preview}</p>
            </div>
        </div>
    ), { duration: 4000, position: "top-right" });

    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification(senderName, {
            body: preview,
            icon: avatarUrl || undefined,
        });
    } else if (typeof Notification !== "undefined" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }
}
