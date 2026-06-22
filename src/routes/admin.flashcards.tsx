import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  CheckCircle2,
  CloudDownload,
  Database,
  GitBranch,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
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
  updateFlashcardAutoSync,
  setFlashcardPublished,
  type FlashcardContent,
  type SyncResult,
  type AutoSyncInterval,
} from "@/lib/flashcards.functions";

import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

function relativeTime(iso: string | null | undefined) {
  if (!iso) return "never";
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
    return d.toLocaleDateString();
  } catch {
    return iso;
  }
}

function SyncStatusBadge({ syncedAt, isSyncing }: { syncedAt: string | null | undefined; isSyncing: boolean }) {
  if (isSyncing) {
    return (
      <Badge variant="outline" className="gap-1 bg-amber-500/10 text-amber-600 border-amber-500/30">
        <Loader2 className="h-3 w-3 animate-spin" />
        Syncing…
      </Badge>
    );
  }
  if (!syncedAt) {
    return (
      <Badge variant="outline" className="gap-1 bg-slate-500/10 text-slate-500 border-slate-500/30">
        <AlertTriangle className="h-3 w-3" />
        Not synced
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
      <CheckCircle2 className="h-3 w-3" />
      Synced
    </Badge>
  );
}

function AdminFlashcardsPage() {
  const { isAdmin, isModerator, loading } = useAuth();
  const allowed = isAdmin || isModerator;
  const queryClient = useQueryClient();
  const fetchContent = useServerFn(getFlashcardContent);
  const runSync = useServerFn(syncFlashcardsFromGithub);
  const saveAutoSync = useServerFn(updateFlashcardAutoSync);
  const savePublished = useServerFn(setFlashcardPublished);


  const contentQuery = useQuery<FlashcardContent>({
    queryKey: ["admin", "flashcard-content"],
    queryFn: () => fetchContent(),
    enabled: allowed,
    staleTime: 30_000,
  });

  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const syncMutation = useMutation({
    mutationFn: () => runSync({ data: {} }),
    onSuccess: (result) => {
      setLastResult(result);
      setLastError(null);
      const delta = result.cardCount - result.previousCardCount;
      const deltaText = delta === 0 ? "no change" : `${delta > 0 ? "+" : ""}${delta} cards`;
      toast.success(`Synced ${result.cardCount} cards (${deltaText}). Version ${result.version}.`);
      void queryClient.invalidateQueries({ queryKey: ["admin", "flashcard-content"] });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Sync failed";
      setLastError(message);
      setLastResult(null);
      toast.error(message);
    },
  });

  const content = contentQuery.data;
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [autoInterval, setAutoInterval] = useState<AutoSyncInterval>("daily");
  useEffect(() => {
    if (content) {
      setAutoEnabled(content.autoSyncEnabled);
      setAutoInterval(content.autoSyncInterval);
    }
  }, [content?.autoSyncEnabled, content?.autoSyncInterval]);

  const autoSyncMutation = useMutation({
    mutationFn: (input: { enabled: boolean; interval: AutoSyncInterval }) =>
      saveAutoSync({ data: input }),
    onSuccess: () => {
      toast.success("Auto-sync settings saved.");
      void queryClient.invalidateQueries({ queryKey: ["admin", "flashcard-content"] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to save auto-sync");
    },
  });

  // Reset any stale result if the user navigates back into the page.
  useEffect(() => {
    setLastResult(null);
    setLastError(null);
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




  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">365 Flashcards</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pull the latest card decks from the upstream GitHub repo. User progress
            is stored in a separate table and is never affected by a sync.
          </p>
        </div>
        <SyncStatusBadge syncedAt={content?.syncedAt ?? null} isSyncing={syncMutation.isPending} />
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
            <Clock className="h-4 w-4" /> Auto-sync
          </CardTitle>
          <CardDescription>
            Automatically pull the latest cards on a schedule. A daily cron checks at 00:00 UTC
            and runs the sync only when your chosen interval is due.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 p-3">
            <div>
              <div className="text-sm font-medium">Enable auto-sync</div>
              <div className="text-xs text-muted-foreground">
                When off, only the manual button below pulls from GitHub.
              </div>
            </div>
            <Switch
              checked={autoEnabled}
              onCheckedChange={setAutoEnabled}
              aria-label="Enable auto-sync"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Interval
            </label>
            <Select
              value={autoInterval}
              onValueChange={(v) => setAutoInterval(v as AutoSyncInterval)}
              disabled={!autoEnabled}
            >
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Every day at midnight (UTC)</SelectItem>
                <SelectItem value="weekly">Once a week</SelectItem>
                <SelectItem value="biweekly">Every 14 days</SelectItem>
                <SelectItem value="monthly">Every 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() =>
                autoSyncMutation.mutate({ enabled: autoEnabled, interval: autoInterval })
              }
              disabled={
                autoSyncMutation.isPending ||
                (content?.autoSyncEnabled === autoEnabled &&
                  content?.autoSyncInterval === autoInterval)
              }
              className="gap-2"
            >
              {autoSyncMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                <>Save auto-sync settings</>
              )}
            </Button>
            {content?.autoSyncLastRunAt && (
              <div className="text-xs text-muted-foreground">
                Last auto-run:{" "}
                <span className="font-medium">{relativeTime(content.autoSyncLastRunAt)}</span>
                {" · "}
                {content.autoSyncLastStatus === "error" ? (
                  <span className="text-red-600">failed</span>
                ) : (
                  <span className="text-emerald-600">success</span>
                )}
              </div>
            )}
          </div>
          {content?.autoSyncLastStatus === "error" && content.autoSyncLastError && (
            <div className="rounded-md border border-red-500/30 bg-red-500/5 p-2 text-xs text-red-600">
              {content.autoSyncLastError}
            </div>
          )}
        </CardContent>
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
      </Card>

      {(lastResult || lastError) && (
        <Card className={lastError ? "border-red-500/40 bg-red-500/5" : "border-emerald-500/40 bg-emerald-500/5"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {lastError ? (
                <>
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-red-600">Sync failed</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-emerald-600">Sync succeeded</span>
                </>
              )}
            </CardTitle>
            <CardDescription>
              {lastError ? (
                "The last sync attempt did not complete."
              ) : (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {lastResult ? relativeTime(lastResult.syncedAt) : "just now"}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lastError ? (
              <div className="text-sm text-red-600">{lastError}</div>
            ) : lastResult ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <ResultStat
                    label="Cards"
                    value={lastResult.cardCount.toLocaleString()}
                    icon={<Database className="h-3 w-3 text-muted-foreground" />}
                  />
                  <ResultStat
                    label="Version"
                    value={`v${lastResult.version}`}
                    icon={<GitBranch className="h-3 w-3 text-muted-foreground" />}
                  />
                  <ResultStat
                    label="Change"
                    value={(() => {
                      const delta = lastResult.cardCount - lastResult.previousCardCount;
                      if (delta === 0) return <span className="flex items-center gap-1"><Minus className="h-3 w-3" /> No change</span>;
                      if (delta > 0) return <span className="flex items-center gap-1 text-emerald-600"><TrendingUp className="h-3 w-3" /> +{delta}</span>;
                      return <span className="flex items-center gap-1 text-red-600"><TrendingDown className="h-3 w-3" /> {delta}</span>;
                    })()}
                    icon={null}
                  />
                  <ResultStat
                    label="Commit"
                    value={
                      lastResult.sourceCommit ? (
                        <code className="font-mono text-xs">{lastResult.sourceCommit.slice(0, 7)}</code>
                      ) : (
                        "—"
                      )
                    }
                    icon={<GitBranch className="h-3 w-3 text-muted-foreground" />}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Previous count: {lastResult.previousCardCount.toLocaleString()} cards
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {!lastResult && !lastError && content?.syncedAt && (
        <Card className="border-muted bg-muted/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              Last successful sync
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>
                {formatDate(content.syncedAt)}
                <span className="mx-1">·</span>
                {relativeTime(content.syncedAt)}
                {content.sourceCommit && (
                  <>
                    <span className="mx-1">·</span>
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{content.sourceCommit.slice(0, 7)}</code>
                  </>
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
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

function ResultStat({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode | null }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/50 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

