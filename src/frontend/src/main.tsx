import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[Worduel] App crashed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            background: "#0f1117",
            color: "#f8fafc",
            flexDirection: "column",
            gap: "16px",
            padding: "24px",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ fontSize: "2.5rem" }}>&#x26A0;&#xFE0F;</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>
            Something went wrong.
          </div>
          <div
            style={{
              fontSize: "0.9rem",
              color: "#94a3b8",
              maxWidth: "320px",
            }}
          >
            Please refresh the page to try again.
          </div>
          {this.state.error && (
            <div
              style={{
                fontSize: "0.75rem",
                color: "#64748b",
                maxWidth: "400px",
                wordBreak: "break-word",
                background: "#0f172a",
                padding: "8px 12px",
                borderRadius: "6px",
                fontFamily: "monospace",
              }}
            >
              {this.state.error.message}
            </div>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: "8px",
              padding: "12px 32px",
              background: "#d4a72c",
              color: "#0f172a",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: 700,
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>,
);
