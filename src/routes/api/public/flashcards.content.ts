// Public read of the flashcards cloud snapshot.
//
// Same-origin fetch target for the static game at /flashcards/*. The static
// loader (public/flashcards/data/loader.js) hits this endpoint before
// publishing CardDB; if the snapshot has cards, it overrides the bundled
// section files so the game runs on whatever was last synced from GitHub
// via the admin "Pull latest" button — no rebuild required.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/public/flashcards/content")({
  server: {
    handlers: {
      GET: async () => {
        const supabase = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          {
            auth: {
              storage: undefined,
              persistSession: false,
              autoRefreshToken: false,
            },
          },
        );
        const { data, error } = await supabase
          .from("flashcard_content")
          .select(
            "cards, taxonomy, card_images, version, card_count, source_commit, synced_at",
          )
          .eq("id", 1)
          .maybeSingle();
        if (error) {
          return new Response(
            JSON.stringify({ error: error.message, cards: [] }),
            {
              status: 500,
              headers: { "content-type": "application/json" },
            },
          );
        }
        const body = {
          cards: (data?.cards as any[]) ?? [],
          taxonomy: (data?.taxonomy as any) ?? null,
          cardImages: (data?.card_images as any) ?? null,
          version: data?.version ?? 0,
          cardCount: data?.card_count ?? 0,
          sourceCommit: (data?.source_commit as string | null) ?? null,
          syncedAt: (data?.synced_at as string | null) ?? null,
        };
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: {
            "content-type": "application/json",
            // Short edge cache so a freshly synced snapshot propagates fast,
            // but we don't hammer the DB on every game open.
            "cache-control": "public, max-age=30, s-maxage=30",
          },
        });
      },
    },
  },
});
