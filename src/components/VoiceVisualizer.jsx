import React, { useEffect, useRef } from 'react';

const VoiceVisualizer = ({ stream }) => {
    const canvasRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const animationFrameRef = useRef(null);

    useEffect(() => {
        if (!stream) return;

        // Initialize Audio Context and Analyser
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);

        source.connect(analyser);
        analyser.fftSize = 64; // Small FFT size for fewer bars

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const draw = () => {
            const width = canvas.width;
            const height = canvas.height;

            analyser.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, width, height);

            const barCount = 8;
            const barWidth = 6;
            const barGap = 8;
            const totalWidth = (barCount * barWidth) + ((barCount - 1) * barGap);
            const startX = (width - totalWidth) / 2;

            for (let i = 0; i < barCount; i++) {
                // Get value from dataArray (using a subset of frequencies)
                const value = dataArray[i + 2] || 0;
                const percent = value / 255;
                const barHeight = Math.max(4, percent * height);

                const x = startX + (i * (barWidth + barGap));
                const y = (height - barHeight) / 2;

                // Draw rounded bar
                ctx.fillStyle = '#f43f5e'; // Current theme "rose-500"

                // Create gradient for a more premium look
                const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
                gradient.addColorStop(0, '#fb7185'); // rose-400
                gradient.addColorStop(1, '#e11d48'); // rose-600
                ctx.fillStyle = gradient;

                ctx.beginPath();
                ctx.roundRect(x, y, barWidth, barHeight, 4);
                ctx.fill();
            }

            animationFrameRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(err => console.error("Error closing AudioContext", err));
            }
        };
    }, [stream]);

    if (!stream) {
        return (
            <div className="flex items-center gap-1 h-8">
                {[...Array(5)].map((_, i) => (
                    <div
                        key={i}
                        className="w-1 bg-slate-400 rounded-full animate-pulse"
                        style={{
                            height: '40%',
                            animationDelay: `${i * 0.1}s`
                        }}
                    ></div>
                ))}
            </div>
        );
    }

    return (
        <canvas
            ref={canvasRef}
            width={120}
            height={40}
            className="w-[120px] h-[40px] opacity-90"
        />
    );
};

export default VoiceVisualizer;
