import { Server } from "lucide-react";

interface SystemStatusProps {
  sessionId: string;
  processedTracks: number;
}

export default function SystemStatus({ sessionId, processedTracks }: SystemStatusProps) {
  // Simple status indicators - in a real app these could be dynamic
  const status = {
    geminiAI: 'ONLINE' as const,
    musicBrainz: 'CONNECTED' as const,
    youtubeAPI: 'ACTIVE' as const,
  };

  return (
    <section className="neon-border rounded bg-card p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center">
        <Server className="text-secondary mr-2 w-5 h-5" />
        SYSTEM STATUS
      </h2>
      <div className="space-y-3 text-sm font-mono">
        <div className="flex justify-between items-center">
          <span>Gemini AI</span>
          <span className="text-primary" data-testid="status-gemini">{status.geminiAI}</span>
        </div>
        <div className="flex justify-between items-center">
          <span>MusicBrainz</span>
          <span className="text-primary" data-testid="status-musicbrainz">{status.musicBrainz}</span>
        </div>
        <div className="flex justify-between items-center">
          <span>YouTube API</span>
          <span className="text-primary" data-testid="status-youtube">{status.youtubeAPI}</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Session</span>
          <span className="text-accent" data-testid="text-session-id">
            {sessionId ? `VX-${sessionId.slice(-4).toUpperCase()}` : 'INIT'}
          </span>
        </div>
        <div className="mt-4 text-xs text-muted-foreground">
          Neural patterns processed: <span className="text-primary" data-testid="text-processed-count">{processedTracks}</span> tracks
        </div>
      </div>
    </section>
  );
}
