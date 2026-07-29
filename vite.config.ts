import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base path. Local dev and root-domain hosting use "/". GitHub Pages serves a
// project site under "/<repo>/", so the deploy workflow passes VITE_BASE.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? "/",
  server: {
    port: 5173,
    host: true,
  },
});
