import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackType?: 'default' | 'player' | 'canvas' | 'data';
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    this.props.onRetry?.();
  };

  private renderFallback() {
    const { fallbackType = 'default' } = this.props;
    const { error } = this.state;

    switch (fallbackType) {
      case 'player':
        return (
          <div className="neon-border rounded bg-card p-6">
            <div className="text-center space-y-4">
              <WifiOff className="w-12 h-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-destructive">Player Error</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Audio player encountered an issue
                </p>
              </div>
              <Button 
                onClick={this.handleRetry}
                className="neon-border"
                variant="outline"
                data-testid="button-retry-player"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Player
              </Button>
            </div>
          </div>
        );

      case 'canvas':
        return (
          <div className="h-16 bg-muted/20 rounded flex items-center justify-center">
            <div className="text-center">
              <AlertTriangle className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Visualization unavailable</p>
            </div>
          </div>
        );

      case 'data':
        return (
          <div className="neon-border rounded bg-card p-6">
            <div className="text-center space-y-4">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-destructive">Data Error</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Failed to load component data
                </p>
              </div>
              <Button 
                onClick={this.handleRetry}
                className="neon-border"
                variant="outline"
                data-testid="button-retry-data"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        );

      default:
        return (
          <div className="neon-border rounded bg-card p-6">
            <div className="text-center space-y-4">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-destructive">Something went wrong</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  {error?.message || 'An unexpected error occurred'}
                </p>
              </div>
              <Button 
                onClick={this.handleRetry}
                className="neon-border"
                variant="outline"
                data-testid="button-retry-default"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        );
    }
  }

  public render() {
    if (this.state.hasError) {
      return this.renderFallback();
    }

    return this.props.children;
  }
}

// Convenience wrapper components for common use cases
export function PlayerErrorBoundary({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
  return (
    <ErrorBoundary fallbackType="player" onRetry={onRetry}>
      {children}
    </ErrorBoundary>
  );
}

export function CanvasErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary fallbackType="canvas">
      {children}
    </ErrorBoundary>
  );
}

export function DataErrorBoundary({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
  return (
    <ErrorBoundary fallbackType="data" onRetry={onRetry}>
      {children}
    </ErrorBoundary>
  );
}