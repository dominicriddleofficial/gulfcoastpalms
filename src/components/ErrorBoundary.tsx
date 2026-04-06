import { Component, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);

    // Log to error_logs table for tracking
    supabase.from("error_logs").insert({
      error_message: error.message,
      error_stack: error.stack || "",
      component_stack: info.componentStack || "",
      page_url: window.location.href,
      user_agent: navigator.userAgent,
    }).then(() => {}, () => {});
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
          <span className="text-5xl mb-4">🌴</span>
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">
            Something went wrong
          </h1>
          <p className="font-body text-muted-foreground mb-6 max-w-md">
            We hit an unexpected error. Please try reloading the page or head back to the homepage.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-body font-semibold hover:bg-primary/90 transition-colors"
            >
              Reload Page
            </button>
            <a
              href="/"
              className="px-6 py-3 rounded-xl border border-border text-foreground font-body font-semibold hover:bg-secondary transition-colors"
            >
              Go Home
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
