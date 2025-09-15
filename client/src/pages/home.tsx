import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/Header";
import SongInput from "@/components/SongInput";
import ProcessingStatus from "@/components/ProcessingStatus";
import RecommendationsPanel from "@/components/RecommendationsPanel";
import YouTubePlayer from "@/components/YouTubePlayer";
import VoidPlaylist from "@/components/VoidPlaylist";
import SonicProfile from "@/components/SonicProfile";
import SystemStatus from "@/components/SystemStatus";
import { ErrorBoundary, PlayerErrorBoundary, DataErrorBoundary } from "@/components/ErrorBoundary";
import type { Song, Recommendation, ProcessingStatus as ProcessingStatusType } from "@/lib/types";

export default function Home() {
  const [sessionId, setSessionId] = useState<string>("");
  const [currentSongListId, setCurrentSongListId] = useState<string>("");
  const [currentTrack, setCurrentTrack] = useState<Recommendation | null>(null);
  const queryClient = useQueryClient();

  // Initialize session
  useEffect(() => {
    const initSession = async () => {
      try {
        const response = await apiRequest("POST", "/api/session");
        const session = await response.json();
        setSessionId(session.id);
      } catch (error) {
        console.error("Failed to create session:", error);
      }
    };
    
    initSession();
  }, []);

  // Process song list mutation
  const processMutation = useMutation({
    mutationFn: async (songs: Song[]) => {
      const response = await apiRequest("POST", "/api/process-list", {
        sessionId,
        songs
      });
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentSongListId(data.songListId);
      queryClient.invalidateQueries({ queryKey: ["/api/processing-status", sessionId] });
    },
    onError: (error) => {
      console.error("Failed to process songs:", error);
    }
  });

  // Get processing status
  const { data: processingStatus } = useQuery({
    queryKey: ["/api/processing-status", sessionId],
    enabled: !!sessionId,
    refetchInterval: (q) => ((q.state.data as any)?.status === "processing" ? 2000 : false),
  }) as { data: ProcessingStatusType };

  // Generate recommendations mutation
  const recommendationsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/recommendations", {
        sessionId,
        songListId: currentSongListId
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations", sessionId] });
    }
  });

  // Recommendations are now handled by RecommendationsPanel component

  // Submit feedback mutation
  const feedbackMutation = useMutation({
    mutationFn: async ({ recommendationId, liked }: { recommendationId: string; liked: boolean }) => {
      const response = await apiRequest("POST", "/api/feedback", {
        sessionId,
        recommendationId,
        liked
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlist", sessionId] });
    }
  });

  const handleSongSubmit = (songs: Song[]) => {
    if (!sessionId) {
      console.error("No session ID available!");
      return;
    }
    processMutation.mutate(songs);
  };

  const handleGenerateRecommendations = () => {
    if (currentSongListId) {
      recommendationsMutation.mutate();
    }
  };

  const handlePlayTrack = (recommendation: Recommendation) => {
    setCurrentTrack(recommendation);
  };

  const handlePreviousTrack = () => {
    // Previous track functionality is now handled by the RecommendationsPanel
    setCurrentTrack(null);
  };

  const handleNextTrack = () => {
    // Next track functionality is now handled by the RecommendationsPanel  
    setCurrentTrack(null);
  };

  const handleFeedback = (recommendationId: string, liked: boolean) => {
    feedbackMutation.mutate({ recommendationId, liked });
  };

  const showProcessing = processingStatus?.status === "processing";
  const canGenerateRecommendations = processingStatus?.status === "completed" && currentSongListId;

  return (
    <div className="min-h-screen">
      <Header />
      
      <div className="container mx-auto px-4 py-6 grid lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Music Player replaces SongInput when track is active */}
          {currentTrack ? (
            <PlayerErrorBoundary key={currentTrack.id} onRetry={() => setCurrentTrack(null)}>
              <YouTubePlayer 
                track={currentTrack}
                onNext={handleNextTrack}
                onPrevious={handlePreviousTrack}
                onFeedback={handleFeedback}
              />
            </PlayerErrorBoundary>
          ) : (
            <SongInput 
              onSubmit={handleSongSubmit}
              isProcessing={processMutation.isPending}
            />
          )}

          {showProcessing && (
            <ProcessingStatus 
              current={Math.floor(Math.random() * 400) + 100}
              total={processingStatus.totalSongs || 500}
            />
          )}

          {canGenerateRecommendations && (
            <div className="neon-border rounded bg-card p-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-4 text-accent">
                  Neural Patterns Extracted Successfully
                </h3>
                <button
                  data-testid="button-generate-recommendations"
                  onClick={handleGenerateRecommendations}
                  disabled={recommendationsMutation.isPending}
                  className="bg-primary text-primary-foreground py-3 px-6 rounded font-semibold hover:bg-primary/80 transition-all duration-200 neon-glow disabled:opacity-50"
                >
                  {recommendationsMutation.isPending ? "Generating..." : "Generate AI Recommendations"}
                </button>
              </div>
            </div>
          )}

          <DataErrorBoundary key={`recs-${sessionId}`} onRetry={() => queryClient.invalidateQueries({ queryKey: ["/api/recommendations", sessionId] })}>
            <RecommendationsPanel 
              sessionId={sessionId}
              onPlay={handlePlayTrack}
              onFeedback={handleFeedback}
            />
          </DataErrorBoundary>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <DataErrorBoundary key={`sonic-${sessionId}`} onRetry={() => queryClient.invalidateQueries({ queryKey: ["/api/sonic-profile", sessionId] })}>
            <SonicProfile sessionId={sessionId} />
          </DataErrorBoundary>
          <DataErrorBoundary key={`playlist-${sessionId}`} onRetry={() => queryClient.invalidateQueries({ queryKey: ["/api/playlist", sessionId] })}>
            <VoidPlaylist sessionId={sessionId} onPlay={handlePlayTrack} />
          </DataErrorBoundary>
          <ErrorBoundary>
            <SystemStatus 
              sessionId={sessionId}
              processedTracks={processingStatus?.totalSongs || 0}
            />
          </ErrorBoundary>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-background/90 backdrop-blur-sm py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <div className="glitch-effect inline-block" data-text="ECHO VOID">
            <span className="text-primary">ECHO</span> <span className="text-secondary">VOID</span>
          </div>
          <div className="mt-2">Neural Music Discovery System v2.1.0</div>
        </div>
      </footer>
    </div>
  );
}
