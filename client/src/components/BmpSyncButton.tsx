import { useState, useEffect, useRef } from "react";
import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BmpSyncButtonProps {
  isPlaying: boolean;
  bpm: number;
  disabled?: boolean;
  onToggle: () => void;
}

export default function BmpSyncButton({ isPlaying, bpm, disabled = false, onToggle }: BmpSyncButtonProps) {
  const [pulseActive, setPulseActive] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);

  // Calculate beat interval from BPM (60 seconds / BPM = seconds per beat)
  const beatInterval = bpm > 0 ? (60 / bpm) * 1000 : 1000; // milliseconds per beat

  useEffect(() => {
    if (isPlaying && bpm > 0) {
      // Start the BMP synchronization
      intervalRef.current = setInterval(() => {
        setPulseActive(true);
        
        // Reset pulse after animation duration
        animationRef.current = window.setTimeout(() => {
          setPulseActive(false);
        }, 200); // Pulse duration: 200ms
      }, beatInterval);
    } else {
      // Stop synchronization when paused
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (animationRef.current) {
        clearTimeout(animationRef.current);
        animationRef.current = null;
      }
      setPulseActive(false);
    }

    // Cleanup on unmount or deps change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [isPlaying, beatInterval]);

  return (
    <Button
      data-testid="button-bmp-sync-play-pause"
      onClick={onToggle}
      disabled={disabled}
      className={`
        relative w-14 h-14 rounded-full transition-all duration-200 
        bg-gradient-to-r from-pink-500 to-purple-600 
        hover:from-pink-400 hover:to-purple-500
        disabled:opacity-50 disabled:cursor-not-allowed
        ${pulseActive ? 'animate-pulse' : ''}
        ${pulseActive ? 'shadow-[0_0_30px] shadow-pink-500/70' : 'shadow-[0_0_15px] shadow-pink-500/40'}
        ${pulseActive ? 'scale-110' : 'scale-100'}
        border-2 border-pink-400/50
        overflow-hidden
      `}
      size="default"
      variant="default"
    >
      {/* Pink neon glow ring */}
      <div 
        className={`
          absolute inset-0 rounded-full border-2 border-pink-400
          ${pulseActive ? 'animate-ping opacity-75' : 'opacity-30'}
        `}
      />
      
      {/* Inner icon */}
      <div className="relative z-10 flex items-center justify-center w-full h-full">
        {isPlaying ? (
          <Pause className="w-6 h-6 text-white drop-shadow-lg" fill="currentColor" />
        ) : (
          <Play className="w-6 h-6 text-white drop-shadow-lg ml-1" fill="currentColor" />
        )}
      </div>
      
      {/* Additional pulse ring for intense effect */}
      {pulseActive && (
        <div className="absolute inset-0 rounded-full bg-pink-500/20 animate-pulse" />
      )}
    </Button>
  );
}