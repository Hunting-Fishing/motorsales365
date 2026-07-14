import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ClipboardCheck, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { smSupabase } from "@/lib/shop-manager/db";

type Row = {
  id: string;
  title: string | null;
  status: string;
  overall_result: string | null;
  inspection_date: string;
};

export function WorkOrderInspectionsCard({ workOrderId }: { workOrderId: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["shop-manager", "wo-inspections", workOrderId],
    queryFn: async () => {
      const { data, error } = await (smSupabase as any)
        .from("vehicle_inspections")
        .select("id,title,status,overall_result,inspection_date")
        .eq("work_order_id", workOrderId)
        .order("inspection_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const start = useMutation({
    mutationFn: async () => {
      const { data: shopIdRes, error: shopErr } = await (smSupabase as any).rpc(
        "get_current_user_shop_id",
      );
      if (shopErr) throw shopErr;
      const shop_id = shopIdRes as string | null;
      if (!shop_id) throw new Error("No shop provisioned.");

      const { data: tpl, error: tplErr } = await (smSupabase as any)
        .from("inspection_templates")
        .select("id")
        .eq("active", true)
        .order("is_default", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (tplErr) throw tplErr;
      if (!tpl) throw new Error("No template found.");

      const { data: items } = await (smSupabase as any)
        .from("inspection_template_items")
        .select("category,label,sort_order")
        .eq("template_id", tpl.id)
        .order("sort_order");

      const { data: insp, error } = await (smSupabase as any)
        .from("vehicle_inspections")
        .insert({
          shop_id,
          template_id: tpl.id,
          work_order_id: workOrderId,
          title: "Digital Inspection",
          status: "in_progress",
        })
        .select("id")
        .single();
      if (error) throw error;

      if (items?.length) {
        const rows = items.map((it: any) => ({
          inspection_id: insp.id,
          category: it.category,
          label: it.label,
          sort_order: it.sort_order,
        }));
        await (smSupabase as any).from("inspection_items").insert(rows);
      }
      return insp.id as string;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["shop-manager", "wo-inspections", workOrderId] });
      navigate({ to: "/shop/inspections/$id", params: { id } });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to start"),
    onSettled: () => setStarting(false),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-primary" /> Inspections
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setStarting(true);
            start.mutate();
          }}
          disabled={starting}
        >
          {starting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Start inspection
        </Button>
      </CardHeader>
      <CardContent className="text-sm">
        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : data.length === 0 ? (
          <p className="text-muted-foreground">No inspections yet.</p>
        ) : (
          <ul className="space-y-1">
            {data.map((i) => (
              <li key={i.id}>
                <Link
                  to="/shop/inspections/$id"
                  params={{ id: i.id }}
                  className="flex items-center justify-between rounded border p-2 hover:bg-accent"
                >
                  <span className="truncate">
                    {i.title ?? "Inspection"}{" "}
                    <span className="text-xs text-muted-foreground">
                      · {new Date(i.inspection_date).toLocaleDateString()}
                    </span>
                  </span>
                  {i.status === "completed" ? (
                    <Badge
                      variant={
                        i.overall_result === "fail"
                          ? "destructive"
                          : i.overall_result === "attention"
                            ? "secondary"
                            : "default"
                      }
                    >
                      {i.overall_result ?? "done"}
                    </Badge>
                  ) : (
                    <Badge variant="outline">{i.status}</Badge>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
