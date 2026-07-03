let audioCtx = null;
let currentOscillators = [];
let ringInterval = null;

const initAudio = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
        audioCtx.resume();
    }
};

export const startDialTone = () => {
    stopTone();
    try {
        initAudio();
        
        const playDial = () => {
            if (!audioCtx || audioCtx.state === "suspended") return;
            const now = audioCtx.currentTime;
            
            // Soft dual ping chime: G4 and B4
            const notes = [392.00, 493.88];
            
            notes.forEach((freq, i) => {
                const osc = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                
                osc.type = "sine";
                osc.frequency.setValueAtTime(freq, now + i * 0.1);
                
                gainNode.gain.setValueAtTime(0, now + i * 0.1);
                gainNode.gain.linearRampToValueAtTime(0.03, now + i * 0.1 + 0.05);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.1 + 1.2);
                
                osc.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                
                osc.start(now + i * 0.1);
                osc.stop(now + i * 0.1 + 1.2);
                currentOscillators.push(osc);
            });
        };

        playDial();
        ringInterval = setInterval(playDial, 3500); // Dial tone loop (every 3.5s)
    } catch (e) {
        console.error("Failed to start dial tone:", e);
    }
};

export const startRingTone = () => {
    stopTone();
    try {
        initAudio();

        const playRing = () => {
            if (!audioCtx || audioCtx.state === "suspended") return;
            
            const now = audioCtx.currentTime;
            
            // Warm marimba chimes: [C5, E5, G5, B5, C6, G5, A5, C6]
            const melody = [
                { note: 523.25, time: 0.0 },  // C5
                { note: 659.25, time: 0.15 }, // E5
                { note: 783.99, time: 0.3 },  // G5
                { note: 987.77, time: 0.45 }, // B5
                { note: 1046.50, time: 0.65 },// C6
                { note: 783.99, time: 0.8 },  // G5
                { note: 880.00, time: 0.95 }, // A5
                { note: 1046.50, time: 1.1 },  // C6
            ];
            
            melody.forEach(({ note, time }) => {
                const osc = audioCtx.createOscillator();
                const subOsc = audioCtx.createOscillator(); // Subharmonic octave below for acoustic body warmth
                const gainNode = audioCtx.createGain();
                
                osc.type = "sine";
                osc.frequency.setValueAtTime(note, now + time);
                
                subOsc.type = "sine";
                subOsc.frequency.setValueAtTime(note / 2, now + time);
                
                gainNode.gain.setValueAtTime(0, now + time);
                gainNode.gain.linearRampToValueAtTime(0.04, now + time + 0.02);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, now + time + 0.65);
                
                osc.connect(gainNode);
                subOsc.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                
                osc.start(now + time);
                subOsc.start(now + time);
                
                osc.stop(now + time + 0.65);
                subOsc.stop(now + time + 0.65);
                
                currentOscillators.push(osc, subOsc);
            });
        };

        playRing();
        ringInterval = setInterval(playRing, 2800); // Ringtone loop
    } catch (e) {
        console.error("Failed to start ringtone:", e);
    }
};

export const stopTone = () => {
    if (ringInterval) {
        clearInterval(ringInterval);
        ringInterval = null;
    }
    currentOscillators.forEach(osc => {
        try {
            osc.stop();
        } catch (e) {}
    });
    currentOscillators = [];
};
