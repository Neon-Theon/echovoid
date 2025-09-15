import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { Song } from "@/lib/types";

interface SongInputProps {
  onSubmit: (songs: Song[]) => void;
  isProcessing: boolean;
}

export default function SongInput({ onSubmit, isProcessing }: SongInputProps) {
  const [input, setInput] = useState("");

  const handleSubmit = () => {
    if (!input.trim()) return;

    const lines = input.split('\n').filter(line => line.trim());
    const songs: Song[] = [];

    for (const line of lines) {
      const match = line.match(/^(.+?)\s*[-–]\s*(.+?)$/);
      if (match) {
        const [, artist, title] = match;
        songs.push({
          artist: artist.trim(),
          title: title.trim()
        });
      }
    }

    if (songs.length > 0) {
      onSubmit(songs.slice(0, 5000)); // Limit to 5000 songs
    }
  };

  const songCount = input.split('\n').filter(line => 
    line.trim() && line.match(/^(.+?)\s*[-–]\s*(.+?)$/)
  ).length;

  return (
    <section className="neon-border rounded bg-card p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent"></div>
      <div className="relative z-10">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <i className="fas fa-terminal text-primary mr-2"></i>
          SONIC ANALYSIS INPUT
          <span className="terminal-cursor ml-2"></span>
        </h2>
        <div className="space-y-4">
          <div className="bg-input neon-border rounded p-4">
            <label className="block text-sm text-muted-foreground mb-2">
              PASTE SONG LIST (MAX 5000 LINES) - FORMAT: Artist - Song Title
            </label>
            <Textarea
              data-testid="textarea-song-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full h-48 bg-transparent text-foreground font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring placeholder-muted-foreground border-0"
              placeholder="The Beatles - Hey Jude&#10;Pink Floyd - Wish You Were Here&#10;Radiohead - Paranoid Android&#10;Daft Punk - One More Time&#10;..."
            />
            {songCount > 0 && (
              <div className="mt-2 text-xs text-accent">
                Detected: {songCount} songs {songCount > 5000 && "(will process first 5000)"}
              </div>
            )}
          </div>
          <Button 
            data-testid="button-initiate-analysis"
            onClick={handleSubmit}
            disabled={isProcessing || songCount === 0}
            className="w-full bg-primary text-primary-foreground py-3 rounded font-semibold hover:bg-primary/80 transition-all duration-200 neon-glow flex items-center justify-center"
          >
            <i className="fas fa-brain mr-2"></i>
            {isProcessing ? "INITIALIZING..." : "INITIATE SONIC ANALYSIS"}
          </Button>
        </div>
      </div>
    </section>
  );
}
