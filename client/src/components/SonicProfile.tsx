import { useQuery } from "@tanstack/react-query";
import type { SonicProfile as SonicProfileType } from "@/lib/types";

interface SonicProfileProps {
  sessionId: string;
}

export default function SonicProfile({ sessionId }: SonicProfileProps) {
  const { data: profile } = useQuery({
    queryKey: ["/api/sonic-profile", sessionId],
    enabled: !!sessionId,
    refetchInterval: 10000, // Refresh every 10 seconds
  }) as { data: SonicProfileType };

  if (!profile) {
    return (
      <section className="neon-border rounded bg-card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <i className="fas fa-chart-bar text-accent mr-2"></i>
          SONIC PROFILE
        </h2>
        <div className="text-center text-muted-foreground py-8">
          <i className="fas fa-brain text-4xl mb-4 opacity-30"></i>
          <div>Analyzing neural patterns...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="neon-border rounded bg-card p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center">
        <i className="fas fa-chart-bar text-accent mr-2"></i>
        SONIC PROFILE
      </h2>
      <div className="space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span>Avg Tempo</span>
          <span className="text-primary font-mono" data-testid="text-tempo">{profile.tempo}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span>Harmonic Base</span>
          <span className="text-accent font-mono" data-testid="text-key">{profile.key}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span>Spectral Centroid</span>
          <span className="text-secondary font-mono" data-testid="text-centroid">{profile.centroid}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span>Timbre Warmth</span>
          <span className="text-primary font-mono" data-testid="text-warmth">{profile.warmth}</span>
        </div>
        <div className="mt-4 p-3 bg-accent/10 rounded text-xs">
          <div className="text-accent font-semibold mb-1">Current Archetype:</div>
          <div data-testid="text-archetype" className="font-mono">{profile.archetype}</div>
        </div>
      </div>
    </section>
  );
}
