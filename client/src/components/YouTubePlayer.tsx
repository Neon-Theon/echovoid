import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import WaveformVisualizer from "@/components/WaveformVisualizer";
import { CanvasErrorBoundary } from "@/components/ErrorBoundary";
import { Music, Play, Pause, SkipBack, SkipForward, VolumeX, Volume2, X, Heart, Loader2, WifiOff } from "lucide-react";
import BmpSyncButton from "@/components/BmpSyncButton";
import type { Recommendation, PlaylistItem, SonicProfile } from "@/lib/types";

interface YouTubePlayerProps {
  track: Recommendation;
  playlist: PlaylistItem[];
  sessionId: string;
  onNext: () => void;
  onPrevious?: () => void;
  onFeedback: (recommendationId: string, liked: boolean) => void;
}

export default function YouTubePlayer({ track, playlist, sessionId, onNext, onPrevious, onFeedback }: YouTubePlayerProps) {
  // Check if current track is liked (in playlist)
  const isTrackLiked = playlist.some(item => item.recommendation.id === track.id);
  
  // Get sonic profile to extract BPM for beat synchronization
  const { data: sonicProfile } = useQuery({
    queryKey: ["/api/sonic-profile", sessionId],
    enabled: !!sessionId,
  }) as { data: SonicProfile };
  
  // Extract BPM value from tempo string (e.g., "120.5 BPM" → 120.5)
  const getBpmFromTempo = (tempo: string): number => {
    if (!tempo) return 120; // Default BPM if no data
    const match = tempo.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 120;
  };
  
  const currentBpm = sonicProfile?.tempo ? getBpmFromTempo(sonicProfile.tempo) : 120;
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isLoading, setIsLoading] = useState(true);
  const [playerReady, setPlayerReady] = useState(false);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'failed' | 'disconnected'>('disconnected');
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const handshakeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const playerReadyRef = useRef(false);
  const connectionStateRef = useRef<'connecting' | 'connected' | 'failed' | 'disconnected'>('disconnected');
  const shouldAutoplayRef = useRef(true); // Auto-start new tracks
  const maxRetries = 3;

  // Create audio-only YouTube URL
  const getAudioUrl = (videoId: string) => {
    const origin = encodeURIComponent(window.location.origin);
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&disablekb=1&fs=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&playsinline=1&enablejsapi=1&origin=${origin}`;
  };

  // Sync refs with state
  useEffect(() => {
    playerReadyRef.current = playerReady;
  }, [playerReady]);

  useEffect(() => {
    connectionStateRef.current = connectionState;
  }, [connectionState]);

  // Progress tracking functions
  const startProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) return;
    
    progressIntervalRef.current = setInterval(() => {
      if (iframeRef.current && playerReadyRef.current) {
        iframeRef.current.contentWindow?.postMessage(JSON.stringify({event:"command",func:"getCurrentTime",args:[]}), 'https://www.youtube.com');
      }
    }, 1000);
  }, []);

  const stopProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  // Clean up all timers and intervals
  const cleanup = useCallback(() => {
    stopProgressTracking();
    if (handshakeTimeoutRef.current) {
      clearTimeout(handshakeTimeoutRef.current);
      handshakeTimeoutRef.current = null;
    }
    retryCountRef.current = 0;
  }, [stopProgressTracking]);

  // Handshake logic with exponential backoff - stable function
  const initiateHandshake = useCallback(() => {
    if (!iframeRef.current || retryCountRef.current >= maxRetries) {
      setConnectionState('failed');
      setIsLoading(false);
      return;
    }

    setConnectionState('connecting');
    connectionStateRef.current = 'connecting';
    
    // First establish communication
    iframeRef.current.contentWindow?.postMessage(JSON.stringify({event:"listening", id:"echo-void-player"}), 'https://www.youtube.com');
    
    // Register for essential events after small delay
    setTimeout(() => {
      if (iframeRef.current) {
        iframeRef.current.contentWindow?.postMessage(JSON.stringify({event:"command",func:"addEventListener",args:["onReady"]}), 'https://www.youtube.com');
        iframeRef.current.contentWindow?.postMessage(JSON.stringify({event:"command",func:"addEventListener",args:["onStateChange"]}), 'https://www.youtube.com');
        iframeRef.current.contentWindow?.postMessage(JSON.stringify({event:"command",func:"addEventListener",args:["infoDelivery"]}), 'https://www.youtube.com');
      }
    }, 100);

    // Set up timeout with exponential backoff
    const timeoutDuration = Math.min(3000 * Math.pow(2, retryCountRef.current), 10000);
    handshakeTimeoutRef.current = setTimeout(() => {
      // Use refs to avoid stale state
      if (!playerReadyRef.current && connectionStateRef.current !== 'connected') {
        retryCountRef.current++;
        if (retryCountRef.current < maxRetries) {
          console.warn(`YouTube connection attempt ${retryCountRef.current}/${maxRetries} failed, retrying...`);
          initiateHandshake();
        } else {
          console.error('YouTube connection failed after maximum retries');
          setConnectionState('failed');
          setIsLoading(false);
        }
      }
    }, timeoutDuration);
  }, [maxRetries]);

  // Handle YouTube API messages - stable function
  const handleMessage = useCallback((event: MessageEvent) => {
    if (event.origin !== 'https://www.youtube.com') return;

    try {
      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      
      if (data.event === 'onReady') {
        setPlayerReady(true);
        setConnectionState('connected');
        setIsLoading(false);
        playerReadyRef.current = true;
        connectionStateRef.current = 'connected';
        retryCountRef.current = 0;
        
        // Clear handshake timeout since we received onReady
        if (handshakeTimeoutRef.current) {
          clearTimeout(handshakeTimeoutRef.current);
          handshakeTimeoutRef.current = null;
        }
        
        // Get initial video info
        if (iframeRef.current) {
          iframeRef.current.contentWindow?.postMessage(JSON.stringify({event:"command",func:"getDuration",args:[]}), 'https://www.youtube.com');
          iframeRef.current.contentWindow?.postMessage(JSON.stringify({event:"command",func:"setVolume",args:[volumeRef.current]}), 'https://www.youtube.com');
          
          // Explicit autoplay fallback for browser policy compliance
          if (shouldAutoplayRef.current) {
            setTimeout(() => {
              iframeRef.current?.contentWindow?.postMessage(JSON.stringify({event:"command",func:"playVideo",args:[]}), 'https://www.youtube.com');
            }, 500); // Small delay to ensure iframe is fully ready
          }
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
          onNextRef.current(); // Auto-advance to next track
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
  }, []); // Empty deps - use refs for mutable values

  // Store current values in refs for use in handleMessage
  const volumeRef = useRef(volume);
  const onNextRef = useRef(onNext);
  
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);
  
  useEffect(() => {
    onNextRef.current = onNext;
  }, [onNext]);

  // Initialize YouTube player when track changes - ONLY depend on track.videoId
  useEffect(() => {
    if (!track.videoId) {
      setIsLoading(false);
      setPlayerReady(false);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setConnectionState('disconnected');
      playerReadyRef.current = false;
      connectionStateRef.current = 'disconnected';
      cleanup();
      return;
    }

    // Reset player state for new track
    setIsLoading(true);
    setPlayerReady(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setConnectionState('disconnected');
    playerReadyRef.current = false;
    connectionStateRef.current = 'disconnected';
    retryCountRef.current = 0;
    shouldAutoplayRef.current = true; // Enable autoplay for new track
    cleanup();

    // Start handshake after short delay to ensure iframe is loaded
    const initTimer = setTimeout(() => {
      initiateHandshake();
    }, 200);

    return () => {
      clearTimeout(initTimer);
      cleanup();
    };
  }, [track.videoId]); // ONLY track.videoId dependency

  // Set up global message listener - stable
  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []); // Empty deps - stable listener

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
        <Music className="text-primary mr-2 w-5 h-5" />
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
          <CanvasErrorBoundary key={track.id}>
            <WaveformVisualizer isPlaying={isPlaying} />
          </CanvasErrorBoundary>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span className="text-accent">
              {!track.videoId ? "◯ OFFLINE" : 
               connectionState === 'failed' ? "◆ FAILED" :
               connectionState === 'connecting' ? "◔ CONNECTING" :
               playerReady ? (isPlaying ? "◉ PLAYING" : "◎ READY") : "◔ LOADING"}
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
              <SkipBack className="w-4 h-4" />
            </Button>
          )}
          
          {isLoading ? (
            <Button
              data-testid="button-toggle-playback-loading"
              disabled={true}
              className="neon-border w-12 h-12 rounded-full opacity-50"
              variant="outline"
            >
              <Loader2 className="w-5 h-5 animate-spin" />
            </Button>
          ) : (
            <BmpSyncButton
              isPlaying={isPlaying}
              bpm={currentBpm}
              disabled={!track.videoId || !playerReady}
              onToggle={togglePlayback}
            />
          )}
          
          <Button
            data-testid="button-next-track"
            onClick={onNext}
            className="neon-border w-10 h-10 rounded-full hover:bg-primary hover:text-primary-foreground transition-all duration-200 neon-glow"
            size="sm"
            variant="outline"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center space-x-2">
          <VolumeX className="text-muted-foreground w-4 h-4" />
          <Slider
            value={[volume]}
            onValueChange={handleVolumeChange}
            max={100}
            step={1}
            className="flex-1"
          />
          <Volume2 className="text-muted-foreground w-4 h-4" />
          <span className="text-xs text-muted-foreground w-8">{volume}%</span>
        </div>

        {/* Feedback Section */}
        <div className="flex justify-center space-x-4 pt-2">
          <Button
            data-testid={`button-dislike-track-${track.id}`}
            onClick={() => onFeedback(track.id, false)}
            className="neon-border px-6 py-3 rounded-lg hover:bg-destructive hover:text-destructive-foreground transition-all duration-200 neon-glow font-semibold"
            size="default"
            variant="outline"
          >
            <X className="w-5 h-5 mr-2" />
            VOID
          </Button>
          <Button
            data-testid={`button-like-track-${track.id}`}
            onClick={() => onFeedback(track.id, true)}
            className={`neon-border px-6 py-3 rounded-lg transition-all duration-200 neon-glow font-semibold ${
              isTrackLiked 
                ? "bg-secondary text-secondary-foreground border-secondary shadow-[0_0_15px] shadow-secondary/50" 
                : "hover:bg-secondary hover:text-secondary-foreground"
            }`}
            size="default"
            variant={isTrackLiked ? "default" : "outline"}
          >
            <Heart className={`w-5 h-5 mr-2 ${isTrackLiked ? "fill-current" : ""}`} />
            ECHO
          </Button>
        </div>

        {/* Connection Status */}
        {!track.videoId && (
          <div className="text-center p-3 bg-muted/20 rounded">
            <div className="text-sm text-muted-foreground">
              <WifiOff className="w-4 h-4 mr-1 inline" />
              Audio stream unavailable
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
