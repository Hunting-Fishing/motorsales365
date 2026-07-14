import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { KeyRound, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/cron-tokens")({
  component: AdminCronTokens,
  head: () => ({
    meta: [
      { title: "Cron tokens & webhook keys — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type CronRow = { job_name: string; rotated_at: string };
type KeyRow = { name: string; rotated_at: string };

function fmt(ts?: string | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function ageDays(ts?: string | null) {
  if (!ts) return null;
  return Math.floor((Date.now() - new Date(ts).getTime()) / 86_400_000);
}

function ageBadge(ts?: string | null) {
  const d = ageDays(ts);
  if (d == null) return <Badge variant="outline">unknown</Badge>;
  if (d > 180) return <Badge variant="destructive">{d}d — rotate</Badge>;
  if (d > 90) return <Badge className="bg-amber-500 hover:bg-amber-500/90 text-white">{d}d</Badge>;
  return <Badge variant="outline">{d}d</Badge>;
}

function AdminCronTokens() {
  const [cronRows, setCronRows] = useState<CronRow[]>([]);
  const [keyRows, setKeyRows] = useState<KeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [c, k] = await Promise.all([
      supabase
        .from("internal_cron_tokens" as never)
        .select("job_name,rotated_at")
        .order("job_name", { ascending: true }),
      supabase
        .from("internal_webhook_keys" as never)
        .select("name,rotated_at")
        .order("name", { ascending: true }),
    ]);
    if (c.error) toast.error(`Cron tokens: ${c.error.message}`);
    if (k.error) toast.error(`Webhook keys: ${k.error.message}`);
    setCronRows((c.data as unknown as CronRow[]) ?? []);
    setKeyRows((k.data as unknown as KeyRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function rotateCron(jobName: string) {
    setBusy(`cron:${jobName}`);
    const { error } = await supabase.rpc("rotate_internal_cron_token" as never, {
      _job_name: jobName,
    } as never);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Rotated ${jobName}. Update pg_cron with the new token.`);
    load();
  }

  async function rotateKey(name: string) {
    setBusy(`key:${name}`);
    const { error } = await supabase.rpc("rotate_internal_webhook_key" as never, {
      _name: name,
    } as never);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Rotated ${name}. Update caller with the new secret.`);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Cron tokens & webhook keys</h1>
          <p className="text-sm text-muted-foreground">
            Rotate internal secrets used by pg_cron and inbound webhooks. Secrets never appear in the UI —
            they live in the database and are read by scheduled jobs via SECURITY DEFINER functions.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="ml-auto">
          <RefreshCw className="mr-1 h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-primary" /> Cron tokens
            </CardTitle>
            <CardDescription>
              Sent as <code>x-cron-token</code> from pg_cron to <code>/api/public/hooks/*</code> routes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : cronRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No cron tokens defined.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Last rotated</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cronRows.map((r) => (
                    <TableRow key={r.job_name}>
                      <TableCell className="font-mono text-xs">{r.job_name}</TableCell>
                      <TableCell className="text-xs">{fmt(r.rotated_at)}</TableCell>
                      <TableCell>{ageBadge(r.rotated_at)}</TableCell>
                      <TableCell className="text-right">
                        <RotateConfirm
                          label={`cron token ${r.job_name}`}
                          busy={busy === `cron:${r.job_name}`}
                          onConfirm={() => rotateCron(r.job_name)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-primary" /> Webhook signing keys
            </CardTitle>
            <CardDescription>
              HMAC secrets used to verify inbound webhooks (payments, providers).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : keyRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No webhook keys defined.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Last rotated</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keyRows.map((r) => (
                    <TableRow key={r.name}>
                      <TableCell className="font-mono text-xs">{r.name}</TableCell>
                      <TableCell className="text-xs">{fmt(r.rotated_at)}</TableCell>
                      <TableCell>{ageBadge(r.rotated_at)}</TableCell>
                      <TableCell className="text-right">
                        <RotateConfirm
                          label={`webhook key ${r.name}`}
                          busy={busy === `key:${r.name}`}
                          onConfirm={() => rotateKey(r.name)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Rotation is atomic. Any caller using the previous secret will start failing immediately —
        update the pg_cron job body or the external caller right after you rotate.
      </p>
    </div>
  );
}

function RotateConfirm({
  label,
  busy,
  onConfirm,
}: {
  label: string;
  busy: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={busy}>
          {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
          Rotate
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rotate {label}?</AlertDialogTitle>
          <AlertDialogDescription>
            This immediately replaces the secret. Callers using the old value will fail until updated.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Rotate now</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
