import { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const details =
        import.meta.env.DEV && this.state.error
          ? `${this.state.error.name}: ${this.state.error.message}`
          : null;

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">
              An error occurred. Please try again later.
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              An unexpected error occurred. Please try again.
            </p>
            {details && (
              <pre className="text-left text-xs bg-muted/30 border border-border rounded-lg p-3 mb-4 overflow-auto max-h-40 whitespace-pre-wrap">
                {details}
              </pre>
            )}
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
