import { useEffect, useRef } from "react";

interface WaveformVisualizerProps {
  isPlaying: boolean;
}

export default function WaveformVisualizer({ isPlaying }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width = canvas.offsetWidth * devicePixelRatio;
    const height = canvas.height = canvas.offsetHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    const bars = 40;
    const barWidth = canvas.offsetWidth / bars;
    let animationTime = 0;

    const animate = () => {
      if (!isPlaying) {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        return;
      }

      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      animationTime += 0.1;

      for (let i = 0; i < bars; i++) {
        const barHeight = isPlaying 
          ? (Math.sin(animationTime + i * 0.3) * 0.5 + 0.5) * canvas.offsetHeight * 0.8
          : canvas.offsetHeight * 0.2;

        const x = i * barWidth;
        const y = canvas.offsetHeight - barHeight;

        // Create gradient
        const gradient = ctx.createLinearGradient(0, y, 0, canvas.offsetHeight);
        
        if (i % 3 === 0) {
          gradient.addColorStop(0, '#00ffff'); // Primary cyan
          gradient.addColorStop(1, '#0080ff'); // Accent blue
        } else if (i % 3 === 1) {
          gradient.addColorStop(0, '#ff00ff'); // Secondary magenta
          gradient.addColorStop(1, '#8000ff'); // Purple
        } else {
          gradient.addColorStop(0, '#00ff80'); // Accent cyan-green
          gradient.addColorStop(1, '#0040ff'); // Blue
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth - 2, barHeight);

        // Add glow effect
        ctx.shadowColor = i % 3 === 0 ? '#00ffff' : i % 3 === 1 ? '#ff00ff' : '#00ff80';
        ctx.shadowBlur = 10;
        ctx.fillRect(x, y, barWidth - 2, barHeight);
        ctx.shadowBlur = 0;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    if (isPlaying) {
      animate();
    } else {
      // Static visualization when not playing
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      for (let i = 0; i < bars; i++) {
        const barHeight = canvas.offsetHeight * 0.3;
        const x = i * barWidth;
        const y = canvas.offsetHeight - barHeight;

        ctx.fillStyle = i % 3 === 0 ? '#004444' : i % 3 === 1 ? '#440044' : '#004400';
        ctx.fillRect(x, y, barWidth - 2, barHeight);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  return (
    <div className="bg-black rounded p-4 neon-border">
      <canvas
        ref={canvasRef}
        className="w-full h-20 rounded"
        style={{ maxWidth: '100%' }}
      />
    </div>
  );
}
