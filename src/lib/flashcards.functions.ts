// Server functions for the 365 Flashcards game.
//
// - getFlashcardContent: public read of the latest card snapshot (anon-safe).
// - syncFlashcardsFromGithub: admin-only; pulls cards.json + taxonomy.json
//   from the upstream GitHub repo and writes them into flashcard_content.
//   User progress lives in a separate table and is never touched.
// - getFlashcardProgress / saveFlashcardProgress / clearFlashcardProgress:
//   per-user progress, scoped by RLS via requireSupabaseAuth.

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const DEFAULT_REPO = "Hunting-Fishing/365_flashcards";
const DEFAULT_REF = "main";

// ---------- Types ----------

export type FlashcardContent = {
  cards: any[];
  taxonomy: any;
  cardImages: any;
  version: number;
  cardCount: number;
  sourceRepo: string;
  sourceRef: string;
  sourceCommit: string | null;
  syncedAt: string | null;
  updatedAt: string | null;
};

export type FlashcardProgressRow = {
  cardId: string;
  confidence: string | null;
  correctCount: number;
  wrongCount: number;
  seenCount: number;
  points: number;
  lastSeenAt: string | null;
  extra: any;
};

// ---------- Public read ----------

export const getFlashcardContent = createServerFn({ method: "GET" }).handler(
  async (): Promise<FlashcardContent> => {
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
        "cards, taxonomy, card_images, version, card_count, source_repo, source_ref, source_commit, synced_at, updated_at",
      )
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(`Failed to load flashcard content: ${error.message}`);
    return {
      cards: (data?.cards as any[]) ?? [],
      taxonomy: (data?.taxonomy as any) ?? {},
      cardImages: (data?.card_images as any) ?? {},
      version: data?.version ?? 0,
      cardCount: data?.card_count ?? 0,
      sourceRepo: data?.source_repo ?? DEFAULT_REPO,
      sourceRef: data?.source_ref ?? DEFAULT_REF,
      sourceCommit: (data?.source_commit as string | null) ?? null,
      syncedAt: (data?.synced_at as string | null) ?? null,
      updatedAt: (data?.updated_at as string | null) ?? null,
    };
  },
);

// ---------- Admin sync ----------

const SyncInput = z.object({
  repo: z.string().min(3).max(120).optional(),
  ref: z.string().min(1).max(120).optional(),
});

export type SyncResult = {
  ok: true;
  cardCount: number;
  previousCardCount: number;
  version: number;
  sourceCommit: string | null;
  syncedAt: string;
};

export const syncFlashcardsFromGithub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SyncInput.parse(d ?? {}))
  .handler(async ({ data, context }): Promise<SyncResult> => {
    // Authorize: only staff who can_moderate may sync.
    const { data: allowed, error: rpcErr } = await context.supabase.rpc("can_moderate", {
      _user_id: context.userId,
    });
    if (rpcErr) throw new Error(`Permission check failed: ${rpcErr.message}`);
    if (!allowed) throw new Error("Forbidden: staff only");

    const repo = data.repo ?? DEFAULT_REPO;
    const ref = data.ref ?? DEFAULT_REF;
    const base = `https://raw.githubusercontent.com/${repo}/${ref}/game/data`;

    // Fetch the two source-of-truth JSON files in parallel.
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

    // Resolve the commit SHA for the ref so admins can see what version they pulled.
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
      // Best-effort; not fatal.
    }

    // Use the admin client to write the singleton row (RLS has no write policy).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Read current row to compute previousCardCount and bump version.
    const { data: current, error: readErr } = await supabaseAdmin
      .from("flashcard_content")
      .select("version, card_count")
      .eq("id", 1)
      .maybeSingle();
    if (readErr) throw new Error(`Failed to read current snapshot: ${readErr.message}`);

    const nextVersion = (current?.version ?? 0) + 1;
    const previousCardCount = current?.card_count ?? 0;
    const syncedAt = new Date().toISOString();

    const { error: writeErr } = await supabaseAdmin
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
          synced_by: context.userId,
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
  });

// ---------- Per-user progress ----------

export const getFlashcardProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FlashcardProgressRow[]> => {
    const { data, error } = await context.supabase
      .from("flashcard_progress")
      .select(
        "card_id, confidence, correct_count, wrong_count, seen_count, points, last_seen_at, extra",
      )
      .eq("user_id", context.userId);
    if (error) throw new Error(`Failed to load progress: ${error.message}`);
    return (data ?? []).map((r: any) => ({
      cardId: r.card_id,
      confidence: r.confidence,
      correctCount: r.correct_count,
      wrongCount: r.wrong_count,
      seenCount: r.seen_count,
      points: r.points,
      lastSeenAt: r.last_seen_at,
      extra: (r.extra as any) ?? {},
    }));
  });

const SaveProgressInput = z.object({
  cardId: z.string().min(1).max(200),
  confidence: z.enum(["again", "good", "easy"]).nullable().optional(),
  correctDelta: z.number().int().min(0).max(100).optional(),
  wrongDelta: z.number().int().min(0).max(100).optional(),
  seenDelta: z.number().int().min(0).max(100).optional(),
  pointsDelta: z.number().int().min(-1000).max(1000).optional(),
  extra: z.record(z.string(), z.any()).optional(),
});

export const saveFlashcardProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SaveProgressInput.parse(d))
  .handler(async ({ data, context }) => {
    // Read current row to apply deltas.
    const { data: cur, error: readErr } = await context.supabase
      .from("flashcard_progress")
      .select("confidence, correct_count, wrong_count, seen_count, points, extra")
      .eq("user_id", context.userId)
      .eq("card_id", data.cardId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);

    const row = {
      user_id: context.userId,
      card_id: data.cardId,
      confidence: data.confidence ?? cur?.confidence ?? null,
      correct_count: (cur?.correct_count ?? 0) + (data.correctDelta ?? 0),
      wrong_count: (cur?.wrong_count ?? 0) + (data.wrongDelta ?? 0),
      seen_count: (cur?.seen_count ?? 0) + (data.seenDelta ?? 1),
      points: (cur?.points ?? 0) + (data.pointsDelta ?? 0),
      last_seen_at: new Date().toISOString(),
      extra: data.extra ?? cur?.extra ?? {},
    };

    const { error: writeErr } = await context.supabase
      .from("flashcard_progress")
      .upsert(row, { onConflict: "user_id,card_id" });
    if (writeErr) throw new Error(writeErr.message);
    return { ok: true as const };
  });

export const clearFlashcardProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("flashcard_progress")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
