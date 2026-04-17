import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.tsx"
import { HashRouter } from "react-router-dom"
import { init } from "@sentry/electron/renderer"
import { init as reactInit } from "@sentry/react"
import * as Sentry from "@sentry/react"
import "./i18n"

init(
  {
    dsn: "https://d1e8991c715dd717e6b7b44dbc5c43dd@o4509167771648000.ingest.us.sentry.io/4509167772958720",
    sendDefaultPii: true,
    replaysSessionSampleRate: 1.0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
  },
  reactInit,
)

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary
      fallback={
        <div className="min-h-screen bg-[#0A0A0C] text-white flex items-center justify-center p-8">
          <div className="w-full max-w-xl border border-white/10 bg-[#0F0F10] rounded-lg p-6">
            <h1 className="text-lg font-semibold">The UI encountered an error</h1>
            <p className="text-sm text-white/70 mt-2">
              VieXF recovered into safe mode. Please restart the app if this continues.
            </p>
          </div>
        </div>
      }
      showDialog={false}
    >
      <HashRouter>
        <App />
      </HashRouter>
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
)