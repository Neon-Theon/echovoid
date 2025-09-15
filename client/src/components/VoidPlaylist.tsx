import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { List, Heart, Play } from "lucide-react";
import type { Recommendation, PlaylistItem } from "@/lib/types";

interface VoidPlaylistProps {
  sessionId: string;
  onPlay: (recommendation: Recommendation) => void;
}

export default function VoidPlaylist({ sessionId, onPlay }: VoidPlaylistProps) {
  const { data: playlist = [] } = useQuery({
    queryKey: ["/api/playlist", sessionId],
    enabled: !!sessionId,
  }) as { data: PlaylistItem[] };

  const handleExport = async (format: 'json' | 'txt') => {
    try {
      const response = await fetch(`/api/export-playlist/${sessionId}?format=${format}`);
      const blob = await response.blob();
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `echo-void-playlist.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <section className="neon-border rounded bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center">
          <List className="text-primary mr-2 w-5 h-5" />
          VOID PLAYLIST
        </h2>
        <div className="flex space-x-1">
          <Button
            data-testid="button-export-txt"
            onClick={() => handleExport('txt')}
            className="text-xs neon-border px-2 py-1 rounded hover:bg-muted transition-all duration-200"
            size="sm"
            variant="outline"
          >
            TXT
          </Button>
          <Button
            data-testid="button-export-json"
            onClick={() => handleExport('json')}
            className="text-xs neon-border px-2 py-1 rounded hover:bg-muted transition-all duration-200"
            size="sm"
            variant="outline"
          >
            JSON
          </Button>
        </div>
      </div>
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {playlist.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Heart className="w-16 h-16 mb-4 opacity-30 mx-auto" />
            <div>No tracks in playlist yet</div>
            <div className="text-xs">Like tracks to add them here</div>
          </div>
        ) : (
          playlist.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2 hover:bg-muted/20 rounded transition-all duration-200 group"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{item.recommendation.artist}</div>
                <div className="text-xs text-muted-foreground truncate">{item.recommendation.title}</div>
              </div>
              <Button
                data-testid={`button-play-playlist-${item.id}`}
                onClick={() => onPlay(item.recommendation)}
                className="opacity-0 group-hover:opacity-100 text-primary hover:text-primary/80 transition-all duration-200"
                size="sm"
                variant="ghost"
              >
                <Play className="w-3 h-3" />
              </Button>
            </div>
          ))
        )}
      </div>
      
      <div className="mt-4 text-xs text-muted-foreground text-center">
        <span data-testid="text-playlist-count">{playlist.length}</span> tracks discovered
      </div>
    </section>
  );
}
