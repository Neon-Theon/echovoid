import { Button } from "@/components/ui/button";
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
        <i className="fas fa-magic text-secondary mr-2"></i>
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
                  <i className="fas fa-play"></i>
                </Button>
                <Button
                  data-testid={`button-like-${rec.id}`}
                  onClick={() => onFeedback(rec.id, true)}
                  className="neon-border p-2 rounded hover:bg-secondary hover:text-secondary-foreground transition-all duration-200 neon-glow"
                  size="sm"
                  variant="outline"
                >
                  <i className="fas fa-heart"></i>
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
