import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";
import RecommendationFeed from "@/components/RecommendationFeed";
import type { Recommendation, PlaylistItem } from "@/lib/types";

interface RecommendationsPanelProps {
  sessionId: string;
  onPlay: (recommendation: Recommendation) => void;
  onFeedback: (recommendationId: string, liked: boolean) => void;
}

export default function RecommendationsPanel({ 
  sessionId, 
  onPlay, 
  onFeedback 
}: RecommendationsPanelProps) {
  // Get recommendations with error boundary integration
  const { data: recommendations = [] } = useQuery({
    queryKey: ["/api/recommendations", sessionId],
    enabled: !!sessionId,
  }) as { data: Recommendation[] };

  // Get playlist data to track liked recommendations
  const { data: playlist = [] } = useQuery({
    queryKey: ["/api/playlist", sessionId],
    enabled: !!sessionId,
  }) as { data: PlaylistItem[] };

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <RecommendationFeed 
      recommendations={recommendations}
      playlist={playlist}
      onPlay={onPlay}
      onFeedback={onFeedback}
    />
  );
}