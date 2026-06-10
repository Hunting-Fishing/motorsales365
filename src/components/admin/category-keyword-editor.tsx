import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { confirm } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, RefreshCw, Save, Plus } from "lucide-react";
import {
  adminListCategoryKeywords,
  adminAddCategoryKeyword,
  adminDeleteCategoryKeyword,
  adminBulkSetCategoryKeywords,
  adminRecategorizeProducts,
} from "@/lib/shop.functions";

type Cat = {
  id: string;
  slug: string;
  name: string;
  parent_id: string | null;
  department_slug: string | null;
  keywords: Array<{ id: string; keyword: string }>;
  product_count: number;
};

export function CategoryKeywordEditor() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-category-keywords"],
    queryFn: () => adminListCategoryKeywords(),
  });
  const cats: Cat[] = (data?.categories ?? []) as Cat[];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [newKw, setNewKw] = useState("");
  const [recategScope, setRecategScope] = useState<"all" | "uncategorized" | "category">("uncategorized");

  const selected = cats.find((c) => c.id === selectedId) ?? null;

  const grouped = useMemo(() => {
    const f = filter.toLowerCase();
    const visible = f
      ? cats.filter((c) => c.name.toLowerCase().includes(f) || c.slug.includes(f))
      : cats;
    const parents = visible.filter((c) => !c.parent_id);
    const byParent = new Map<string, Cat[]>();
    for (const c of visible) {
      if (c.parent_id) {
        const list = byParent.get(c.parent_id) ?? [];
        list.push(c);
        byParent.set(c.parent_id, list);
      }
    }
    return { parents, byParent, all: visible };
  }, [cats, filter]);

  const addMut = useMutation({
    mutationFn: (kw: string) =>
      adminAddCategoryKeyword({ data: { category_id: selected!.id, keyword: kw } }),
    onSuccess: () => {
      setNewKw("");
      toast.success("Keyword added");
      qc.invalidateQueries({ queryKey: ["admin-category-keywords"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not add keyword"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => adminDeleteCategoryKeyword({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-category-keywords"] }),
    onError: (e: any) => toast.error(e?.message ?? "Could not remove keyword"),
  });

  const bulkMut = useMutation({
    mutationFn: () =>
      adminBulkSetCategoryKeywords({
        data: {
          category_id: selected!.id,
          keywords: bulkText
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean),
        },
      }),
    onSuccess: (res) => {
      toast.success(`Saved ${res.count} keyword${res.count === 1 ? "" : "s"}`);
      setBulkText("");
      qc.invalidateQueries({ queryKey: ["admin-category-keywords"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const recategMut = useMutation({
    mutationFn: () =>
      adminRecategorizeProducts({
        data: {
          scope: recategScope,
          ...(recategScope === "category" && selected ? { categoryId: selected.id } : {}),
        },
      }),
    onSuccess: (r) =>
      toast.success(
        `Scanned ${r.scanned} · updated ${r.updated} · unmatched ${r.unmatched}`,
      ),
    onError: (e: any) => toast.error(e?.message ?? "Re-categorize failed"),
  });

  const onRecateg = async () => {
    if (recategScope === "all") {
      const ok = await confirm({
        title: "Re-categorize all products?",
        description:
          "Every product will be re-evaluated against the keyword map. This may move products to new categories.",
        confirmText: "Run on all",
      });
      if (!ok) return;
    }
    if (recategScope === "category" && !selected) {
      toast.error("Pick a category first");
      return;
    }
    recategMut.mutate();
  };

  const renderRow = (c: Cat, indent = false) => (
    <button
      key={c.id}
      onClick={() => {
        setSelectedId(c.id);
        setBulkText(c.keywords.map((k) => k.keyword).join("\n"));
      }}
      className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted ${
        selectedId === c.id ? "bg-muted font-medium" : ""
      } ${indent ? "pl-6" : ""}`}
    >
      <span className="truncate">{c.name}</span>
      <span className="flex items-center gap-1.5">
        {c.keywords.length > 0 && (
          <Badge variant="secondary" className="text-[10px]">
            {c.keywords.length} kw
          </Badge>
        )}
        <span className="text-[10px] text-muted-foreground">{c.product_count}</span>
      </span>
    </button>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <Card className="lg:max-h-[70vh] lg:overflow-y-auto">
        <CardHeader className="space-y-2 pb-3">
          <CardTitle className="text-base">Categories</CardTitle>
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter…"
            className="h-8"
          />
        </CardHeader>
        <CardContent className="space-y-1">
          {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {grouped.parents.map((p) => (
            <div key={p.id}>
              {renderRow(p)}
              {(grouped.byParent.get(p.id) ?? []).map((sub) => renderRow(sub, true))}
            </div>
          ))}
          {/* orphan children (no parent loaded due to filter) */}
          {filter &&
            grouped.all
              .filter((c) => c.parent_id && !grouped.parents.some((p) => p.id === c.parent_id))
              .map((c) => renderRow(c, true))}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Re-categorize existing products</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-2">
            <div className="grid gap-1">
              <label className="text-xs text-muted-foreground">Scope</label>
              <Select value={recategScope} onValueChange={(v) => setRecategScope(v as any)}>
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uncategorized">Only uncategorized</SelectItem>
                  <SelectItem value="all">All products</SelectItem>
                  <SelectItem value="category" disabled={!selected}>
                    Just the selected category
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={onRecateg} disabled={recategMut.isPending}>
              <RefreshCw className="mr-1.5 h-4 w-4" />
              {recategMut.isPending ? "Running…" : "Run"}
            </Button>
            <p className="ml-auto max-w-md text-xs text-muted-foreground">
              Re-runs the same matcher used on import (title + brand + description).
              Products keep their existing category if no rule matches.
            </p>
          </CardContent>
        </Card>

        {!selected && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Pick a category on the left to edit its keywords.
            </CardContent>
          </Card>
        )}

        {selected && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span>
                  {selected.name}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    /{selected.slug} · {selected.product_count} product
                    {selected.product_count === 1 ? "" : "s"}
                  </span>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Current keywords</label>
                  <span className="text-xs text-muted-foreground">
                    {selected.keywords.length} total
                  </span>
                </div>
                {selected.keywords.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No keywords yet — products will only match by category name/slug.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.keywords.map((k) => (
                      <Badge
                        key={k.id}
                        variant="secondary"
                        className="gap-1 pl-2 pr-1 text-xs"
                      >
                        {k.keyword}
                        <button
                          onClick={() => delMut.mutate(k.id)}
                          className="rounded p-0.5 hover:bg-background"
                          aria-label={`Remove ${k.keyword}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Input
                    value={newKw}
                    onChange={(e) => setNewKw(e.target.value)}
                    placeholder="Add a keyword (e.g. ceramic coating)"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newKw.trim()) addMut.mutate(newKw.trim());
                    }}
                    className="h-9"
                  />
                  <Button
                    size="sm"
                    onClick={() => newKw.trim() && addMut.mutate(newKw.trim())}
                    disabled={!newKw.trim() || addMut.isPending}
                  >
                    <Plus className="mr-1 h-4 w-4" /> Add
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Bulk replace</label>
                <Textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  rows={8}
                  placeholder={"one keyword per line\nfoam cannon\nsnow foam"}
                  className="font-mono text-xs"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Saving replaces the entire keyword list for this category.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => bulkMut.mutate()}
                    disabled={bulkMut.isPending}
                  >
                    <Save className="mr-1 h-4 w-4" />
                    {bulkMut.isPending ? "Saving…" : "Replace all"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
