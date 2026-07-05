import { createStart } from "@tanstack/react-start";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

// Dev-only: silence hydration warnings caused by the tooling-injected
// `data-tsd-source` attribute (column numbers differ between SSR and client).
// Scoped narrowly so real hydration mismatches still surface.
if (import.meta.env.DEV && typeof window !== "undefined") {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    const first = args[0];
    if (typeof first === "string" && first.includes("hydrated")) {
      const joined = args
        .map((a) => (typeof a === "string" ? a : ""))
        .join(" ");
      if (joined.includes("data-tsd-source") || first.includes("data-tsd-source")) {
        return;
      }
    }
    originalError(...args);
  };
}

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
}));
