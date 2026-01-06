import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setupChunkReloadHandler } from "./lib/chunk-reload-handler";

// DEBUG: Catch the enabled error and log full stack trace
const originalError = console.error;
console.error = (...args) => {
  if (args[0]?.toString?.().includes('enabled to be a boolean')) {
    console.log('[DEBUG] CAUGHT THE ERROR! Stack trace:');
    console.trace();
  }
  originalError.apply(console, args);
};

// Setup auto-reload for chunk load failures (e.g., after new deployments)
setupChunkReloadHandler();

createRoot(document.getElementById("root")!).render(<App />);
