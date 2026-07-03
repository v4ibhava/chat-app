import React, { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, MessageSquare, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import UserAvatar from './UserAvatar';

const CallModal = () => {
    const {
        callState,
        callType,
        activeCallUser,
        localStream,
        remoteStream,
        isMuted,
        isCameraOff,
        acceptCall,
        rejectCall,
        rejectWithBusyMessage,
        endCall,
        toggleMute,
        toggleCamera
    } = useChatStore();

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const [duration, setDuration] = useState(0);

    // Call duration timer
    useEffect(() => {
        let interval = null;
        if (callState === "connected") {
            setDuration(0);
            interval = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        } else {
            setDuration(0);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [callState]);

    // Handle local stream attachment
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream, callState]);

    // Handle remote stream attachment
    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream, callState]);

    if (callState === "idle" || !activeCallUser) return null;

    const formatDuration = (sec) => {
        const mins = Math.floor(sec / 60);
        const secs = sec % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            
            {/* Outgoing Dialing View */}
            {callState === "ringing" && (
                <div className="w-full max-w-sm bg-base-100 border border-base-300 rounded-2xl shadow-2xl p-8 flex flex-col items-center text-center">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                        <UserAvatar 
                            src={activeCallUser.profilePic} 
                            alt={activeCallUser.fullName} 
                            size="xl"
                        />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{activeCallUser.fullName}</h3>
                    <p className="text-zinc-500 mb-8">Calling ({callType})...</p>
                    <button 
                        onClick={endCall} 
                        className="btn btn-circle btn-lg btn-error"
                        title="Cancel Call"
                    >
                        <PhoneOff className="w-6 h-6 text-white" />
                    </button>
                </div>
            )}

            {/* Incoming Call View */}
            {callState === "incoming" && (
                <div className="w-full max-w-sm bg-base-100 border border-base-300 rounded-2xl shadow-2xl p-8 flex flex-col items-center text-center">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 rounded-full bg-success/20 animate-pulse" />
                        <UserAvatar 
                            src={activeCallUser.profilePic} 
                            alt={activeCallUser.fullName} 
                            size="xl"
                        />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{activeCallUser.fullName}</h3>
                    <p className="text-zinc-500 mb-8">Incoming {callType} call...</p>
                    
                    {/* Ringing Options */}
                    <div className="flex gap-4 items-center">
                        <button 
                            onClick={rejectCall} 
                            className="btn btn-circle btn-lg btn-error"
                            title="Decline"
                        >
                            <PhoneOff className="w-6 h-6 text-white" />
                        </button>
                        
                        <button 
                            onClick={rejectWithBusyMessage} 
                            className="btn btn-circle btn-lg btn-warning"
                            title="Message: Call Later"
                        >
                            <MessageSquare className="w-6 h-6 text-white" />
                        </button>

                        <button 
                            onClick={acceptCall} 
                            className="btn btn-circle btn-lg btn-success"
                            title="Accept"
                        >
                            <Phone className="w-6 h-6 text-white" />
                        </button>
                    </div>
                    <div className="flex flex-col gap-1 mt-4 text-xs text-zinc-500">
                        <span>Orange option declines call & sends:</span>
                        <span className="italic">"I'm busy right now, I'll call you later."</span>
                    </div>
                </div>
            )}

            {/* Connected Call Screen */}
            {callState === "connected" && (
                <div className="relative w-full max-w-4xl h-[80vh] bg-zinc-900 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
                    
                    {/* Media Streaming Workspace */}
                    <div className="flex-1 relative bg-black flex items-center justify-center">
                        {callType === "video" ? (
                            <>
                                {/* Remote Participant Video */}
                                {remoteStream ? (
                                    <video 
                                        ref={remoteVideoRef} 
                                        autoPlay 
                                        playsInline 
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center gap-4 text-zinc-500">
                                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary" />
                                        <span>Connecting peer video...</span>
                                    </div>
                                )}

                                {/* Local Pip Preview (Bottom-Right corner) */}
                                <div className="absolute bottom-4 right-4 w-32 sm:w-48 aspect-video bg-zinc-800 rounded-lg overflow-hidden border-2 border-zinc-700 shadow-lg">
                                    <video 
                                        ref={localVideoRef} 
                                        autoPlay 
                                        playsInline 
                                        muted 
                                        className="w-full h-full object-cover transform -scale-x-100"
                                    />
                                    {isCameraOff && (
                                        <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center text-zinc-500">
                                            <VideoOff className="w-6 h-6" />
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            /* Audio Call UI */
                            <div className="flex flex-col items-center gap-4 text-center">
                                <div className="relative">
                                    <div className="absolute -inset-4 rounded-full bg-primary/10 animate-pulse" />
                                    <UserAvatar 
                                        src={activeCallUser.profilePic} 
                                        alt={activeCallUser.fullName} 
                                        size="xl"
                                    />
                                </div>
                                <h3 className="text-white text-2xl font-bold mt-4">{activeCallUser.fullName}</h3>
                                <p className="text-zinc-400">Audio call in progress</p>
                            </div>
                        )}

                        {/* Top Info Bar (Name and Timer) */}
                        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                            <div className="bg-black/60 backdrop-blur border border-zinc-700 px-4 py-2 rounded-full text-white text-sm font-semibold pointer-events-auto flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                                {activeCallUser.fullName}
                            </div>
                            <div className="bg-black/60 backdrop-blur border border-zinc-700 px-4 py-2 rounded-full text-white text-sm font-semibold pointer-events-auto font-mono">
                                {formatDuration(duration)}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Control Bar */}
                    <div className="bg-zinc-950 p-6 flex justify-center items-center gap-6 border-t border-zinc-800">
                        {/* Audio Toggle */}
                        <button 
                            onClick={toggleMute} 
                            className={`btn btn-circle btn-lg border border-zinc-700 ${
                                isMuted ? "btn-error text-white" : "btn-ghost text-zinc-300 hover:bg-zinc-800"
                            }`}
                            title={isMuted ? "Unmute Mic" : "Mute Mic"}
                        >
                            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                        </button>

                        {/* Hang Up Button */}
                        <button 
                            onClick={endCall} 
                            className="btn btn-circle btn-lg btn-error"
                            title="End Call"
                        >
                            <PhoneOff className="w-6 h-6 text-white" />
                        </button>

                        {/* Video Toggle (Only for Video Calls) */}
                        {callType === "video" && (
                            <button 
                                onClick={toggleCamera} 
                                className={`btn btn-circle btn-lg border border-zinc-700 ${
                                    isCameraOff ? "btn-error text-white" : "btn-ghost text-zinc-300 hover:bg-zinc-800"
                                }`}
                                title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
                            >
                                {isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CallModal;
