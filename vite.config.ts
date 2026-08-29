import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { appendFileSync, mkdirSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Stamp every build with a unique id so the service worker can bust its
// offline cache on each deploy without us editing public/sw.js by hand.
const BUILD_ID = `${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "")}`;

function packageNameForModule(id: string): string {
  const normalized = id.replace(/\\/g, "/");
  const marker = "/node_modules/";
  const markerIndex = normalized.lastIndexOf(marker);
  if (markerIndex < 0) return "app-source";

  const rest = normalized.slice(markerIndex + marker.length);
  const parts = rest.split("/");
  if (parts[0]?.startsWith("@")) return `${parts[0]}/${parts[1] ?? "unknown"}`;
  return parts[0] || "unknown-package";
}

function bundleModuleProfilePlugin(): Plugin {
  return {
    name: "standalone-bundle-module-profile",
    apply: "build",
    generateBundle(outputOptions, bundle) {
      if (process.env.BUNDLE_PROFILE !== "1") return;

      const moduleTotals = new Map<string, number>();
      const packageTotals = new Map<string, number>();
      const chunks: Array<{ file: string; renderedBytes: number; moduleCount: number }> = [];

      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk") continue;

        let chunkRenderedBytes = 0;
        const entries = Object.entries(output.modules);
        for (const [id, details] of entries) {
          const renderedBytes = Number(details.renderedLength || 0);
          chunkRenderedBytes += renderedBytes;
          moduleTotals.set(id, (moduleTotals.get(id) ?? 0) + renderedBytes);

          const packageName = packageNameForModule(id);
          packageTotals.set(packageName, (packageTotals.get(packageName) ?? 0) + renderedBytes);
        }

        chunks.push({
          file: output.fileName,
          renderedBytes: chunkRenderedBytes,
          moduleCount: entries.length,
        });
      }

      const sortTotals = (entries: Iterable<[string, number]>) =>
        [...entries]
          .map(([name, renderedBytes]) => ({ name, renderedBytes }))
          .sort((a, b) => b.renderedBytes - a.renderedBytes);

      const report = {
        outputDir: outputOptions.dir ?? null,
        generatedAt: new Date().toISOString(),
        packageTotals: sortTotals(packageTotals).slice(0, 100),
        moduleTotals: sortTotals(moduleTotals).slice(0, 500),
        chunks: chunks.sort((a, b) => b.renderedBytes - a.renderedBytes).slice(0, 200),
      };

      mkdirSync("bundle-profile", { recursive: true });
      appendFileSync("bundle-profile/vite-module-profile.jsonl", `${JSON.stringify(report)}\n`);
    },
  };
}

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart(),
    react(),
    tailwindcss(),
    tsconfigPaths(),
    ...(process.env.BUNDLE_PROFILE === "1" ? [bundleModuleProfilePlugin()] : []),
  ],
  cacheDir: "node_modules/.cache/vite",
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  optimizeDeps: {
    holdUntilCrawlEnd: false,
  },
});
