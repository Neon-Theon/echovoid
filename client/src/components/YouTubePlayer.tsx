import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import WaveformVisualizer from "@/components/WaveformVisualizer";
import type { Recommendation } from "@/lib/types";

interface YouTubePlayerProps {
  track: Recommendation;
  onNext: () => void;
  onPrevious?: () => void;
  onFeedback: (recommendationId: string, liked: boolean) => void;
}

export default function YouTubePlayer({ track, onNext, onPrevious, onFeedback }: YouTubePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isLoading, setIsLoading] = useState(true);
  const [playerReady, setPlayerReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const handshakeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Create audio-only YouTube URL
  const getAudioUrl = (videoId: string) => {
    const origin = encodeURIComponent(window.location.origin);
    return `https://www.youtube.com/embed/${videoId}?autoplay=0&controls=0&disablekb=1&fs=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&playsinline=1&enablejsapi=1&origin=${origin}`;
  };

  // YouTube IFrame API message listener and state management
  useEffect(() => {
    if (!track.videoId) {
      setIsLoading(false);
      setPlayerReady(false);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (handshakeTimeoutRef.current) {
        clearTimeout(handshakeTimeoutRef.current);
        handshakeTimeoutRef.current = null;
      }
      return;
    }

    // Reset player state for new track
    setIsLoading(true);
    setPlayerReady(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    // Clear any existing handshake timeout
    if (handshakeTimeoutRef.current) {
      clearTimeout(handshakeTimeoutRef.current);
      handshakeTimeoutRef.current = null;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.youtube.com') return;

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        if (data.event === 'onReady') {
          setPlayerReady(true);
          setIsLoading(false);
          // Clear handshake timeout since we received onReady
          if (handshakeTimeoutRef.current) {
            clearTimeout(handshakeTimeoutRef.current);
            handshakeTimeoutRef.current = null;
          }
          // Get initial video info with correct array formatting
          if (iframeRef.current) {
            iframeRef.current.contentWindow?.postMessage(JSON.stringify({event:"command",func:"getDuration",args:[]}), 'https://www.youtube.com');
            iframeRef.current.contentWindow?.postMessage(JSON.stringify({event:"command",func:"setVolume",args:[volume]}), 'https://www.youtube.com');
          }
        } else if (data.event === 'onStateChange') {
          const state = data.info;
          
          // YouTube player states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
          if (state === 1) { // Playing
            setIsPlaying(true);
            startProgressTracking();
          } else if (state === 2) { // Paused
            setIsPlaying(false);
            stopProgressTracking();
          } else if (state === 0) { // Ended
            setIsPlaying(false);
            stopProgressTracking();
            onNext(); // Auto-advance to next track
          } else if (state === 3) { // Buffering
            setIsLoading(true);
          } else if (state === -1 || state === 5) { // Unstarted or Cued
            setIsLoading(false);
          }
        } else if (data.event === 'infoDelivery' && data.info) {
          if (data.info.duration !== undefined && data.info.duration !== null) {
            setDuration(data.info.duration);
          }
          if (data.info.currentTime !== undefined && data.info.currentTime !== null) {
            setCurrentTime(data.info.currentTime);
          }
        }
      } catch (error) {
        console.error('Error parsing YouTube API message:', error);
      }
    };

    const startProgressTracking = () => {
      if (progressIntervalRef.current) return;
      
      progressIntervalRef.current = setInterval(() => {
        if (iframeRef.current && playerReady) {
          iframeRef.current.contentWindow?.postMessage(JSON.stringify({event:"command",func:"getCurrentTime",args:[]}), 'https://www.youtube.com');
        }
      }, 1000);
    };

    const stopProgressTracking = () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };

    // Send initial handshake and register event listeners
    const initiateHandshake = () => {
      if (iframeRef.current) {
        // First establish communication
        iframeRef.current.contentWindow?.postMessage(JSON.stringify({event:"listening", id:"echo-void-player"}), 'https://www.youtube.com');
        
        // Register for essential events - critical for many environments
        setTimeout(() => {
          if (iframeRef.current) {
            iframeRef.current.contentWindow?.postMessage(JSON.stringify({event:"command",func:"addEventListener",args:["onReady"]}), 'https://www.youtube.com');
            iframeRef.current.contentWindow?.postMessage(JSON.stringify({event:"command",func:"addEventListener",args:["onStateChange"]}), 'https://www.youtube.com');
            iframeRef.current.contentWindow?.postMessage(JSON.stringify({event:"command",func:"addEventListener",args:["infoDelivery"]}), 'https://www.youtube.com');
          }
        }, 100);
      }
    };

    // Set up handshake with fallback timer
    const handshakeTimer = setTimeout(() => {
      initiateHandshake();
      // Set up fallback timer in case onReady never arrives
      handshakeTimeoutRef.current = setTimeout(() => {
        if (!playerReady) {
          console.warn('YouTube IFrame API handshake timeout, retrying...');
          initiateHandshake();
        }
      }, 3000);
    }, 100); // Small delay to ensure iframe is loaded

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
      stopProgressTracking();
      clearTimeout(handshakeTimer);
      if (handshakeTimeoutRef.current) {
        clearTimeout(handshakeTimeoutRef.current);
        handshakeTimeoutRef.current = null;
      }
    };
  }, [track.videoId, onNext]);

  const togglePlayback = () => {
    if (iframeRef.current && track.videoId && playerReady && !isLoading) {
      const iframe = iframeRef.current;
      if (isPlaying) {
        // Send pause command to iframe
        iframe.contentWindow?.postMessage(JSON.stringify({event:"command",func:"pauseVideo",args:[]}), 'https://www.youtube.com');
      } else {
        // Send play command to iframe
        iframe.contentWindow?.postMessage(JSON.stringify({event:"command",func:"playVideo",args:[]}), 'https://www.youtube.com');
      }
      // State will be updated via the message listener
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    if (iframeRef.current && playerReady) {
      iframeRef.current.contentWindow?.postMessage(JSON.stringify({event:"command",func:"setVolume",args:[value[0]]}), 'https://www.youtube.com');
    }
  };

  const handleSeek = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!playerReady || !duration || !iframeRef.current) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const progressPercent = clickX / rect.width;
    const seekTime = progressPercent * duration;
    
    // Send seek command to YouTube player (seekTime, allowSeekAhead)
    iframeRef.current.contentWindow?.postMessage(JSON.stringify({event:"command",func:"seekTo",args:[seekTime,true]}), 'https://www.youtube.com');
    setCurrentTime(seekTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <section className="neon-border rounded bg-card p-4">
      <h2 className="text-lg font-semibold mb-3 flex items-center">
        <i className="fas fa-music text-primary mr-2"></i>
        NOW PLAYING
      </h2>
      
      {/* YouTube iframe for audio - 1x1 with opacity 0 for better cross-browser compatibility */}
      {track.videoId && (
        <iframe
          ref={iframeRef}
          className="absolute top-0 left-0 pointer-events-none"
          style={{ width: '1px', height: '1px', opacity: 0 }}
          src={getAudioUrl(track.videoId)}
          allow="autoplay; encrypted-media"
          title={`Echo Void Player - ${track.artist} - ${track.title}`}
        />
      )}

      <div className="space-y-3">
        {/* Track Info */}
        <div className="text-center">
          <h3 className="font-bold text-lg text-primary">{track.artist}</h3>
          <p className="text-muted-foreground text-sm">{track.title}</p>
        </div>

        {/* Waveform Visualizer */}
        <div className="h-16">
          <WaveformVisualizer isPlaying={isPlaying} />
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span className="text-accent">
              {!track.videoId ? "◯ OFFLINE" : playerReady ? (isPlaying ? "◉ PLAYING" : "◎ READY") : "◔ LOADING"}
            </span>
            <span>{duration ? formatTime(duration) : "--:--"}</span>
          </div>
          <div 
            className="w-full h-2 bg-muted rounded cursor-pointer hover:bg-muted/80 transition-colors"
            onClick={handleSeek}
            data-testid="progress-bar-seek"
          >
            <div 
              className="h-full bg-primary rounded transition-all duration-200 neon-glow"
              style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {/* Player Controls */}
        <div className="flex items-center justify-center space-x-4">
          {onPrevious && (
            <Button
              data-testid="button-previous-track"
              onClick={onPrevious}
              className="neon-border w-10 h-10 rounded-full hover:bg-primary hover:text-primary-foreground transition-all duration-200 neon-glow"
              size="sm"
              variant="outline"
            >
              <i className="fas fa-step-backward"></i>
            </Button>
          )}
          
          <Button
            data-testid="button-toggle-playback"
            onClick={togglePlayback}
            disabled={!track.videoId || isLoading || !playerReady}
            className="neon-border w-12 h-12 rounded-full hover:bg-primary hover:text-primary-foreground transition-all duration-200 neon-glow"
            variant="outline"
          >
            {isLoading ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : (
              <i className={`fas fa-${isPlaying ? 'pause' : 'play'} text-lg`}></i>
            )}
          </Button>
          
          <Button
            data-testid="button-next-track"
            onClick={onNext}
            className="neon-border w-10 h-10 rounded-full hover:bg-primary hover:text-primary-foreground transition-all duration-200 neon-glow"
            size="sm"
            variant="outline"
          >
            <i className="fas fa-step-forward"></i>
          </Button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center space-x-2">
          <i className="fas fa-volume-down text-muted-foreground"></i>
          <Slider
            value={[volume]}
            onValueChange={handleVolumeChange}
            max={100}
            step={1}
            className="flex-1"
          />
          <i className="fas fa-volume-up text-muted-foreground"></i>
          <span className="text-xs text-muted-foreground w-8">{volume}%</span>
        </div>

        {/* Feedback Section */}
        <div className="flex justify-center space-x-3 pt-2">
          <Button
            data-testid={`button-dislike-track-${track.id}`}
            onClick={() => onFeedback(track.id, false)}
            className="neon-border px-4 py-2 rounded hover:bg-destructive hover:text-destructive-foreground transition-all duration-200 neon-glow"
            size="sm"
            variant="outline"
          >
            <i className="fas fa-times mr-1"></i>
            VOID
          </Button>
          <Button
            data-testid={`button-like-track-${track.id}`}
            onClick={() => onFeedback(track.id, true)}
            className="neon-border px-4 py-2 rounded hover:bg-secondary hover:text-secondary-foreground transition-all duration-200 neon-glow"
            size="sm"
            variant="outline"
          >
            <i className="fas fa-heart mr-1"></i>
            ECHO
          </Button>
        </div>

        {/* Connection Status */}
        {!track.videoId && (
          <div className="text-center p-3 bg-muted/20 rounded">
            <div className="text-sm text-muted-foreground">
              <i className="fas fa-wifi-slash mr-1"></i>
              Audio stream unavailable
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
