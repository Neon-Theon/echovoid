import { useEffect, useRef } from "react";

interface WaveformVisualizerProps {
  isPlaying: boolean;
}

export default function WaveformVisualizer({ isPlaying }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const isPlayingRef = useRef(isPlaying);
  const animationTimeRef = useRef(0);
  const lastFrameTimeRef = useRef(0);

  // Update playing state ref without restarting animation
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Initialize canvas and start persistent animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up canvas dimensions
    const setupCanvas = () => {
      const width = canvas.width = canvas.offsetWidth * devicePixelRatio;
      const height = canvas.height = canvas.offsetHeight * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    
    setupCanvas();

    const bars = 40;
    
    // Seeded pseudo-random number generator for consistent patterns
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    const animate = (currentTime: number) => {
      if (!canvas || !ctx) return;
      
      const deltaTime = currentTime - lastFrameTimeRef.current;
      lastFrameTimeRef.current = currentTime;
      
      // Only advance animation time when playing
      if (isPlayingRef.current) {
        animationTimeRef.current += deltaTime * 0.003; // Smooth animation speed
      }

      const barWidth = canvas.offsetWidth / bars;
      
      // Clear canvas
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      for (let i = 0; i < bars; i++) {
        // Calculate dynamic bar height with smooth easing
        const baseHeight = 0.3; // Minimum height when not playing
        const playingIntensity = isPlayingRef.current ? 1.0 : 0.1;
        
        // Multiple sine waves for complex patterns
        const wave1 = Math.sin(animationTimeRef.current + i * 0.3) * 0.3;
        const wave2 = Math.sin(animationTimeRef.current * 1.7 + i * 0.15) * 0.2;
        const wave3 = seededRandom(animationTimeRef.current * 0.5 + i) * 0.1;
        
        const intensity = (wave1 + wave2 + wave3 + 0.6) * playingIntensity;
        const barHeight = (baseHeight + intensity * 0.5) * canvas.offsetHeight;

        const x = i * barWidth;
        const y = canvas.offsetHeight - barHeight;

        // Create gradient based on intensity
        const gradient = ctx.createLinearGradient(0, y, 0, canvas.offsetHeight);
        
        const alpha = isPlayingRef.current ? 1.0 : 0.4;
        
        if (i % 3 === 0) {
          gradient.addColorStop(0, `rgba(0, 255, 255, ${alpha})`); // Primary cyan
          gradient.addColorStop(1, `rgba(0, 128, 255, ${alpha})`); // Accent blue
        } else if (i % 3 === 1) {
          gradient.addColorStop(0, `rgba(255, 0, 255, ${alpha})`); // Secondary magenta
          gradient.addColorStop(1, `rgba(128, 0, 255, ${alpha})`); // Purple
        } else {
          gradient.addColorStop(0, `rgba(0, 255, 128, ${alpha})`); // Accent cyan-green
          gradient.addColorStop(1, `rgba(0, 64, 255, ${alpha})`); // Blue
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth - 2, barHeight);

        // Add glow effect when playing
        if (isPlayingRef.current) {
          ctx.shadowColor = i % 3 === 0 ? '#00ffff' : i % 3 === 1 ? '#ff00ff' : '#00ff80';
          ctx.shadowBlur = 8;
          ctx.fillRect(x, y, barWidth - 2, barHeight);
          ctx.shadowBlur = 0;
        }
      }

      // Continue animation loop
      animationRef.current = requestAnimationFrame(animate);
    };

    // Start the persistent animation loop
    animationRef.current = requestAnimationFrame(animate);

    // Handle window resize
    const handleResize = () => {
      setupCanvas();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []); // Empty dependency array - only run once

  return (
    <div className="bg-black rounded p-4 neon-border">
      <canvas
        ref={canvasRef}
        className="w-full h-16 rounded"
        style={{ maxWidth: '100%' }}
        aria-hidden="true"
      />
    </div>
  );
}
