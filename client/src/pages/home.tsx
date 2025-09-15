import { useState, useEffect, useCallback } from "react";
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
import type { Song, Recommendation, ProcessingStatus as ProcessingStatusType, PlaylistItem } from "@/lib/types";

export default function Home() {
  const [sessionId, setSessionId] = useState<string>("");
  const [currentSongListId, setCurrentSongListId] = useState<string>("");
  const [currentTrack, setCurrentTrack] = useState<Recommendation | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
  const queryClient = useQueryClient();

  // Initialize session with localStorage persistence
  useEffect(() => {
    const initSession = async () => {
      try {
        // Check for existing session in localStorage
        const existingSessionId = localStorage.getItem("echo-void-session-id");
        if (existingSessionId) {
          console.log("Reusing existing session:", existingSessionId);
          setSessionId(existingSessionId);
          return;
        }

        // Create new session if none exists
        const response = await apiRequest("POST", "/api/session");
        const session = await response.json();
        setSessionId(session.id);
        localStorage.setItem("echo-void-session-id", session.id);
        console.log("Created new session:", session.id);
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
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentSongListId(data.songListId);
      queryClient.invalidateQueries({ queryKey: ["/api/processing-status", sessionId] });
      // Also invalidate sonic profile to refresh it after processing
      queryClient.invalidateQueries({ queryKey: ["/api/sonic-profile", sessionId] });
    },
    onError: async (error, variables) => {
      console.error("Failed to process songs:", error);
      console.error("Error details:", error.message);
      
      // If session not found, create a new session and retry
      if (error.message && error.message.includes("Session not found")) {
        console.log("Session expired, creating new session and retrying...");
        try {
          const response = await apiRequest("POST", "/api/session");
          const session = await response.json();
          setSessionId(session.id);
          localStorage.setItem("echo-void-session-id", session.id);
          console.log("Created new session after expiry:", session.id);
          // Retry the mutation with the same variables
          processMutation.mutate(variables);
        } catch (sessionError) {
          console.error("Failed to create new session:", sessionError);
        }
      }
    }
  });

  // Get processing status
  const { data: processingStatus } = useQuery({
    queryKey: ["/api/processing-status", sessionId],
    enabled: !!sessionId,
    refetchInterval: (q) => ((q.state.data as any)?.status === "processing" ? 2000 : false),
  }) as { data: ProcessingStatusType };

  // Get playlist data for ECHO button persistence
  const { data: playlist = [] } = useQuery({
    queryKey: ["/api/playlist", sessionId],
    enabled: !!sessionId,
  }) as { data: PlaylistItem[] };

  // Invalidate sonic profile when processing completes
  useEffect(() => {
    if (processingStatus?.status === "completed" && sessionId) {
      queryClient.invalidateQueries({ queryKey: ["/api/sonic-profile", sessionId] });
    }
  }, [processingStatus?.status, sessionId, queryClient]);

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

  // Get current recommendations to manage playlist navigation
  const { data: recommendations = [] } = useQuery({
    queryKey: ["/api/recommendations", sessionId],
    enabled: !!sessionId,
  }) as { data: Recommendation[] };

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

  // Note: Auto-start after auto-generation is now handled directly in handleNextTrack
  // to avoid race conditions and ensure reliable triggering

  const handleSongSubmit = useCallback((songs: Song[]) => {
    if (!sessionId) {
      console.error("No session ID available!");
      return;
    }
    console.log("Submitting songs for processing with session:", sessionId);
    processMutation.mutate(songs);
  }, [sessionId, processMutation]);

  const handleGenerateRecommendations = useCallback(() => {
    if (currentSongListId) {
      recommendationsMutation.mutate();
    }
  }, [currentSongListId, recommendationsMutation]);

  const handlePlayTrack = useCallback((recommendation: Recommendation) => {
    const index = recommendations.findIndex(r => r.id === recommendation.id);
    setCurrentTrack(recommendation);
    setCurrentTrackIndex(index);
  }, [recommendations]);

  const handlePreviousTrack = useCallback(() => {
    if (recommendations.length === 0) return;
    
    const newIndex = currentTrackIndex - 1;
    if (newIndex >= 0) {
      const prevTrack = recommendations[newIndex];
      setCurrentTrack(prevTrack);
      setCurrentTrackIndex(newIndex);
    } else {
      // At the beginning - could loop to end or exit
      setCurrentTrack(null);
      setCurrentTrackIndex(-1);
    }
  }, [recommendations, currentTrackIndex]);

  const handleNextTrack = useCallback(async () => {
    // Prevent concurrent requests
    if (recommendationsMutation.isPending) return;
    
    if (recommendations.length === 0) {
      setCurrentTrack(null);
      setCurrentTrackIndex(-1);
      return;
    }
    
    const newIndex = currentTrackIndex + 1;
    
    // If we have more tracks in current recommendations, play next
    if (newIndex < recommendations.length) {
      const nextTrack = recommendations[newIndex];
      setCurrentTrack(nextTrack);
      setCurrentTrackIndex(newIndex);
    } else {
      // Reached end of recommendations - auto-generate new ones
      console.log("End of recommendations reached, generating new ones...");
      try {
        if (currentSongListId) {
          // Reset state before generating to ensure clean auto-start
          setCurrentTrack(null);
          setCurrentTrackIndex(-1);
          
          await recommendationsMutation.mutateAsync();
          console.log("New recommendations generated successfully");
          
          // Get fresh recommendations and auto-start first track
          const freshRecommendations = queryClient.getQueryData(["/api/recommendations", sessionId]) as Recommendation[];
          if (freshRecommendations && freshRecommendations.length > 0) {
            console.log("Auto-starting first new recommendation after playlist exhaustion");
            setCurrentTrack(freshRecommendations[0]);
            setCurrentTrackIndex(0);
          }
        } else {
          // No more recommendations and can't generate - exit player
          setCurrentTrack(null);
          setCurrentTrackIndex(-1);
        }
      } catch (error) {
        console.error("Failed to generate new recommendations:", error);
        // Exit player on error
        setCurrentTrack(null);
        setCurrentTrackIndex(-1);
      }
    }
  }, [recommendations, currentTrackIndex, currentSongListId, recommendationsMutation, queryClient, sessionId]);

  const handleFeedback = useCallback((recommendationId: string, liked: boolean) => {
    feedbackMutation.mutate({ recommendationId, liked });
  }, [feedbackMutation]);

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
                playlist={playlist}
                sessionId={sessionId}
                onNext={handleNextTrack}
                onPrevious={handlePreviousTrack}
                onFeedback={handleFeedback}
              />
            </PlayerErrorBoundary>
          ) : (
            <SongInput 
              onSubmit={handleSongSubmit}
              isProcessing={processMutation.isPending || !sessionId}
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
