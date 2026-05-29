import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? "production",
    release: import.meta.env.VITE_APP_VERSION,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

/* Global styles before App so a parse/runtime error in the app tree does not leave a blank white page. */
import "./styles/index.css";
import { installViewportLayoutSync } from "./viewportLayoutSync";

installViewportLayoutSync();
import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { RootErrorBoundary } from "./components/RootErrorBoundary";
import { AuthProvider } from "./context/AuthContext";

const App = lazy(() => import("./App"));

function AppLoadingFallback() {
  return (
    <div className="screen-message" role="status" aria-live="polite">
      Loading app…
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <RootErrorBoundary>
    <React.StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<AppLoadingFallback />}>
            <App />
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>
  </RootErrorBoundary>
);
