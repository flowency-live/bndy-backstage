import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setupChunkReloadHandler } from "./lib/chunk-reload-handler";

// Setup auto-reload for chunk load failures (e.g., after new deployments)
setupChunkReloadHandler();

createRoot(document.getElementById("root")!).render(<App />);
