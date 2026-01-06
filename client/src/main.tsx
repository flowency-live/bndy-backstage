import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setupChunkReloadHandler } from "./lib/chunk-reload-handler";

// DEBUG: Catch the enabled error via global error handler
window.addEventListener('error', (event) => {
  if (event.message?.includes('enabled to be a boolean')) {
    console.log('[DEBUG] ERROR CAUGHT! Full details:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
      stack: event.error?.stack,
    });
  }
});

// Setup auto-reload for chunk load failures (e.g., after new deployments)
setupChunkReloadHandler();

createRoot(document.getElementById("root")!).render(<App />);
