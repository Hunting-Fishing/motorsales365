// Vite config for the TanStack Start app, deployed to Cloudflare Workers.
//
// Plugin stack (order matters):
//   tailwindcss → tsconfig paths → TanStack Start → Nitro (build only,
//   cloudflare-module preset → .output/) → React.
// Public VITE_* variables are inlined for both client and SSR builds.
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv, type PluginOption, type UserConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";

// Stamp every build with a unique id so the service worker can bust its
// offline cache on each deploy without us editing public/sw.js by hand.
const BUILD_ID = `${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "")}`;

const srcDir = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig(async ({ command, mode }): Promise<UserConfig> => {
  const plugins: PluginOption[] = [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      server: { entry: "server" },
      // Fail the build if client code imports server-only modules.
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
    }),
  ];

  if (command === "build") {
    const { nitro } = await import("nitro/vite");
    plugins.push(
      nitro({
        // Cloudflare Workers module output (.output/server + .output/public).
        defaultPreset: "cloudflare-module",
      }),
    );
  }

  plugins.push(viteReact());

  const envDefine: Record<string, string> = {};
  for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), "VITE_"))) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  return {
    plugins,
    define: {
      ...envDefine,
      __BUILD_ID__: JSON.stringify(BUILD_ID),
    },
    ...(command === "build" && mode === "development"
      ? {
          environments: {
            client: { define: { "process.env.NODE_ENV": JSON.stringify("development") } },
          },
          esbuild: { keepNames: true },
        }
      : {}),
    css: { transformer: "lightningcss" },
    resolve: {
      alias: { "@": srcDir },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    // Explicit cacheDir so Vite's dep-optimizer + transform cache is reused.
    cacheDir: "node_modules/.cache/vite",
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
      // Persist pre-bundled deps across restarts.
      holdUntilCrawlEnd: false,
    },
    server: {
      host: "::",
      port: 8080,
      watch: { awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 100 } },
    },
  };
});
