import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import WaveformVisualizer from "@/components/WaveformVisualizer";
import type { Recommendation } from "@/lib/types";

interface YouTubePlayerProps {
  track: Recommendation;
  onNext: () => void;
  onFeedback: (recommendationId: string, liked: boolean) => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function YouTubePlayer({ track, onNext, onFeedback }: YouTubePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!track.videoId) {
      setIsLoading(false);
      return;
    }

    // Load YouTube IFrame API
    if (!window.YT) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(script);
      
      window.onYouTubeIframeAPIReady = () => {
        initializePlayer();
      };
    } else {
      initializePlayer();
    }

    function initializePlayer() {
      if (containerRef.current && track.videoId) {
        // Clear existing player
        containerRef.current.innerHTML = '<div id="youtube-player"></div>';
        
        playerRef.current = new window.YT.Player('youtube-player', {
          videoId: track.videoId,
          width: '100%',
          height: '200',
          playerVars: {
            enablejsapi: 1,
            modestbranding: 1,
            rel: 0,
            controls: 1,
            autoplay: 0,
          },
          events: {
            onReady: () => {
              setIsLoading(false);
            },
            onStateChange: (event: any) => {
              setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
            },
          },
        });
      }
    }

    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
      }
    };
  }, [track.videoId]);

  const togglePlayback = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    }
  };

  return (
    <section className="neon-border rounded bg-card p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <i className="fas fa-headphones text-primary mr-2"></i>
        NEURAL PLAYBACK INTERFACE
      </h2>
      <div className="space-y-4">
        {/* Current Track Info */}
        <div className="flex items-center justify-between bg-muted/20 rounded p-4">
          <div>
            <h3 className="font-semibold">{track.artist}</h3>
            <p className="text-muted-foreground">{track.title}</p>
            <div className="text-xs text-accent">
              {track.videoId ? "Streaming via YouTube" : "Audio not available"}
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              data-testid="button-toggle-playback"
              onClick={togglePlayback}
              disabled={!track.videoId || isLoading}
              className="neon-border p-3 rounded hover:bg-primary hover:text-primary-foreground transition-all duration-200 neon-glow"
              size="sm"
              variant="outline"
            >
              <i className={`fas fa-${isPlaying ? 'pause' : 'play'}`}></i>
            </Button>
            <Button
              data-testid="button-next-track"
              onClick={onNext}
              className="neon-border p-3 rounded hover:bg-primary hover:text-primary-foreground transition-all duration-200 neon-glow"
              size="sm"
              variant="outline"
            >
              <i className="fas fa-forward"></i>
            </Button>
          </div>
        </div>

        {/* YouTube Player Embed */}
        <div className="relative bg-black rounded overflow-hidden neon-border aspect-video">
          {track.videoId ? (
            <div ref={containerRef} className="w-full h-full">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-4xl text-primary opacity-50">
                    <i className="fas fa-spinner fa-spin"></i>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl text-primary opacity-50 mb-4">
                  <i className="fas fa-exclamation-triangle"></i>
                </div>
                <div className="text-muted-foreground">
                  Video not available for this track
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Waveform Visualizer */}
        <WaveformVisualizer isPlaying={isPlaying} />

        {/* Feedback Section */}
        <div className="flex justify-center space-x-4">
          <Button
            data-testid={`button-dislike-track-${track.id}`}
            onClick={() => onFeedback(track.id, false)}
            className="neon-border px-6 py-2 rounded hover:bg-destructive hover:text-destructive-foreground transition-all duration-200 neon-glow"
            variant="outline"
          >
            <i className="fas fa-thumbs-down mr-2"></i>
            VOID
          </Button>
          <Button
            data-testid={`button-like-track-${track.id}`}
            onClick={() => onFeedback(track.id, true)}
            className="neon-border px-6 py-2 rounded hover:bg-secondary hover:text-secondary-foreground transition-all duration-200 neon-glow"
            variant="outline"
          >
            <i className="fas fa-heart mr-2"></i>
            ECHO
          </Button>
        </div>
      </div>
    </section>
  );
}
