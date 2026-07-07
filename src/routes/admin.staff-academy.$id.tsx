import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  GraduationCap,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { isStaffEmail } from "@/lib/staff-domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getStaffAcademyArticleById,
  upsertStaffAcademyArticle,
  listStaffAcademyArticleHistory,
  getStaffAcademyArticleStats,
  type DbArticleRow,
  type DbArticleSection,
  type ArticleHistoryRow,
  type ArticleViewStats,
} from "@/lib/staff-academy-articles.functions";
import { CATEGORY_META, type ArticleCategory } from "@/content/staff-academy";
import { History, Eye, EyeOff, FilePlus2, RefreshCw, BarChart3, Users, Clock } from "lucide-react";

export const Route = createFileRoute("/admin/staff-academy/$id")({
  head: () => ({ meta: [{ title: "Edit article — Staff Academy" }] }),
  component: StaffAcademyEditor,
});

type FormState = {
  id?: string;
  slug: string;
  title: string;
  description: string;
  category: ArticleCategory;
  tags: string[];
  status: "active" | "coming-soon" | "draft";
  hero_emoji: string | null;
  hero_image_url: string | null;
  sections: DbArticleSection[];
  sort_order: number;
};

const EMPTY_FORM: FormState = {
  slug: "",
  title: "",
  description: "",
  category: "playbook",
  tags: [],
  status: "draft",
  hero_emoji: "",
  hero_image_url: null,
  sections: [{ heading: "", body: "", bullets: [] }],
  sort_order: 0,
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function StaffAcademyEditor() {
  const { isAdmin, loading, user } = useAuth();
  const canManage = !!isAdmin && isStaffEmail(user?.email);
  const { id } = Route.useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const loadOne = useServerFn(getStaffAcademyArticleById);
  const upsert = useServerFn(upsertStaffAcademyArticle);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const q = useQuery({
    queryKey: ["admin-staff-academy", id],
    queryFn: () => loadOne({ data: { id } }),
    enabled: canManage && !isNew,
  });

  useEffect(() => {
    if (!isNew && q.data) {
      const r = q.data as DbArticleRow;
      setForm({
        id: r.id,
        slug: r.slug,
        title: r.title,
        description: r.description,
        category: r.category,
        tags: r.tags,
        status: r.status,
        hero_emoji: r.hero_emoji,
        hero_image_url: r.hero_image_url,
        sections: r.sections.length > 0 ? r.sections : [{ heading: "", body: "" }],
        sort_order: r.sort_order,
      });
      setSlugTouched(true);
    }
  }, [q.data, isNew]);

  const save = useMutation({
    mutationFn: (publish: boolean) =>
      upsert({
        data: {
          ...form,
          status: publish ? "active" : form.status,
          hero_image_url: form.hero_image_url || null,
          hero_emoji: form.hero_emoji || null,
        },
      }),
    onSuccess: (row) => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin-staff-academy"] });
      qc.invalidateQueries({ queryKey: ["staff-academy-articles"] });
      qc.invalidateQueries({ queryKey: ["staff-academy-article"] });
      if (isNew && row?.id) {
        navigate({ to: "/admin/staff-academy/$id", params: { id: row.id } });
      }
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const loadHistory = useServerFn(listStaffAcademyArticleHistory);
  const historyQ = useQuery({
    queryKey: ["admin-staff-academy-history", id],
    queryFn: () => loadHistory({ data: { article_id: id } }),
    enabled: canManage && !isNew,
  });

  const loadStats = useServerFn(getStaffAcademyArticleStats);
  const statsQ = useQuery({
    queryKey: ["admin-staff-academy-stats", id],
    queryFn: () => loadStats({ data: { article_id: id } }),
    enabled: canManage && !isNew,
    staleTime: 30_000,
  });

  // Refresh history when a save happens
  useEffect(() => {
    if (save.isSuccess && !isNew) {
      qc.invalidateQueries({ queryKey: ["admin-staff-academy-history", id] });
    }
  }, [save.isSuccess, isNew, id, qc]);

  const previewArticle = useMemo(() => form, [form]);

  if (loading) {
    return (
      <div className="rounded-lg border p-6 text-sm text-muted-foreground">Loading…</div>
    );
  }
  if (!canManage) {
    return (
      <div className="rounded-lg border p-6 text-sm text-muted-foreground">
        Restricted — requires an admin account on the <b>@365motorsales.com</b> domain.
      </div>
    );
  }

  const setSection = (i: number, patch: Partial<DbArticleSection>) => {
    setForm((f) => ({
      ...f,
      sections: f.sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    }));
  };
  const addSection = () =>
    setForm((f) => ({
      ...f,
      sections: [...f.sections, { heading: "", body: "", bullets: [] }],
    }));
  const removeSection = (i: number) =>
    setForm((f) => ({ ...f, sections: f.sections.filter((_, idx) => idx !== i) }));
  const moveSection = (i: number, dir: -1 | 1) => {
    const t = i + dir;
    if (t < 0 || t >= form.sections.length) return;
    const next = [...form.sections];
    const [x] = next.splice(i, 1);
    next.splice(t, 0, x);
    setForm((f) => ({ ...f, sections: next }));
  };

  const addTag = (raw: string) => {
    const t = raw.trim().toLowerCase();
    if (!t) return;
    if (form.tags.includes(t)) return;
    setForm((f) => ({ ...f, tags: [...f.tags, t] }));
    setTagInput("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/staff-academy">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> All articles
            </Link>
          </Button>
          <GraduationCap className="h-5 w-5 text-primary" />
          <h1 className="font-display text-2xl font-bold">
            {isNew ? "New article" : form.title || "Untitled"}
          </h1>
          {!isNew && (
            <Badge variant="outline" className="text-[10px]">
              /{form.slug}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => save.mutate(false)}
            disabled={save.isPending}
          >
            {save.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            Save
          </Button>
          <Button onClick={() => save.mutate(true)} disabled={save.isPending}>
            Save & publish
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Article</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setForm((f) => ({
                    ...f,
                    title,
                    slug: slugTouched ? f.slug : slugify(title),
                  }));
                }}
                placeholder="How to sell a boost pack"
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm((f) => ({ ...f, slug: slugify(e.target.value) }));
                }}
                placeholder="how-to-sell-a-boost-pack"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                URL: /staff/academy/{form.slug || "your-slug"}
              </p>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="Short summary shown on cards and social."
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, category: v as ArticleCategory }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CATEGORY_META) as ArticleCategory[]).map((c) => (
                      <SelectItem key={c} value={c}>
                        {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Published</SelectItem>
                    <SelectItem value="coming-soon">Coming soon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Hero emoji</Label>
                <Input
                  value={form.hero_emoji ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, hero_emoji: e.target.value }))
                  }
                  placeholder="🚀"
                  maxLength={4}
                />
              </div>
              <div>
                <Label>Hero image URL (optional)</Label>
                <Input
                  value={form.hero_image_url ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, hero_image_url: e.target.value }))
                  }
                  placeholder="https://..."
                />
              </div>
            </div>
            <div>
              <Label>Tags</Label>
              <div className="mt-1 flex flex-wrap gap-1">
                {form.tags.map((t) => (
                  <Badge
                    key={t}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() =>
                      setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }))
                    }
                  >
                    #{t} ×
                  </Badge>
                ))}
              </div>
              <Input
                className="mt-2"
                placeholder="Add tag and press Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag(tagInput);
                  }
                }}
              />
            </div>

            <div className="pt-2">
              <div className="mb-2 flex items-center justify-between">
                <Label>Sections</Label>
                <Button size="sm" variant="outline" onClick={addSection}>
                  <Plus className="mr-1.5 h-4 w-4" /> Add section
                </Button>
              </div>
              <div className="space-y-3">
                {form.sections.map((s, i) => (
                  <div key={i} className="rounded-md border p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Section {i + 1}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => moveSection(i, -1)}
                          aria-label="Move up"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => moveSection(i, 1)}
                          aria-label="Move down"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeSection(i)}
                          aria-label="Remove"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Input
                        placeholder="Heading (optional)"
                        value={s.heading ?? ""}
                        onChange={(e) => setSection(i, { heading: e.target.value })}
                      />
                      <Textarea
                        placeholder="Body paragraph (optional)"
                        rows={4}
                        value={s.body ?? ""}
                        onChange={(e) => setSection(i, { body: e.target.value })}
                      />
                      <Textarea
                        placeholder="Bullets (one per line)"
                        rows={3}
                        value={(s.bullets ?? []).join("\n")}
                        onChange={(e) =>
                          setSection(i, {
                            bullets: e.target.value
                              .split("\n")
                              .map((x) => x.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          placeholder="CTA label (optional)"
                          value={s.cta?.label ?? ""}
                          onChange={(e) =>
                            setSection(i, {
                              cta: e.target.value
                                ? { label: e.target.value, to: s.cta?.to ?? "" }
                                : undefined,
                            })
                          }
                        />
                        <Input
                          placeholder="CTA URL / path"
                          value={s.cta?.to ?? ""}
                          onChange={(e) =>
                            setSection(i, {
                              cta: s.cta
                                ? { ...s.cta, to: e.target.value }
                                : e.target.value
                                  ? { label: "Open", to: e.target.value }
                                  : undefined,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit sticky top-4">
          <CardHeader>
            <CardTitle>Live preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {CATEGORY_META[previewArticle.category].emoji}{" "}
                {CATEGORY_META[previewArticle.category].label}
              </Badge>
              {previewArticle.status === "draft" && <Badge variant="outline">Draft</Badge>}
              {previewArticle.status === "coming-soon" && <Badge>Coming soon</Badge>}
            </div>
            <div className="flex items-start gap-3">
              {previewArticle.hero_emoji && (
                <div className="text-4xl">{previewArticle.hero_emoji}</div>
              )}
              <div>
                <h2 className="font-display text-xl font-bold leading-tight">
                  {previewArticle.title || "Untitled"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {previewArticle.description || "Add a description…"}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-4">
              {previewArticle.sections.map((s, i) => (
                <section key={i} className="space-y-1.5">
                  {s.heading && (
                    <h3 className="font-display text-base font-semibold">{s.heading}</h3>
                  )}
                  {s.body && (
                    <p className="whitespace-pre-wrap text-sm text-foreground/90">
                      {s.body}
                    </p>
                  )}
                  {s.bullets && s.bullets.length > 0 && (
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      {s.bullets.map((b, j) => (
                        <li key={j}>{b}</li>
                      ))}
                    </ul>
                  )}
                  {s.cta?.label && (
                    <div className="pt-1">
                      <Button size="sm" variant="secondary">{s.cta.label}</Button>
                    </div>
                  )}
                </section>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {!isNew && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Reader analytics</CardTitle>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                qc.invalidateQueries({ queryKey: ["admin-staff-academy-stats", id] })
              }
              disabled={statsQ.isFetching}
              aria-label="Refresh analytics"
            >
              <RefreshCw className={`h-4 w-4 ${statsQ.isFetching ? "animate-spin" : ""}`} />
            </Button>
          </CardHeader>
          <CardContent>
            {statsQ.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading analytics…
              </div>
            ) : (
              <StatsPanel stats={statsQ.data as ArticleViewStats | undefined} />
            )}
          </CardContent>
        </Card>
      )}

      {!isNew && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Publish history</CardTitle>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                qc.invalidateQueries({ queryKey: ["admin-staff-academy-history", id] })
              }
              disabled={historyQ.isFetching}
              aria-label="Refresh history"
            >
              <RefreshCw
                className={`h-4 w-4 ${historyQ.isFetching ? "animate-spin" : ""}`}
              />
            </Button>
          </CardHeader>
          <CardContent>
            {historyQ.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
              </div>
            ) : (historyQ.data?.length ?? 0) === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No history yet. Publish or edit this article to record an entry.
              </div>
            ) : (
              <ol className="relative space-y-3 border-l pl-4">
                {(historyQ.data as ArticleHistoryRow[]).map((h) => (
                  <HistoryItem key={h.id} entry={h} />
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function actionMeta(a: ArticleHistoryRow["action"]) {
  switch (a) {
    case "published":
      return { label: "Published", icon: Eye, tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" };
    case "unpublished":
      return { label: "Unpublished", icon: EyeOff, tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400" };
    case "created":
      return { label: "Created", icon: FilePlus2, tone: "bg-blue-500/15 text-blue-700 dark:text-blue-400" };
    case "status_changed":
      return { label: "Status changed", icon: RefreshCw, tone: "bg-muted text-foreground" };
    default:
      return { label: "Updated", icon: RefreshCw, tone: "bg-muted text-foreground" };
  }
}

function HistoryItem({ entry }: { entry: ArticleHistoryRow }) {
  const meta = actionMeta(entry.action);
  const Icon = meta.icon;
  const when = entry.created_at ? new Date(entry.created_at) : null;
  const who = entry.changed_by_email
    ? entry.changed_by_email
    : entry.changed_by
    ? entry.changed_by.slice(0, 8)
    : "system";
  return (
    <li className="relative">
      <span className="absolute -left-[21px] top-1 flex h-4 w-4 items-center justify-center rounded-full border bg-background">
        <Icon className="h-2.5 w-2.5" />
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={meta.tone} variant="secondary">{meta.label}</Badge>
        {entry.from_status && entry.to_status && entry.from_status !== entry.to_status && (
          <span className="text-xs text-muted-foreground">
            {entry.from_status} → {entry.to_status}
          </span>
        )}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {when ? when.toLocaleString() : ""} · {who}
      </div>
    </li>
  );
}


function StatsPanel({ stats }: { stats: ArticleViewStats | undefined }) {
  if (!stats) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        No analytics available yet.
      </div>
    );
  }
  const last = stats.last_viewed_at ? new Date(stats.last_viewed_at) : null;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile icon={Eye} label="Total views" value={stats.views.toLocaleString()} />
        <StatTile
          icon={Users}
          label="Unique viewers"
          value={stats.unique_viewers.toLocaleString()}
        />
        <StatTile
          icon={Clock}
          label="Last accessed"
          value={last ? last.toLocaleString() : "—"}
          small
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <StatTile icon={BarChart3} label="Views · last 7 days" value={String(stats.views_last_7d)} />
        <StatTile icon={BarChart3} label="Views · last 30 days" value={String(stats.views_last_30d)} />
      </div>
      {stats.recent.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recent viewers
          </div>
          <ul className="divide-y rounded-md border">
            {stats.recent.map((r, i) => (
              <li key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="truncate">
                  {r.viewer_email ?? (r.viewer_id ? r.viewer_id.slice(0, 8) : "anonymous")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  small,
}: {
  icon: any;
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className={small ? "mt-1 text-sm font-medium" : "mt-1 text-2xl font-bold"}>
        {value}
      </div>
    </div>
  );
}
