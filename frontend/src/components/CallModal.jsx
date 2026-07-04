import React, { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, MessageSquare, Mic, MicOff, Video, VideoOff, Monitor } from 'lucide-react';
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
        isRemoteCameraOff,
        isRemoteScreenSharing,
        acceptCall,
        rejectCall,
        rejectWithBusyMessage,
        endCall,
        toggleMute,
        toggleCamera,
        isScreenSharing,
        screenStream,
        toggleScreenShare
    } = useChatStore();

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const [duration, setDuration] = useState(0);
    const canScreenShare = typeof navigator !== "undefined" && navigator.mediaDevices && !!navigator.mediaDevices.getDisplayMedia;
    const hasLocalVideo = localStream && localStream.getVideoTracks().length > 0;

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
        if (localVideoRef.current) {
            if (isScreenSharing && screenStream) {
                localVideoRef.current.srcObject = screenStream;
            } else if (localStream) {
                localVideoRef.current.srcObject = localStream;
            } else {
                localVideoRef.current.srcObject = null;
            }
        }
    }, [localStream, screenStream, isScreenSharing, callState]);

    // Handle remote stream attachment
    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream, isRemoteScreenSharing, callState]);

    if (callState === "idle" || !activeCallUser) return null;

    const formatDuration = (sec) => {
        const mins = Math.floor(sec / 60);
        const secs = sec % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/95 backdrop-blur-xl p-0 sm:p-4">
            
            {/* Global style overrides for ripple and call screen animations */}
            <style>{`
                @keyframes ripple-pulse {
                    0% {
                        transform: scale(0.95);
                        opacity: 0.6;
                    }
                    50% {
                        opacity: 0.25;
                    }
                    100% {
                        transform: scale(2.4);
                        opacity: 0;
                    }
                }
                .ripple-ring {
                    position: absolute;
                    width: 140px;
                    height: 140px;
                    border-radius: 9999px;
                    border: 2px solid var(--ripple-color, #3b82f6);
                    animation: ripple-pulse 2.2s cubic-bezier(0.1, 0.8, 0.3, 1) infinite;
                    pointer-events: none;
                }
                .animate-fade-in {
                    animation: fadeIn 0.4s ease-out forwards;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.98); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>

            {/* Outgoing Dialing View */}
            {callState === "ringing" && (
                <div className="flex flex-col items-center justify-between w-full max-w-md h-[80vh] sm:h-[70vh] p-8 animate-fade-in text-white">
                    <div className="text-center mt-4">
                        <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Outgoing Call</span>
                    </div>

                    {/* Concentric ripples */}
                    <div className="relative my-auto flex items-center justify-center w-40 h-40">
                        <div className="ripple-ring" style={{ '--ripple-color': 'rgba(59, 130, 246, 0.4)' }}></div>
                        <div className="ripple-ring" style={{ '--ripple-color': 'rgba(59, 130, 246, 0.2)', 'animation-delay': '0.7s' }}></div>
                        <div className="ripple-ring" style={{ '--ripple-color': 'rgba(59, 130, 246, 0.1)', 'animation-delay': '1.4s' }}></div>
                        
                        <div className="relative z-10 p-1 bg-zinc-900 rounded-full border border-zinc-800 shadow-2xl">
                            <UserAvatar 
                                src={activeCallUser.profilePic} 
                                alt={activeCallUser.fullName} 
                                size="2xl"
                                showStatus={false}
                            />
                        </div>
                    </div>

                    <div className="text-center mb-6">
                        <h3 className="text-2xl font-bold tracking-tight mb-1">{activeCallUser.fullName}</h3>
                        <p className="text-sm text-zinc-400 font-medium animate-pulse">Calling with {callType}...</p>
                    </div>

                    <button 
                        onClick={endCall} 
                        className="btn btn-circle btn-lg bg-red-500 hover:bg-red-600 border-none text-white shadow-lg shadow-red-500/20 transform active:scale-95 transition-all duration-200 mb-4"
                        title="Cancel Call"
                    >
                        <PhoneOff className="w-6 h-6" />
                    </button>
                </div>
            )}

            {/* Incoming Call View */}
            {callState === "incoming" && (
                <div className="flex flex-col items-center justify-between w-full max-w-md h-[85vh] sm:h-[75vh] p-8 animate-fade-in text-white">
                    <div className="text-center mt-4">
                        <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Incoming {callType} Call</span>
                    </div>

                    {/* Concentric ripples */}
                    <div className="relative my-auto flex items-center justify-center w-40 h-40">
                        <div className="ripple-ring" style={{ '--ripple-color': 'rgba(16, 185, 129, 0.4)' }}></div>
                        <div className="ripple-ring" style={{ '--ripple-color': 'rgba(16, 185, 129, 0.2)', 'animation-delay': '0.7s' }}></div>
                        <div className="ripple-ring" style={{ '--ripple-color': 'rgba(16, 185, 129, 0.1)', 'animation-delay': '1.4s' }}></div>
                        
                        <div className="relative z-10 p-1 bg-zinc-900 rounded-full border border-zinc-800 shadow-2xl">
                            <UserAvatar 
                                src={activeCallUser.profilePic} 
                                alt={activeCallUser.fullName} 
                                size="2xl"
                                showStatus={false}
                            />
                        </div>
                    </div>

                    <div className="text-center mb-6">
                        <h3 className="text-2xl font-bold tracking-tight mb-1">{activeCallUser.fullName}</h3>
                        <p className="text-sm text-zinc-400 font-medium animate-pulse">Incoming call...</p>
                    </div>

                    <div className="flex flex-col items-center gap-6 w-full mb-4">
                        <div className="flex justify-center items-center gap-6">
                            <button 
                                onClick={rejectCall} 
                                className="btn btn-circle btn-lg bg-red-500 hover:bg-red-600 border-none text-white shadow-lg shadow-red-500/20 transform active:scale-95 transition-all duration-200"
                                title="Decline"
                            >
                                <PhoneOff className="w-6 h-6" />
                            </button>
                            
                            <button 
                                onClick={rejectWithBusyMessage} 
                                className="btn btn-circle btn-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-amber-500 shadow-lg transform active:scale-95 transition-all duration-200"
                                title="Decline & Reply: I'm Busy"
                            >
                                <MessageSquare className="w-6 h-6" />
                            </button>

                            <button 
                                onClick={acceptCall} 
                                className="btn btn-circle btn-lg bg-green-500 hover:bg-green-600 border-none text-white shadow-lg shadow-green-500/20 transform active:scale-95 transition-all duration-200"
                                title="Accept"
                            >
                                <Phone className="w-6 h-6" />
                            </button>
                        </div>
                        <span className="text-[10px] text-zinc-500 text-center select-none max-w-xs">
                          Tap message icon to decline & reply: <span className="italic text-zinc-400">"I'm busy right now, I'll call you later."</span>
                        </span>
                    </div>
                </div>
            )}

            {/* Connected Call Screen */}
            {callState === "connected" && (
                <div className="relative w-full h-full sm:max-w-4xl sm:h-[80vh] bg-zinc-950 sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-zinc-800/60">
                    
                    {/* Media Streaming Workspace */}
                    <div className="flex-1 relative bg-black w-full h-full overflow-hidden">
                        {callType === "video" ? (
                            <>
                                {/* Remote Participant Video */}
                                {remoteStream ? (
                                    <div className="absolute inset-0">
                                        <video 
                                            ref={remoteVideoRef} 
                                            autoPlay 
                                            playsInline 
                                            className={`w-full h-full ${isRemoteScreenSharing ? "object-contain bg-zinc-900" : "object-cover"}`}
                                        />
                                        {isRemoteCameraOff && !isRemoteScreenSharing && (
                                            <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center gap-4 text-zinc-400 z-10">
                                                <UserAvatar 
                                                    src={activeCallUser.profilePic} 
                                                    alt={activeCallUser.fullName} 
                                                    size="xl"
                                                />
                                                <span className="text-sm font-semibold">{activeCallUser.fullName} turned off their camera</span>
                                            </div>
                                        )}
                                        {isRemoteScreenSharing && (
                                            <div className="absolute top-4 left-4 bg-blue-500/80 backdrop-blur border border-blue-400 px-3 py-1 rounded-full text-white text-xs font-semibold z-20 pointer-events-none">
                                                {activeCallUser.fullName} is sharing screen
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-zinc-500 bg-zinc-950">
                                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary" />
                                        <span>Connecting peer video...</span>
                                    </div>
                                )}

                                {/* Local PiP Preview (z-40 so it displays above the remote feed) */}
                                <div className="absolute bottom-4 right-4 w-24 aspect-[3/4] sm:w-48 sm:aspect-video bg-zinc-900 rounded-xl overflow-hidden border-2 border-zinc-700/80 shadow-2xl z-40">
                                    <video 
                                        ref={localVideoRef} 
                                        autoPlay 
                                        playsInline 
                                        muted 
                                        className="w-full h-full object-cover"
                                        style={{ transform: isScreenSharing ? "none" : "scaleX(-1)" }}
                                    />
                                    {isCameraOff && !isScreenSharing && (
                                        <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center text-zinc-600">
                                            <VideoOff className="w-5 h-5" />
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            /* Audio Call UI */
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center text-white bg-zinc-950">
                                <div className="relative flex items-center justify-center w-36 h-36">
                                    <div className="ripple-ring" style={{ '--ripple-color': 'rgba(139, 92, 246, 0.3)' }}></div>
                                    <div className="ripple-ring" style={{ '--ripple-color': 'rgba(139, 92, 246, 0.1)', 'animation-delay': '1.1s' }}></div>
                                    
                                    <div className="relative z-10 p-1 bg-zinc-900 rounded-full border border-zinc-800 shadow-2xl">
                                        <UserAvatar 
                                            src={activeCallUser.profilePic} 
                                            alt={activeCallUser.fullName} 
                                            size="xl"
                                        />
                                    </div>
                                </div>
                                <h3 className="text-white text-2xl font-bold mt-6">{activeCallUser.fullName}</h3>
                                <p className="text-zinc-400 text-sm">Audio call in progress</p>

                                {/* Hidden audio element to play remote voice stream */}
                                {remoteStream && (
                                    <audio 
                                        ref={remoteVideoRef} 
                                        autoPlay 
                                        playsInline 
                                        className="hidden" 
                                    />
                                )}
                            </div>
                        )}

                        {/* Top Info Bar (Name and Timer) */}
                        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-30">
                            <div className="bg-black/60 backdrop-blur-md border border-zinc-800/80 px-4 py-2 rounded-full text-white text-sm font-semibold pointer-events-auto flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                                {activeCallUser.fullName}
                            </div>
                            <div className="bg-black/60 backdrop-blur-md border border-zinc-800/80 px-4 py-2 rounded-full text-white text-sm font-semibold pointer-events-auto font-mono">
                                {formatDuration(duration)}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Control Bar */}
                    <div className="bg-zinc-950 p-6 flex justify-center items-center gap-6 border-t border-zinc-900 z-30">
                        {/* Audio Toggle */}
                        <button 
                            onClick={toggleMute} 
                            className={`btn btn-circle btn-lg border border-zinc-800/80 ${
                                isMuted ? "bg-red-500 border-none text-white" : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
                            }`}
                            title={isMuted ? "Unmute Mic" : "Mute Mic"}
                        >
                            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </button>

                        {/* Hang Up Button */}
                        <button 
                            onClick={endCall} 
                            className="btn btn-circle btn-lg bg-red-500 hover:bg-red-600 border-none text-white shadow-lg shadow-red-500/20 transform active:scale-95 transition-all"
                            title="End Call"
                        >
                            <PhoneOff className="w-5 h-5 text-white" />
                        </button>

                        {/* Video & Screen Share Controls (Only for Video Calls) */}
                        {callType === "video" && (
                            <>
                                <button 
                                    onClick={toggleCamera} 
                                    className={`btn btn-circle btn-lg border border-zinc-800/80 ${
                                        (isCameraOff || !hasLocalVideo) ? "bg-red-500 border-none text-white" : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
                                    }`}
                                    title={!hasLocalVideo ? "Camera not found" : isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
                                    disabled={isScreenSharing || !hasLocalVideo}
                                >
                                    {(isCameraOff || !hasLocalVideo) ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                                </button>

                                {canScreenShare && (
                                    <button 
                                        onClick={toggleScreenShare} 
                                        className={`btn btn-circle btn-lg border border-zinc-800/80 ${
                                            isScreenSharing ? "bg-blue-500 hover:bg-blue-600 border-none text-white animate-pulse" : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
                                        }`}
                                        title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
                                    >
                                        <Monitor className="w-5 h-5" />
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CallModal;
