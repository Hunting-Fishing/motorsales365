// Server-only helpers for the flashcards sync pipeline.
// The *.server.ts extension prevents this from being imported into client bundles.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const DEFAULT_REPO = "Hunting-Fishing/365_flashcards";
const DEFAULT_REF = "main";

export type RunSyncResult = {
  ok: true;
  cardCount: number;
  previousCardCount: number;
  version: number;
  sourceCommit: string | null;
  syncedAt: string;
};

/**
 * Pulls cards.json + taxonomy.json from GitHub and upserts the snapshot
 * into flashcard_content. Used by both the manual admin button and the
 * cron auto-sync endpoint.
 */
export async function runFlashcardSync(opts: {
  supabaseAdmin: SupabaseClient<Database>;
  repo?: string;
  ref?: string;
  syncedBy?: string | null;
}): Promise<RunSyncResult> {
  const repo = opts.repo ?? DEFAULT_REPO;
  const ref = opts.ref ?? DEFAULT_REF;
  const base = `https://raw.githubusercontent.com/${repo}/${ref}/game/data`;

  const [cardsRes, taxRes] = await Promise.all([
    fetch(`${base}/cards.json`, { headers: { "user-agent": "365motorsales-sync" } }),
    fetch(`${base}/taxonomy.json`, { headers: { "user-agent": "365motorsales-sync" } }),
  ]);
  if (!cardsRes.ok) throw new Error(`cards.json fetch failed (${cardsRes.status})`);
  if (!taxRes.ok) throw new Error(`taxonomy.json fetch failed (${taxRes.status})`);

  const [cards, taxonomy] = await Promise.all([
    cardsRes.json() as Promise<any[]>,
    taxRes.json() as Promise<any>,
  ]);
  if (!Array.isArray(cards)) throw new Error("cards.json did not return an array");
  if (typeof taxonomy !== "object" || taxonomy === null) {
    throw new Error("taxonomy.json did not return an object");
  }

  let sourceCommit: string | null = null;
  try {
    const commitRes = await fetch(
      `https://api.github.com/repos/${repo}/commits/${ref}`,
      { headers: { accept: "application/vnd.github.v3+json", "user-agent": "365motorsales-sync" } },
    );
    if (commitRes.ok) {
      const j = (await commitRes.json()) as { sha?: string };
      sourceCommit = j.sha ?? null;
    }
  } catch {
    /* best effort */
  }

  const { data: current, error: readErr } = await opts.supabaseAdmin
    .from("flashcard_content")
    .select("version, card_count")
    .eq("id", 1)
    .maybeSingle();
  if (readErr) throw new Error(`Failed to read current snapshot: ${readErr.message}`);

  const nextVersion = (current?.version ?? 0) + 1;
  const previousCardCount = current?.card_count ?? 0;
  const syncedAt = new Date().toISOString();

  const { error: writeErr } = await opts.supabaseAdmin
    .from("flashcard_content")
    .upsert(
      {
        id: 1,
        cards,
        taxonomy,
        card_images: {},
        version: nextVersion,
        card_count: cards.length,
        source_repo: repo,
        source_ref: ref,
        source_commit: sourceCommit,
        synced_at: syncedAt,
        synced_by: opts.syncedBy ?? null,
      },
      { onConflict: "id" },
    );
  if (writeErr) throw new Error(`Failed to write snapshot: ${writeErr.message}`);

  return {
    ok: true,
    cardCount: cards.length,
    previousCardCount,
    version: nextVersion,
    sourceCommit,
    syncedAt,
  };
}

export type AutoSyncInterval = "daily" | "weekly" | "biweekly" | "monthly";

const INTERVAL_MS: Record<AutoSyncInterval, number> = {
  daily: 23 * 60 * 60 * 1000, // 23h so a "daily at 00:00" cron isn't skipped by drift
  weekly: 7 * 24 * 60 * 60 * 1000,
  biweekly: 14 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

export function isAutoSyncDue(
  interval: AutoSyncInterval,
  lastRunAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!lastRunAt) return true;
  const last = new Date(lastRunAt).getTime();
  if (Number.isNaN(last)) return true;
  return now.getTime() - last >= INTERVAL_MS[interval];
}
