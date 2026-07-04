import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BadgePercent, Loader2, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  listAllClubDiscountPromotions,
  upsertClubDiscountPromotion,
  deleteClubDiscountPromotion,
  type ClubDiscountPromotion,
} from "@/lib/club-discount-promotions.functions";

export const Route = createFileRoute("/_authenticated/admin/club-discount-promotions")({
  head: () => ({
    meta: [
      { title: "Admin — Club discount promotions" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClubDiscountPromotionsAdminPage,
});

type Draft = Omit<ClubDiscountPromotion, "id" | "created_at" | "updated_at"> & {
  id?: string;
};

function emptyDraft(): Draft {
  return {
    name: "",
    headline: "",
    description: "",
    percent: 5,
    is_active: true,
    audiences: [],
    applies_to: [],
    excludes: [],
    stacking_rules: "",
    eligibility_notes: "",
    how_it_applies: "",
    footer_note: "",
    sort_order: 0,
  };
}

function ClubDiscountPromotionsAdminPage() {
  const listFn = useServerFn(listAllClubDiscountPromotions);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin", "club-discount-promotions"],
    queryFn: () => listFn(),
  });

  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BadgePercent className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-semibold">Club discount promotions</h1>
              <p className="text-sm text-muted-foreground">
                These promotions appear in the Club Discount explainer on /clubs and /rides.
                Checkout eligibility is configured separately at{" "}
                <Link to="/admin/club-discount" className="underline">
                  /admin/club-discount
                </Link>
                .
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
              Reload
            </Button>
            <Button size="sm" onClick={() => setEditingId("new")}>
              <Plus className="h-4 w-4 mr-2" /> New promotion
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-lg border p-8 flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            Failed to load: {(error as Error).message}
          </div>
        ) : (
          <div className="space-y-3">
            {editingId === "new" && (
              <PromotionEditor
                initial={emptyDraft()}
                onClose={() => setEditingId(null)}
                onSaved={() => {
                  setEditingId(null);
                  refetch();
                }}
              />
            )}
            {(data ?? []).length === 0 && editingId !== "new" ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No promotions yet. Create one to populate the Club Discount explainer.
              </div>
            ) : (
              (data ?? []).map((p) =>
                editingId === p.id ? (
                  <PromotionEditor
                    key={p.id}
                    initial={{ ...p }}
                    onClose={() => setEditingId(null)}
                    onSaved={() => {
                      setEditingId(null);
                      refetch();
                    }}
                  />
                ) : (
                  <PromotionRow
                    key={p.id}
                    promo={p}
                    onEdit={() => setEditingId(p.id)}
                    onDeleted={() => refetch()}
                  />
                ),
              )
            )}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}

function PromotionRow({
  promo,
  onEdit,
  onDeleted,
}: {
  promo: ClubDiscountPromotion;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const deleteFn = useServerFn(deleteClubDiscountPromotion);
  const [deleting, setDeleting] = useState(false);
  const remove = async () => {
    if (!confirm(`Delete "${promo.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteFn({ data: { id: promo.id } });
      toast.success("Deleted.");
      onDeleted();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };
  return (
    <div className="rounded-lg border p-4 flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold">{promo.name}</h3>
          <Badge variant={promo.is_active ? "default" : "secondary"}>
            {promo.is_active ? "Active" : "Inactive"}
          </Badge>
          <Badge variant="outline">{promo.percent}% off</Badge>
          <Badge variant="outline">sort {promo.sort_order}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{promo.headline}</p>
        <p className="mt-0.5 text-xs text-muted-foreground/80">
          Audiences: {promo.audiences.join(", ") || "—"}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" variant="outline" onClick={onEdit}>
          Edit
        </Button>
        <Button size="sm" variant="ghost" onClick={remove} disabled={deleting}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function PromotionEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: Draft;
  onClose: () => void;
  onSaved: () => void;
}) {
  const upsertFn = useServerFn(upsertClubDiscountPromotion);
  const [draft, setDraft] = useState<Draft>(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(initial), [initial.id]);

  const save = async () => {
    setSaving(true);
    try {
      await upsertFn({
        data: {
          id: draft.id,
          name: draft.name.trim(),
          headline: draft.headline.trim(),
          description: draft.description.trim(),
          percent: Number(draft.percent) || 0,
          is_active: draft.is_active,
          audiences: draft.audiences,
          applies_to: draft.applies_to,
          excludes: draft.excludes,
          stacking_rules: draft.stacking_rules,
          eligibility_notes: draft.eligibility_notes,
          how_it_applies: draft.how_it_applies,
          footer_note: draft.footer_note,
          sort_order: Number(draft.sort_order) || 0,
        },
      });
      toast.success("Saved.");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border-2 border-primary/40 bg-card p-5 space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Internal name">
          <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </Field>
        <Field label="Headline (shown to users)">
          <Input value={draft.headline} onChange={(e) => setDraft({ ...draft, headline: e.target.value })} />
        </Field>
      </div>
      <Field label="Description">
        <Textarea
          rows={3}
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Percent">
          <Input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={draft.percent}
            onChange={(e) => setDraft({ ...draft, percent: Number(e.target.value) })}
          />
        </Field>
        <Field label="Sort order">
          <Input
            type="number"
            min={0}
            value={draft.sort_order}
            onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })}
          />
        </Field>
        <div className="sm:col-span-2 flex items-end justify-between gap-4">
          <div>
            <Label>Active</Label>
            <p className="text-xs text-muted-foreground">Only active promotions render publicly.</p>
          </div>
          <Switch
            checked={draft.is_active}
            onCheckedChange={(v) => setDraft({ ...draft, is_active: v })}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <ListField
          label="Eligible audiences"
          hint="One per line. E.g. Verified club members"
          items={draft.audiences}
          onChange={(items) => setDraft({ ...draft, audiences: items })}
        />
        <ListField
          label="Applies to"
          hint="One per line. E.g. Listing boosts"
          items={draft.applies_to}
          onChange={(items) => setDraft({ ...draft, applies_to: items })}
        />
        <ListField
          label="Doesn't apply to"
          hint="One per line. E.g. Insurance quotes"
          items={draft.excludes}
          onChange={(items) => setDraft({ ...draft, excludes: items })}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Who's eligible">
          <Textarea
            rows={3}
            value={draft.eligibility_notes}
            onChange={(e) => setDraft({ ...draft, eligibility_notes: e.target.value })}
          />
        </Field>
        <Field label="How it applies">
          <Textarea
            rows={3}
            value={draft.how_it_applies}
            onChange={(e) => setDraft({ ...draft, how_it_applies: e.target.value })}
          />
        </Field>
        <Field label="Stacking rules">
          <Textarea
            rows={3}
            value={draft.stacking_rules}
            onChange={(e) => setDraft({ ...draft, stacking_rules: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Footer note (small print)">
        <Textarea
          rows={2}
          value={draft.footer_note}
          onChange={(e) => setDraft({ ...draft, footer_note: e.target.value })}
        />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ListField({
  label,
  hint,
  items,
  onChange,
}: {
  label: string;
  hint?: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const [text, setText] = useState(items.join("\n"));
  useEffect(() => setText(items.join("\n")), [items.join("\n")]);
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Textarea
        rows={5}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(
            e.target.value
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean),
          );
        }}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
