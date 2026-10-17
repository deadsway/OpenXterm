import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Static mockup only: plain Vite dev server, no Tauri.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
});
