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
            const osc1 = audioCtx.createOscillator();
            const osc2 = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            osc1.type = "sine";
            osc2.type = "sine";
            osc1.frequency.setValueAtTime(350, audioCtx.currentTime); // Standard dial tone frequency 1
            osc2.frequency.setValueAtTime(440, audioCtx.currentTime); // Standard dial tone frequency 2

            osc1.connect(gainNode);
            osc2.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime); // Quiet volume

            osc1.start();
            osc2.start();

            currentOscillators.push(osc1, osc2);

            // Play for 1.5 seconds, then pause
            setTimeout(() => {
                try {
                    osc1.stop();
                    osc2.stop();
                } catch (e) {}
            }, 1500);
        };

        playDial();
        ringInterval = setInterval(playDial, 4000); // Dial tone loop
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
            const notes = [329.63, 392.00, 523.25, 659.25]; // E5, G5, C6, E6 chime sequence
            
            notes.forEach((freq, index) => {
                const osc = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                
                osc.type = "sine";
                osc.frequency.setValueAtTime(freq, now + index * 0.15);
                
                gainNode.gain.setValueAtTime(0, now + index * 0.15);
                gainNode.gain.linearRampToValueAtTime(0.08, now + index * 0.15 + 0.05);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.15 + 0.5);
                
                osc.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                
                osc.start(now + index * 0.15);
                osc.stop(now + index * 0.15 + 0.5);
                currentOscillators.push(osc);
            });
        };

        playRing();
        ringInterval = setInterval(playRing, 2500); // Ringtone loop
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
