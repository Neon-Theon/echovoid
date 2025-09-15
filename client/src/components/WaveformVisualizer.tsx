import { useEffect, useRef, useCallback, memo } from "react";

interface WaveformVisualizerProps {
  isPlaying: boolean;
}

function WaveformVisualizer({ isPlaying }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const isPlayingRef = useRef(isPlaying);
  const animationTimeRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const resizeObserverRef = useRef<ResizeObserver>();

  // Update playing state ref without restarting animation
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Setup canvas with proper error handling
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return false;

    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    try {
      // Get actual display dimensions
      const rect = canvas.getBoundingClientRect();
      const displayWidth = rect.width;
      const displayHeight = rect.height;
      
      // Set canvas size to match display size
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      
      // Set display size explicitly
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
      
      return true;
    } catch (error) {
      console.warn('Canvas setup failed:', error);
      return false;
    }
  }, []);

  // Initialize canvas and start animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!setupCanvas()) return;

    const points = 100; // Number of points in the wave line
    
    const animate = (currentTime: number) => {
      if (!canvas || !ctx) return;
      
      const deltaTime = currentTime - lastFrameTimeRef.current;
      lastFrameTimeRef.current = currentTime;
      
      // Only advance animation time when playing
      if (isPlayingRef.current) {
        animationTimeRef.current += deltaTime * 0.002; // Smooth animation speed
      }

      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;
      
      // Clear canvas with black background
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, width, height);

      // Calculate amplitude based on playing state
      const baseAmplitude = height * 0.1; // Minimum wave height
      const maxAmplitude = height * 0.35; // Maximum wave height when playing
      const playingIntensity = isPlayingRef.current ? 1.0 : 0.2;
      const amplitude = baseAmplitude + (maxAmplitude - baseAmplitude) * playingIntensity;

      // Create wave path
      ctx.beginPath();
      ctx.strokeStyle = 'transparent'; // We'll fill instead of stroke
      
      // Generate wave points
      const wavePoints: Array<[number, number]> = [];
      
      for (let i = 0; i <= points; i++) {
        const x = (i / points) * width;
        const progress = i / points;
        
        // Multiple sine waves for complex patterns
        const wave1 = Math.sin(animationTimeRef.current + progress * Math.PI * 4) * 0.4;
        const wave2 = Math.sin(animationTimeRef.current * 1.5 + progress * Math.PI * 6) * 0.3;
        const wave3 = Math.sin(animationTimeRef.current * 2.2 + progress * Math.PI * 8) * 0.2;
        
        const waveValue = (wave1 + wave2 + wave3) * amplitude;
        const y = centerY + waveValue;
        
        wavePoints.push([x, y]);
      }

      // Draw gradient-filled wave
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      const alpha = isPlayingRef.current ? 0.8 : 0.4;
      
      gradient.addColorStop(0, `rgba(0, 255, 255, ${alpha})`); // Cyan
      gradient.addColorStop(0.3, `rgba(255, 0, 255, ${alpha})`); // Magenta  
      gradient.addColorStop(0.6, `rgba(0, 255, 128, ${alpha})`); // Green-cyan
      gradient.addColorStop(1, `rgba(0, 128, 255, ${alpha})`); // Blue

      // Create filled wave shape
      ctx.beginPath();
      ctx.moveTo(0, height); // Start from bottom left
      
      // Draw wave line
      for (let i = 0; i < wavePoints.length; i++) {
        const [x, y] = wavePoints[i];
        if (i === 0) {
          ctx.lineTo(x, y);
        } else {
          // Use quadratic curves for smoother lines
          const prevPoint = wavePoints[i - 1];
          const controlX = (prevPoint[0] + x) / 2;
          const controlY = (prevPoint[1] + y) / 2;
          ctx.quadraticCurveTo(prevPoint[0], prevPoint[1], controlX, controlY);
        }
      }
      
      // Complete the fill shape
      ctx.lineTo(width, height); // Bottom right
      ctx.lineTo(0, height); // Bottom left
      ctx.closePath();
      
      // Fill the wave
      ctx.fillStyle = gradient;
      ctx.fill();

      // Add glow effect when playing
      if (isPlayingRef.current) {
        ctx.save();
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 15;
        ctx.globalCompositeOperation = 'screen';
        
        // Draw thinner glowing line on top
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        
        for (let i = 0; i < wavePoints.length; i++) {
          const [x, y] = wavePoints[i];
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
        ctx.restore();
      }

      // Continue animation loop
      animationRef.current = requestAnimationFrame(animate);
    };

    // Start the animation loop
    animationRef.current = requestAnimationFrame(animate);

    // Set up ResizeObserver for better resize handling
    if (window.ResizeObserver) {
      resizeObserverRef.current = new ResizeObserver(() => {
        setupCanvas();
      });
      resizeObserverRef.current.observe(canvas);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, []); // Empty dependency array - only run once

  return (
    <div className="bg-black rounded p-4 neon-border">
      <canvas
        ref={canvasRef}
        className="w-full h-16 rounded"
        style={{ maxWidth: '100%', display: 'block' }}
        aria-hidden="true"
      />
    </div>
  );
}

export default memo(WaveformVisualizer);
