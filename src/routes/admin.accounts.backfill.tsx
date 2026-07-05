import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft, CheckCircle2, Download, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/accounts/backfill")({
  component: BackfillWizard,
});

const FIELD_KEYS = [
  "phone_e164",
  "personal_email",
  "street_address",
  "postal_code",
  "signup_region",
  "signup_province",
  "signup_city",
  "business_address",
  "business_postal_code",
  "business_region",
  "business_province",
  "business_city",
] as const;
type FieldKey = (typeof FIELD_KEYS)[number];

const CSV_HEADERS = [
  "user_id",
  "email",
  "phone",
  "personal_email",
  "street_address",
  "postal_code",
  "signup_region",
  "signup_province",
  "signup_city",
  "business_address",
  "business_postal_code",
  "business_region",
  "business_province",
  "business_city",
] as const;

const TEMPLATE_CSV =
  CSV_HEADERS.join(",") +
  "\n" +
  ",jane@example.com,+639171234567,jane.personal@example.com,123 Rizal St,1200,NCR,Metro Manila,Makati,,,,,\n";

type ResultRow = {
  index: number;
  user_id: string | null;
  email: string | null;
  current: Partial<Record<FieldKey, string | null>>;
  incoming: Partial<Record<FieldKey, string | null>>;
  would_apply: FieldKey[];
  would_skip: FieldKey[];
  applied: FieldKey[];
  still_missing: FieldKey[];
  errors: string[];
};

// Small CSV parser supporting quoted fields.
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        cur.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        cur.push(field);
        field = "";
        if (cur.some((v) => v.trim() !== "")) rows.push(cur);
        cur = [];
      } else field += c;
    }
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    if (cur.some((v) => v.trim() !== "")) rows.push(cur);
  }
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    header.forEach((h, i) => {
      obj[h] = (r[i] ?? "").trim();
    });
    return obj;
  });
}

function toRows(parsed: Record<string, string>[]) {
  return parsed.map((p) => {
    const row: Record<string, string> = {};
    for (const h of CSV_HEADERS) if (p[h]) row[h] = p[h];
    return row;
  });
}

function toResultsCsv(results: ResultRow[]): string {
  const header = ["user_id", "email", "applied", "skipped", "still_missing", "errors"];
  const lines = [header.join(",")];
  for (const r of results) {
    const cells = [
      r.user_id ?? "",
      r.email ?? "",
      r.applied.join("|"),
      r.would_skip.join("|"),
      r.still_missing.join("|"),
      r.errors.join("|"),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`);
    lines.push(cells.join(","));
  }
  return lines.join("\n");
}

function download(name: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function BackfillWizard() {
  const { isAdmin, loading } = useAuth();
  const [csvText, setCsvText] = useState("");
  const [onlyFillEmpty, setOnlyFillEmpty] = useState(true);
  const [preview, setPreview] = useState<ResultRow[] | null>(null);
  const [applied, setApplied] = useState<ResultRow[] | null>(null);
  const [busy, setBusy] = useState(false);

  const parsedRows = useMemo(() => (csvText.trim() ? toRows(parseCsv(csvText)) : []), [csvText]);

  if (loading) return <div className="mx-auto max-w-6xl p-6">Loading…</div>;
  if (!isAdmin) return <div className="mx-auto max-w-6xl p-6">Admins only.</div>;

  async function callServer(dryRun: boolean) {
    if (parsedRows.length === 0) {
      toast.error("No rows to submit");
      return null;
    }
    if (parsedRows.length > 500) {
      toast.error("Split into batches of 500 rows or fewer");
      return null;
    }
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) {
        toast.error("Not signed in");
        return null;
      }
      const res = await fetch("/api/admin/backfill-profiles", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ dry_run: dryRun, only_fill_empty: onlyFillEmpty, rows: parsedRows }),
      });
      if (!res.ok) {
        const t = await res.text();
        toast.error(`Server error: ${t.slice(0, 200)}`);
        return null;
      }
      const j = (await res.json()) as { results: ResultRow[] };
      return j.results;
    } finally {
      setBusy(false);
    }
  }

  async function onPreview() {
    const results = await callServer(true);
    if (results) {
      setPreview(results);
      setApplied(null);
    }
  }

  async function onApply() {
    const results = await callServer(false);
    if (results) {
      setApplied(results);
      const okCount = results.filter((r) => r.applied.length > 0).length;
      toast.success(`Applied changes to ${okCount} user(s)`);
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result ?? ""));
    reader.readAsText(f);
  }

  function reloadStillMissing() {
    if (!applied) return;
    const rows = applied.filter((r) => r.still_missing.length > 0);
    if (rows.length === 0) {
      toast.info("Nothing still missing");
      return;
    }
    const header = CSV_HEADERS.join(",");
    const lines = rows.map((r) =>
      CSV_HEADERS.map((h) => (h === "user_id" ? r.user_id ?? "" : h === "email" ? r.email ?? "" : ""))
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    setCsvText([header, ...lines].join("\n"));
    setApplied(null);
    setPreview(null);
  }

  const totalChanges = preview?.reduce((n, r) => n + r.would_apply.length, 0) ?? 0;
  const errorRows = preview?.filter((r) => r.errors.length > 0).length ?? 0;
  const view = applied ?? preview;

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/accounts">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to accounts
          </Link>
        </Button>
      </div>
      <div>
        <h1 className="font-display text-2xl font-bold">Bulk profile backfill</h1>
        <p className="text-sm text-muted-foreground">
          Fill missing <code>phone</code>, <code>personal_email</code>, and address fields for many
          users at once. Preview first, then apply.
        </p>
      </div>

      <section className="rounded-lg border p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <h2 className="font-semibold">1. Paste or upload CSV</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => download("backfill-template.csv", TEMPLATE_CSV)}
            >
              <Download className="mr-2 h-4 w-4" />
              Download template
            </Button>
            <label className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm cursor-pointer hover:bg-muted">
              <Upload className="h-4 w-4" />
              Upload CSV
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
            </label>
          </div>
        </div>
        <Textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder={CSV_HEADERS.join(",")}
          className="font-mono text-xs h-48"
        />
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch id="only-empty" checked={onlyFillEmpty} onCheckedChange={setOnlyFillEmpty} />
            <Label htmlFor="only-empty">Only fill fields that are currently empty</Label>
          </div>
          <div className="text-xs text-muted-foreground">
            Parsed: <strong>{parsedRows.length}</strong> row(s). Row key: <code>user_id</code> or{" "}
            <code>email</code>.
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={onPreview} disabled={busy || parsedRows.length === 0}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Preview changes
          </Button>
        </div>
      </section>

      {preview && (
        <section className="rounded-lg border p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <h2 className="font-semibold">2. Preview</h2>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{preview.length} rows</span>
              <span>·</span>
              <span>{totalChanges} field change(s)</span>
              <span>·</span>
              <span className={errorRows ? "text-destructive" : ""}>{errorRows} error(s)</span>
            </div>
          </div>
          <ResultsTable rows={preview} mode="preview" />
          {!applied && (
            <div className="flex gap-2">
              <Button onClick={onApply} disabled={busy || totalChanges === 0}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Apply {totalChanges} change(s)
              </Button>
            </div>
          )}
        </section>
      )}

      {applied && view && (
        <section className="rounded-lg border p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <h2 className="font-semibold">3. Results & verification</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => download("backfill-results.csv", toResultsCsv(applied))}
              >
                <Download className="mr-2 h-4 w-4" />
                Download results CSV
              </Button>
              <Button variant="outline" size="sm" onClick={reloadStillMissing}>
                Load still-missing into step 1
              </Button>
            </div>
          </div>
          <ResultsTable rows={applied} mode="applied" />
        </section>
      )}
    </div>
  );
}

function ResultsTable({ rows, mode }: { rows: ResultRow[]; mode: "preview" | "applied" }) {
  return (
    <div className="overflow-x-auto rounded border">
      <table className="w-full text-xs">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="p-2">#</th>
            <th className="p-2">Status</th>
            <th className="p-2">User</th>
            <th className="p-2">{mode === "preview" ? "Would apply" : "Applied"}</th>
            <th className="p-2">Skipped</th>
            <th className="p-2">Still missing</th>
            <th className="p-2">Errors</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const ok = mode === "applied" ? r.errors.length === 0 && r.still_missing.length === 0 : r.errors.length === 0;
            return (
              <tr key={r.index} className="border-t">
                <td className="p-2 text-muted-foreground">{r.index + 1}</td>
                <td className="p-2">
                  {ok ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                </td>
                <td className="p-2">
                  <div className="font-mono text-[11px]">{r.user_id ?? "—"}</div>
                  <div className="text-muted-foreground">{r.email ?? ""}</div>
                </td>
                <td className="p-2">
                  <FieldList fields={mode === "preview" ? r.would_apply : r.applied} color="emerald" />
                </td>
                <td className="p-2">
                  <FieldList fields={r.would_skip} color="gray" />
                </td>
                <td className="p-2">
                  <FieldList fields={r.still_missing} color="amber" />
                </td>
                <td className="p-2 text-destructive">{r.errors.join("; ")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FieldList({ fields, color }: { fields: string[]; color: "emerald" | "gray" | "amber" }) {
  if (fields.length === 0) return <span className="text-muted-foreground">—</span>;
  const cls =
    color === "emerald"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : color === "amber"
        ? "bg-amber-100 text-amber-800 border-amber-200"
        : "bg-muted text-muted-foreground";
  return (
    <div className="flex flex-wrap gap-1">
      {fields.map((f) => (
        <Badge key={f} variant="outline" className={cls}>
          {f}
        </Badge>
      ))}
    </div>
  );
}
