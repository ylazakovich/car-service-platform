import * as Sentry from "@sentry/react";
import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Shows a readable error instead of a blank screen when React throws during initial render. */
export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("RootErrorBoundary:", error, info.componentStack);
    Sentry.captureException(error, {
      contexts: { react: { componentStack: info.componentStack } },
    });
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: "1rem",
            fontFamily: "system-ui, sans-serif",
            maxWidth: "42rem",
            margin: "0 auto",
            color: "#111",
            background: "#fff",
          }}
        >
          <h1 style={{ fontSize: "1.1rem" }}>App failed to load</h1>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: "12px",
              background: "#f5f5f5",
              padding: "0.75rem",
              borderRadius: "6px",
            }}
          >
            {this.state.error.message}
            {"\n\n"}
            {this.state.error.stack ?? ""}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
