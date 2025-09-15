import { Settings } from "lucide-react";
import { memo } from "react";

function Header() {
  return (
    <header className="relative border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold glitch-effect neon-glow" data-text="ECHO VOID">
            <span className="text-primary">ECHO</span> 
            <span className="text-secondary">VOID</span>
          </h1>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-muted-foreground">
              <span className="text-accent">Neon Drift Mode</span>
            </div>
            <button className="neon-border px-3 py-1 text-xs hover:bg-primary hover:text-primary-foreground transition-all duration-200 neon-glow">
              <Settings className="w-3 h-3 mr-1" />CONFIG
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default memo(Header);
