import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

// Stamp every build with a unique id so the service worker can bust its
// offline cache on each deploy without us editing public/sw.js by hand.
const BUILD_ID = `${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "")}`;

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart(),
    react(),
    tailwindcss(),
    tsconfigPaths(),
    mcpPlugin(),
  ],
  cacheDir: "node_modules/.cache/vite",
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  optimizeDeps: {
    holdUntilCrawlEnd: false,
  },
});
