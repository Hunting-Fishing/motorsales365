import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/reports")({
  component: AdminReports,
});

function AdminReports() {
  const [reports, setReports] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.from("reports")
      .select("id,reason,details,status,created_at,listing_id,listings:listing_id(title)")
      .order("created_at", { ascending: false });
    setReports(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const resolve = async (id: string) => {
    await supabase.from("reports").update({ status: "resolved" }).eq("id", id);
    toast.success("Marked resolved"); load();
  };

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold">Reports</h1>
      {reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">No reports.</div>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <Link to="/listing/$id" params={{ id: r.listing_id }} className="font-medium hover:text-primary">
                  {r.listings?.title ?? "Listing"}
                </Link>
                <span className="text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
              </div>
              <p className="mt-1 text-sm">{r.reason}</p>
              {r.status !== "resolved" && <Button size="sm" className="mt-2" onClick={() => resolve(r.id)}>Resolve</Button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
