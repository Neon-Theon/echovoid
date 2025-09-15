import { Button } from "@/components/ui/button";
import { Wand2, Play, Heart, X } from "lucide-react";
import type { Recommendation } from "@/lib/types";

interface RecommendationFeedProps {
  recommendations: Recommendation[];
  onPlay: (recommendation: Recommendation) => void;
  onFeedback: (recommendationId: string, liked: boolean) => void;
}

export default function RecommendationFeed({ 
  recommendations, 
  onPlay, 
  onFeedback 
}: RecommendationFeedProps) {
  return (
    <section className="neon-border rounded bg-card p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <Wand2 className="text-secondary mr-2 w-5 h-5" />
        AI SONIC DISCOVERIES
      </h2>
      
      <div className="space-y-4">
        {recommendations.map((rec) => (
          <div 
            key={rec.id}
            className="neon-border rounded bg-muted/20 p-4 hover:bg-muted/40 transition-all duration-200 group"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-lg">{rec.artist}</h3>
                <p className="text-muted-foreground">{rec.title}</p>
              </div>
              <div className="flex space-x-2">
                <Button
                  data-testid={`button-play-${rec.id}`}
                  onClick={() => onPlay(rec)}
                  className="neon-border p-2 rounded hover:bg-primary hover:text-primary-foreground transition-all duration-200 neon-glow"
                  size="sm"
                  variant="outline"
                >
                  <Play className="w-4 h-4" />
                </Button>
                <Button
                  data-testid={`button-void-${rec.id}`}
                  onClick={() => onFeedback(rec.id, false)}
                  className="neon-border px-3 py-2 rounded hover:bg-destructive hover:text-destructive-foreground transition-all duration-200 neon-glow"
                  size="sm"
                  variant="outline"
                >
                  <X className="w-3 h-3 mr-1" />
                  VOID
                </Button>
                <Button
                  data-testid={`button-echo-${rec.id}`}
                  onClick={() => onFeedback(rec.id, true)}
                  className="neon-border px-3 py-2 rounded hover:bg-secondary hover:text-secondary-foreground transition-all duration-200 neon-glow"
                  size="sm"
                  variant="outline"
                >
                  <Heart className="w-3 h-3 mr-1" />
                  ECHO
                </Button>
              </div>
            </div>
            <div className="text-sm text-accent bg-accent/10 rounded p-2 font-mono">
              <strong>Sonic Match:</strong> {rec.sonicMatch}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
