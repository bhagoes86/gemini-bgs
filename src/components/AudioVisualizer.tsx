import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  micAnalyser: AnalyserNode | null;
  speakerAnalyser: AnalyserNode | null;
  isListening: boolean;
  isAiSpeaking: boolean;
  isConnected: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  micAnalyser,
  speakerAnalyser,
  isListening,
  isAiSpeaking,
  isConnected,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const bufferLength = 64;
    const dataArray = new Uint8Array(bufferLength);

    let phase = 0;

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);
      const width = rect.width;
      const height = rect.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Determine active analyser
      let activeAnalyser = isAiSpeaking ? speakerAnalyser : (isListening ? micAnalyser : null);
      let averageVolume = 0;

      if (activeAnalyser && isConnected) {
        activeAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        averageVolume = sum / bufferLength / 255; // 0 to 1
      }

      phase += 0.03 + averageVolume * 0.05;

      // Draw background ambient glow
      const glowGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        10,
        centerX,
        centerY,
        width * 0.45
      );

      if (isAiSpeaking) {
        // Deep cyan / electric indigo glow for AI
        glowGradient.addColorStop(0, `rgba(59, 130, 246, ${0.25 + averageVolume * 0.4})`);
        glowGradient.addColorStop(0.5, `rgba(147, 51, 234, ${0.12 + averageVolume * 0.25})`);
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else if (isListening && averageVolume > 0.02) {
        // Emerald / teal glow for user speech
        glowGradient.addColorStop(0, `rgba(16, 185, 129, ${0.22 + averageVolume * 0.4})`);
        glowGradient.addColorStop(0.5, `rgba(6, 182, 212, ${0.1 + averageVolume * 0.2})`);
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else if (isConnected) {
        // Subtle ambient breathing glow when connected
        const breath = Math.sin(phase) * 0.05 + 0.1;
        glowGradient.addColorStop(0, `rgba(99, 102, 241, ${breath})`);
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        // Dim idle glow
        glowGradient.addColorStop(0, 'rgba(100, 116, 139, 0.08)');
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }

      ctx.fillStyle = glowGradient;
      ctx.fillRect(0, 0, width, height);

      // Draw circular waveform / orb
      const baseRadius = Math.min(width, height) * 0.24;
      const numPoints = 64;

      ctx.beginPath();
      for (let i = 0; i <= numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const freqIndex = Math.floor((i % (numPoints / 2)) * (bufferLength / (numPoints / 2)));
        const freqVal = (dataArray[freqIndex] || 0) / 255;

        // Wave distortion based on audio and phase
        const wave = Math.sin(angle * 6 + phase * 2) * (5 + averageVolume * 25);
        const dynamicRadius = baseRadius + wave + freqVal * (isAiSpeaking || isListening ? 30 : 4);

        const x = centerX + Math.cos(angle) * dynamicRadius;
        const y = centerY + Math.sin(angle) * dynamicRadius;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();

      // Ring stroke
      ctx.lineWidth = isAiSpeaking ? 3.5 : (isListening ? 3 : 2);
      if (isAiSpeaking) {
        const strokeGrad = ctx.createLinearGradient(0, 0, width, height);
        strokeGrad.addColorStop(0, '#38bdf8');
        strokeGrad.addColorStop(0.5, '#818cf8');
        strokeGrad.addColorStop(1, '#c084fc');
        ctx.strokeStyle = strokeGrad;
      } else if (isListening) {
        const strokeGrad = ctx.createLinearGradient(0, 0, width, height);
        strokeGrad.addColorStop(0, '#34d399');
        strokeGrad.addColorStop(0.5, '#2dd4bf');
        strokeGrad.addColorStop(1, '#38bdf8');
        ctx.strokeStyle = strokeGrad;
      } else {
        ctx.strokeStyle = isConnected ? 'rgba(148, 163, 184, 0.4)' : 'rgba(71, 85, 105, 0.3)';
      }
      ctx.stroke();

      // Inner soft orb fill
      const innerGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius);
      if (isAiSpeaking) {
        innerGrad.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
        innerGrad.addColorStop(0.8, 'rgba(59, 130, 246, 0.15)');
        innerGrad.addColorStop(1, 'rgba(15, 23, 42, 0.8)');
      } else if (isListening) {
        innerGrad.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
        innerGrad.addColorStop(0.8, 'rgba(6, 182, 212, 0.12)');
        innerGrad.addColorStop(1, 'rgba(15, 23, 42, 0.8)');
      } else {
        innerGrad.addColorStop(0, 'rgba(30, 41, 59, 0.5)');
        innerGrad.addColorStop(1, 'rgba(15, 23, 42, 0.9)');
      }
      ctx.fillStyle = innerGrad;
      ctx.fill();

      // Secondary orbital ring for depth
      ctx.beginPath();
      for (let i = 0; i <= numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const wave = Math.cos(angle * 4 - phase * 1.5) * (4 + averageVolume * 15);
        const r = baseRadius * 0.7 + wave;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = isAiSpeaking
        ? 'rgba(192, 132, 252, 0.6)'
        : (isListening ? 'rgba(52, 211, 153, 0.6)' : 'rgba(148, 163, 184, 0.2)');
      ctx.stroke();

      // Centered sound frequency bars underneath orb
      const barWidth = 3;
      const barGap = 3;
      const totalBars = 32;
      const barsStartX = centerX - (totalBars * (barWidth + barGap)) / 2;
      const barBaseY = height - 28;

      for (let b = 0; b < totalBars; b++) {
        const freqIndex = Math.floor(b * (bufferLength / totalBars));
        const val = (dataArray[freqIndex] || 0) / 255;
        const barHeight = Math.max(3, val * 34 * (isConnected ? 1 : 0.2));
        const bx = barsStartX + b * (barWidth + barGap);

        ctx.fillStyle = isAiSpeaking
          ? `rgba(96, 165, 250, ${0.4 + val * 0.6})`
          : (isListening ? `rgba(52, 211, 153, ${0.4 + val * 0.6})` : 'rgba(100, 116, 139, 0.3)');
        ctx.fillRect(bx, barBaseY - barHeight / 2, barWidth, barHeight);
      }
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [micAnalyser, speakerAnalyser, isListening, isAiSpeaking, isConnected]);

  return (
    <div className="relative w-full h-72 md:h-80 flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="w-full h-full block rounded-3xl"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};
