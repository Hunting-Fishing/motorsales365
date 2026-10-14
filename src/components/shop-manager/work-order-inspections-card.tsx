import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ClipboardCheck, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { smSupabase } from "@/lib/shop-manager/db";
import { useAuth } from "@/hooks/use-auth";

type Row = {
  id: string;
  title: string | null;
  status: string;
  overall_result: string | null;
  inspection_date: string;
};

export function WorkOrderInspectionsCard({ workOrderId }: { workOrderId: string }) {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <AuthenticatedInspectionsCard
      key={`${user.id}:${workOrderId}`}
      accountId={user.id}
      workOrderId={workOrderId}
    />
  );
}

function AuthenticatedInspectionsCard({
  accountId,
  workOrderId,
}: {
  accountId: string;
  workOrderId: string;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const assertActive = () => {
    if (!active.current) throw new Error("Work-order context changed");
  };
  const queryKey = ["shop-manager", accountId, "wo-inspections", workOrderId];

  const {
    data = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      assertActive();
      const { data, error } = await (smSupabase as any)
        .from("vehicle_inspections")
        .select("id,title,status,overall_result,inspection_date")
        .eq("work_order_id", workOrderId)
        .order("inspection_date", { ascending: false });
      assertActive();
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const start = useMutation({
    mutationFn: async () => {
      assertActive();
      const { data: shopIdRes, error: shopErr } = await (smSupabase as any).rpc(
        "get_current_user_shop_id",
      );
      assertActive();
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
      assertActive();
      if (tplErr) throw tplErr;
      if (!tpl) throw new Error("No template found.");

      const { data: items, error: itemsError } = await (smSupabase as any)
        .from("inspection_template_items")
        .select("category,label,sort_order")
        .eq("template_id", tpl.id)
        .order("sort_order");
      assertActive();
      if (itemsError) throw itemsError;

      // Header/checklist creation is not atomic yet. Do not delete a header on failure.
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
      assertActive();
      if (error) throw error;
      if (!insp?.id) throw new Error("Inspection was not created");

      if (items?.length) {
        const rows = items.map((it: any) => ({
          inspection_id: insp.id,
          category: it.category,
          label: it.label,
          sort_order: it.sort_order,
        }));
        const { error: insertItemsError } = await (smSupabase as any)
          .from("inspection_items")
          .insert(rows);
        assertActive();
        if (insertItemsError) throw insertItemsError;
      }
      return insp.id as string;
    },
    onSuccess: (id) => {
      if (!active.current) return;
      qc.invalidateQueries({ queryKey });
      navigate({ to: "/workspace/inspections/$id", params: { id } });
    },
    onError: () => {
      if (!active.current) return;
      qc.invalidateQueries({ queryKey });
      toast.error(
        "Could not finish creating this inspection. Check existing inspections before trying again.",
      );
    },
    onSettled: () => {
      if (active.current) setStarting(false);
    },
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
          disabled={starting || isLoading || isError}
        >
          {starting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          Start inspection
        </Button>
      </CardHeader>
      <CardContent className="text-sm">
        {isError ? (
          <div role="alert" className="space-y-2">
            <p>Could not load this work order's inspections.</p>
            <Button size="sm" variant="outline" onClick={() => void refetch()}>
              Retry inspections
            </Button>
          </div>
        ) : isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : data.length === 0 ? (
          <p className="text-muted-foreground">No inspections yet.</p>
        ) : (
          <ul className="space-y-1">
            {data.map((i) => (
              <li key={i.id}>
                <Link
                  to="/workspace/inspections/$id"
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
