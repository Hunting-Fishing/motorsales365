import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ClipboardCheck, Loader2, Plus, ArrowLeft } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { smSupabase } from "@/lib/shop-manager/db";

type Inspection = {
  id: string;
  title: string | null;
  status: string;
  overall_result: string | null;
  inspection_date: string;
  completed_at: string | null;
  work_order_id: string | null;
  vehicle_id: string | null;
};

async function fetchInspections(): Promise<Inspection[]> {
  const { data, error } = await (smSupabase as any)
    .from("vehicle_inspections")
    .select(
      "id,title,status,overall_result,inspection_date,completed_at,work_order_id,vehicle_id",
    )
    .order("inspection_date", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as Inspection[];
}

async function fetchTemplates() {
  const { data, error } = await (smSupabase as any)
    .from("inspection_templates")
    .select("id,name,is_system,is_default")
    .eq("active", true)
    .order("is_default", { ascending: false })
    .order("name");
  if (error) throw error;
  return data as { id: string; name: string; is_system: boolean; is_default: boolean }[];
}

export const Route = createFileRoute("/_authenticated/shop/inspections")({
  head: () => ({
    meta: [
      { title: "Inspections — Shop Manager" },
      { name: "description", content: "Digital multi-point vehicle inspections." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InspectionsPage,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Inspections</h1>
        <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout><div className="mx-auto max-w-4xl px-4 py-10">Not found.</div></SiteLayout>
  ),
});

function statusBadge(s: string, overall: string | null) {
  if (s === "completed") {
    const tone =
      overall === "fail" ? "destructive" : overall === "attention" ? "secondary" : "default";
    return <Badge variant={tone as any}>{overall ?? "completed"}</Badge>;
  }
  return <Badge variant="outline">{s}</Badge>;
}

function InspectionsPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["shop-manager", "inspections", "list"],
    queryFn: fetchInspections,
  });

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm"><Link to="/shop"><ArrowLeft className="h-4 w-4" /> Shop</Link></Button>
            <ClipboardCheck className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Digital Inspections</h1>
              <p className="text-muted-foreground">Multi-point checklists with photos.</p>
            </div>
          </div>
          <NewInspectionDialog />
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : data.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No inspections yet. Start one from a work order or click "New inspection".
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader><CardTitle className="text-base">Recent inspections</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.map((i) => (
                <Link
                  key={i.id}
                  to="/shop/inspections/$id"
                  params={{ id: i.id }}
                  className="flex items-center justify-between rounded border p-3 hover:bg-accent"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{i.title ?? "Inspection"}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(i.inspection_date).toLocaleString()}
                      {i.work_order_id ? ` · WO ${i.work_order_id.slice(0, 8)}` : ""}
                    </div>
                  </div>
                  {statusBadge(i.status, i.overall_result)}
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </SiteLayout>
  );
}

function NewInspectionDialog({ workOrderId }: { workOrderId?: string } = {}) {
  const [open, setOpen] = useState(false);
  const [templateId, setTemplateId] = useState<string>("");
  const [title, setTitle] = useState("");
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ["shop-manager", "inspection-templates"],
    queryFn: fetchTemplates,
    enabled: open,
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: shopIdRes, error: shopErr } = await (smSupabase as any).rpc(
        "get_current_user_shop_id",
      );
      if (shopErr) throw shopErr;
      const shop_id = shopIdRes as string | null;
      if (!shop_id) throw new Error("No shop provisioned for your account.");

      // Load template items
      const tid = templateId || templates.find((t) => t.is_default)?.id || templates[0]?.id;
      if (!tid) throw new Error("No inspection template available.");
      const { data: items, error: itemsErr } = await (smSupabase as any)
        .from("inspection_template_items")
        .select("category,label,sort_order")
        .eq("template_id", tid)
        .order("sort_order");
      if (itemsErr) throw itemsErr;

      const { data: insp, error } = await (smSupabase as any)
        .from("vehicle_inspections")
        .insert({
          shop_id,
          template_id: tid,
          work_order_id: workOrderId ?? null,
          title: title.trim() || "Digital Inspection",
          status: "in_progress",
        })
        .select("id")
        .single();
      if (error) throw error;

      if (items && items.length > 0) {
        const rows = items.map((it: any) => ({
          inspection_id: insp.id,
          category: it.category,
          label: it.label,
          sort_order: it.sort_order,
        }));
        const { error: bulkErr } = await (smSupabase as any)
          .from("inspection_items")
          .insert(rows);
        if (bulkErr) throw bulkErr;
      }
      return insp.id as string;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["shop-manager", "inspections"] });
      setOpen(false);
      toast.success("Inspection started");
      navigate({ to: "/shop/inspections/$id", params: { id } });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to start inspection"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4" /> New inspection</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Start a digital inspection</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Pre-service inspection"
            />
          </div>
          <div>
            <Label>Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger><SelectValue placeholder="Default template" /></SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}{t.is_default ? " (default)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { NewInspectionDialog };
