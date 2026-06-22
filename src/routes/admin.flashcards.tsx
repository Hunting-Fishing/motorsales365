import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  CloudDownload,
  Database,
  GitBranch,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getFlashcardContent,
  syncFlashcardsFromGithub,
  type FlashcardContent,
  type SyncResult,
} from "@/lib/flashcards.functions";

export const Route = createFileRoute("/admin/flashcards")({
  component: AdminFlashcardsPage,
  head: () => ({
    meta: [
      { title: "Flashcards — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function formatDate(iso: string | null | undefined) {
  if (!iso) return "Never";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function AdminFlashcardsPage() {
  const { isAdmin, isModerator, loading } = useAuth();
  const allowed = isAdmin || isModerator;
  const queryClient = useQueryClient();
  const fetchContent = useServerFn(getFlashcardContent);
  const runSync = useServerFn(syncFlashcardsFromGithub);

  const contentQuery = useQuery<FlashcardContent>({
    queryKey: ["admin", "flashcard-content"],
    queryFn: () => fetchContent(),
    enabled: allowed,
    staleTime: 30_000,
  });

  const [lastResult, setLastResult] = useState<SyncResult | null>(null);

  const syncMutation = useMutation({
    mutationFn: () => runSync({ data: {} }),
    onSuccess: (result) => {
      setLastResult(result);
      const delta = result.cardCount - result.previousCardCount;
      const deltaText = delta === 0 ? "no change" : `${delta > 0 ? "+" : ""}${delta} cards`;
      toast.success(`Synced ${result.cardCount} cards (${deltaText}). Version ${result.version}.`);
      void queryClient.invalidateQueries({ queryKey: ["admin", "flashcard-content"] });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Sync failed";
      toast.error(message);
    },
  });

  // Reset any stale result if the user navigates back into the page.
  useEffect(() => {
    setLastResult(null);
  }, []);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (!allowed) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" />
            Admin only
          </CardTitle>
          <CardDescription>
            You need the admin or moderator role to manage the flashcards content.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const content = contentQuery.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">365 Flashcards</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pull the latest card decks from the upstream GitHub repo. User progress
          is stored in a separate table and is never affected by a sync.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" /> Current snapshot
          </CardTitle>
          <CardDescription>What the game will load from Lovable Cloud.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Cards" value={content?.cardCount.toLocaleString() ?? "—"} />
          <Stat label="Version" value={content?.version != null ? `v${content.version}` : "—"} />
          <Stat label="Last synced" value={formatDate(content?.syncedAt ?? null)} />
          <Stat
            label="Source commit"
            value={
              content?.sourceCommit ? (
                <code className="font-mono text-xs">{content.sourceCommit.slice(0, 7)}</code>
              ) : (
                "—"
              )
            }
          />
        </CardContent>
        <CardFooter className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <Badge variant="outline" className="gap-1">
            <GitBranch className="h-3 w-3" />
            {content?.sourceRepo ?? "Hunting-Fishing/365_flashcards"}@{content?.sourceRef ?? "main"}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => contentQuery.refetch()}
            disabled={contentQuery.isFetching}
          >
            <RefreshCw className={`mr-1 h-3 w-3 ${contentQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CloudDownload className="h-4 w-4" /> Pull latest from GitHub
          </CardTitle>
          <CardDescription>
            Fetches <code>game/data/cards.json</code> and <code>game/data/taxonomy.json</code>{" "}
            from the upstream repo and replaces the snapshot stored in Lovable Cloud.
            Safe to run any time — user progress lives in a separate table.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            size="lg"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="gap-2"
          >
            {syncMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Syncing…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Pull latest from GitHub
              </>
            )}
          </Button>
        </CardContent>
        {lastResult && (
          <CardFooter className="flex flex-col items-start gap-1 border-t border-border pt-4 text-sm">
            <div className="font-medium">Last sync</div>
            <div className="text-muted-foreground">
              {lastResult.cardCount.toLocaleString()} cards (
              {lastResult.cardCount - lastResult.previousCardCount >= 0 ? "+" : ""}
              {lastResult.cardCount - lastResult.previousCardCount} vs previous), version{" "}
              v{lastResult.version}
              {lastResult.sourceCommit ? (
                <>
                  {" "}
                  at <code className="font-mono text-xs">{lastResult.sourceCommit.slice(0, 7)}</code>
                </>
              ) : null}
              .
            </div>
          </CardFooter>
        )}
      </Card>

      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="text-sm">Wiring status</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          The sync writes the latest content into Lovable Cloud. The live game at{" "}
          <code>/learn/flashcards</code> currently still reads the bundled static files
          for fastest load; wiring the game to read the cloud snapshot is the next step.
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
