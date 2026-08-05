import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ClipboardCheck,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MinusCircle,
  Camera,
  Trash2,
  Send,
} from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { smSupabase, supabase } from "@/lib/shop-manager/db";

type Inspection = {
  id: string;
  title: string | null;
  status: string;
  overall_result: string | null;
  inspection_date: string;
  completed_at: string | null;
  work_order_id: string | null;
  summary: string | null;
  customer_shared_at: string | null;
};

type Item = {
  id: string;
  inspection_id: string;
  category: string;
  label: string;
  sort_order: number;
  result: string | null;
  notes: string | null;
  measurement: string | null;
};

type Photo = {
  id: string;
  inspection_id: string;
  item_id: string | null;
  storage_path: string;
  caption: string | null;
};

const RESULTS = [
  { value: "pass", label: "Pass", icon: CheckCircle2, tone: "text-emerald-600" },
  { value: "attention", label: "Attention", icon: AlertTriangle, tone: "text-amber-600" },
  { value: "fail", label: "Fail", icon: XCircle, tone: "text-red-600" },
  { value: "na", label: "N/A", icon: MinusCircle, tone: "text-muted-foreground" },
] as const;

async function fetchDetail(id: string) {
  const [insp, items, photos] = await Promise.all([
    (smSupabase as any)
      .from("vehicle_inspections")
      .select(
        "id,title,status,overall_result,inspection_date,completed_at,work_order_id,summary,customer_shared_at",
      )
      .eq("id", id)
      .maybeSingle(),
    (smSupabase as any)
      .from("inspection_items")
      .select("id,inspection_id,category,label,sort_order,result,notes,measurement")
      .eq("inspection_id", id)
      .order("sort_order"),
    (smSupabase as any)
      .from("inspection_photos")
      .select("id,inspection_id,item_id,storage_path,caption")
      .eq("inspection_id", id)
      .order("created_at"),
  ]);
  if (insp.error) throw insp.error;
  if (!insp.data) throw new Error("Not found");
  if (items.error) throw items.error;
  if (photos.error) throw photos.error;
  return {
    inspection: insp.data as Inspection,
    items: (items.data ?? []) as Item[],
    photos: (photos.data ?? []) as Photo[],
  };
}

export const Route = createFileRoute("/_authenticated/workspace/inspections/$id")({
  head: () => ({
    meta: [
      { title: "Inspection — Shop Manager" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InspectionDetail,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <SiteLayout>
        <div className="mx-auto max-w-4xl px-4 py-10">
          <h1 className="text-2xl font-bold">Inspection</h1>
          <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
          <Button className="mt-4" onClick={() => { reset(); router.invalidate(); }}>Retry</Button>
        </div>
      </SiteLayout>
    );
  },
  notFoundComponent: () => (
    <SiteLayout><div className="mx-auto max-w-4xl px-4 py-10">Not found.</div></SiteLayout>
  ),
});

function InspectionDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["shop-manager", "inspection", id],
    queryFn: () => fetchDetail(id),
  });

  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of data?.items ?? []) {
      const arr = map.get(it.category) ?? [];
      arr.push(it);
      map.set(it.category, arr);
    }
    return [...map.entries()];
  }, [data]);

  const counts = useMemo(() => {
    const c = { pass: 0, attention: 0, fail: 0, na: 0, unset: 0 };
    for (const it of data?.items ?? []) {
      const k = (it.result ?? "unset") as keyof typeof c;
      c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [data]);

  const updateItem = useMutation({
    mutationFn: async (patch: Partial<Item> & { id: string }) => {
      const { id: iid, ...rest } = patch;
      const { error } = await (smSupabase as any)
        .from("inspection_items")
        .update(rest)
        .eq("id", iid);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shop-manager", "inspection", id] }),
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const complete = useMutation({
    mutationFn: async () => {
      const overall = counts.fail > 0 ? "fail" : counts.attention > 0 ? "attention" : "pass";
      const { error } = await (smSupabase as any)
        .from("vehicle_inspections")
        .update({ status: "completed", completed_at: new Date().toISOString(), overall_result: overall })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inspection completed");
      qc.invalidateQueries({ queryKey: ["shop-manager", "inspection", id] });
      qc.invalidateQueries({ queryKey: ["shop-manager", "inspections"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to complete"),
  });

  const shareWithCustomer = useMutation({
    mutationFn: async () => {
      const { error } = await (smSupabase as any)
        .from("vehicle_inspections")
        .update({ customer_shared_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marked as shared with customer");
      qc.invalidateQueries({ queryKey: ["shop-manager", "inspection", id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  if (isLoading || !data) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-5xl px-4 py-10 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      </SiteLayout>
    );
  }

  const isDone = data.inspection.status === "completed";

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link to="/workspace/inspections"><ArrowLeft className="h-4 w-4" /> Back</Link>
            </Button>
            <ClipboardCheck className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">{data.inspection.title ?? "Inspection"}</h1>
              <p className="text-xs text-muted-foreground">
                {new Date(data.inspection.inspection_date).toLocaleString()}
                {data.inspection.work_order_id ? (
                  <>
                    {" · "}
                    <Link
                      to="/workspace/work-orders/$id"
                      params={{ id: data.inspection.work_order_id }}
                      className="underline"
                    >
                      Work order
                    </Link>
                  </>
                ) : null}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{data.inspection.status}</Badge>
            {data.inspection.overall_result && (
              <Badge
                variant={
                  data.inspection.overall_result === "fail"
                    ? "destructive"
                    : data.inspection.overall_result === "attention"
                      ? "secondary"
                      : "default"
                }
              >
                {data.inspection.overall_result}
              </Badge>
            )}
          </div>
        </div>

        <Card className="mb-4">
          <CardContent className="grid grid-cols-2 sm:grid-cols-5 gap-3 py-4 text-sm">
            <SummaryPill label="Pass" value={counts.pass} tone="text-emerald-600" />
            <SummaryPill label="Attention" value={counts.attention} tone="text-amber-600" />
            <SummaryPill label="Fail" value={counts.fail} tone="text-red-600" />
            <SummaryPill label="N/A" value={counts.na} tone="text-muted-foreground" />
            <SummaryPill label="Unchecked" value={counts.unset} tone="text-muted-foreground" />
          </CardContent>
        </Card>

        <div className="space-y-4">
          {grouped.map(([cat, items]) => (
            <Card key={cat}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{cat}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((it) => (
                  <ItemRow
                    key={it.id}
                    item={it}
                    disabled={isDone}
                    photos={data.photos.filter((p) => p.item_id === it.id)}
                    onChange={(patch) => updateItem.mutate({ id: it.id, ...patch })}
                    inspectionId={id}
                  />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-4">
          <CardHeader className="pb-2"><CardTitle className="text-base">Technician summary</CardTitle></CardHeader>
          <CardContent>
            <Textarea
              defaultValue={data.inspection.summary ?? ""}
              placeholder="Overall notes for the customer…"
              disabled={isDone}
              onBlur={async (e) => {
                const v = e.currentTarget.value;
                if (v === (data.inspection.summary ?? "")) return;
                const { error } = await (smSupabase as any)
                  .from("vehicle_inspections")
                  .update({ summary: v })
                  .eq("id", id);
                if (error) toast.error(error.message);
                else qc.invalidateQueries({ queryKey: ["shop-manager", "inspection", id] });
              }}
            />
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          {!isDone && (
            <Button
              onClick={() => complete.mutate()}
              disabled={complete.isPending || counts.unset === (data.items?.length ?? 0)}
            >
              {complete.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Complete inspection
            </Button>
          )}
          {isDone && (
            <Button
              variant="outline"
              onClick={() => shareWithCustomer.mutate()}
              disabled={shareWithCustomer.isPending}
            >
              <Send className="h-4 w-4" />
              {data.inspection.customer_shared_at
                ? `Shared ${new Date(data.inspection.customer_shared_at).toLocaleDateString()}`
                : "Mark shared with customer"}
            </Button>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}

function SummaryPill({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded border p-2 text-center">
      <div className={`text-lg font-semibold ${tone}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function ItemRow({
  item,
  disabled,
  photos,
  onChange,
  inspectionId,
}: {
  item: Item;
  disabled: boolean;
  photos: Photo[];
  onChange: (patch: Partial<Item>) => void;
  inspectionId: string;
}) {
  const [notes, setNotes] = useState(item.notes ?? "");
  const [measurement, setMeasurement] = useState(item.measurement ?? "");
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const uploadPhoto = useMutation({
    mutationFn: async (file: File) => {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${inspectionId}/${item.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("shop-inspections")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { error: insErr } = await (smSupabase as any)
        .from("inspection_photos")
        .insert({ inspection_id: inspectionId, item_id: item.id, storage_path: path });
      if (insErr) throw insErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shop-manager", "inspection", inspectionId] });
      toast.success("Photo added");
    },
    onError: (e: any) => toast.error(e?.message ?? "Upload failed"),
  });

  const deletePhoto = useMutation({
    mutationFn: async (p: Photo) => {
      await supabase.storage.from("shop-inspections").remove([p.storage_path]);
      const { error } = await (smSupabase as any)
        .from("inspection_photos")
        .delete()
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shop-manager", "inspection", inspectionId] }),
  });

  return (
    <div
      className={`rounded border p-3 space-y-2 ${
        item.result === "fail"
          ? "border-red-300 bg-red-50/50 dark:bg-red-950/20"
          : item.result === "attention"
            ? "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20"
            : item.result === "pass"
              ? "border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20"
              : ""
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-medium">{item.label}</div>
        <div className="flex gap-1">
          {RESULTS.map((r) => {
            const Icon = r.icon;
            const active = item.result === r.value;
            return (
              <Button
                key={r.value}
                size="sm"
                variant={active ? "default" : "outline"}
                disabled={disabled}
                onClick={() => onChange({ result: r.value })}
                className="h-8"
              >
                <Icon className={`h-3.5 w-3.5 ${active ? "" : r.tone}`} />
                <span className="text-xs">{r.label}</span>
              </Button>
            );
          })}
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== (item.notes ?? "") && onChange({ notes })}
          placeholder="Notes"
          rows={2}
          disabled={disabled}
        />
        <Input
          value={measurement}
          onChange={(e) => setMeasurement(e.target.value)}
          onBlur={() => measurement !== (item.measurement ?? "") && onChange({ measurement })}
          placeholder="Measurement (e.g. 5mm)"
          disabled={disabled}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadPhoto.mutate(f);
            e.currentTarget.value = "";
          }}
        />
        {!disabled && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={uploadPhoto.isPending}
          >
            {uploadPhoto.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            Add photo
          </Button>
        )}
        {photos.map((p) => (
          <PhotoThumb key={p.id} photo={p} onDelete={() => deletePhoto.mutate(p)} disabled={disabled} />
        ))}
      </div>
    </div>
  );
}

function PhotoThumb({ photo, onDelete, disabled }: { photo: Photo; onDelete: () => void; disabled: boolean }) {
  const { data: url } = useQuery({
    queryKey: ["shop-manager", "inspection-photo-url", photo.id, photo.storage_path],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("shop-inspections")
        .createSignedUrl(photo.storage_path, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
    staleTime: 55 * 60 * 1000,
  });
  return (
    <div className="relative group">
      {url ? (
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt="" className="h-14 w-14 rounded border object-cover" />
        </a>
      ) : (
        <div className="h-14 w-14 rounded border bg-muted animate-pulse" />
      )}
      {!disabled && (
        <button
          type="button"
          onClick={onDelete}
          className="absolute -top-1 -right-1 rounded-full bg-destructive p-0.5 text-destructive-foreground opacity-0 group-hover:opacity-100"
          aria-label="Delete photo"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
