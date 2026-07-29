import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// If you deploy to GitHub Pages under a repo subpath, set base to "/<repo>/".
// For local dev and root-domain hosting, "/" is correct.
export default defineConfig({
  plugins: [react()],
  base: "/",
  server: {
    port: 5173,
    host: true,
  },
});
