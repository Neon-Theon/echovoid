import { Progress } from "@/components/ui/progress";

interface ProcessingStatusProps {
  current: number;
  total: number;
}

export default function ProcessingStatus({ current, total }: ProcessingStatusProps) {
  const percentage = (current / total) * 100;

  return (
    <section className="neon-border rounded bg-card p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/10 to-transparent animate-pulse"></div>
      <div className="relative z-10">
        <h3 className="text-lg font-semibold mb-4 flex items-center text-accent">
          <i className="fas fa-cog fa-spin mr-2"></i>
          NEURAL PATTERN EXTRACTION
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span>MusicBrainz Query</span>
            <span className="text-primary">{current}/{total} songs</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            Extracting: tempo 120-140 BPM, warm MFCC clusters, C-minor dominant...
          </div>
        </div>
      </div>
    </section>
  );
}
