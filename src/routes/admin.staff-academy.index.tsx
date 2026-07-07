import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  listAllStaffAcademyArticlesAdmin,
  deleteStaffAcademyArticle,
  upsertStaffAcademyArticle,
  reorderStaffAcademyArticles,
  type DbArticleRow,
} from "@/lib/staff-academy-articles.functions";
import { CATEGORY_META, type ArticleCategory } from "@/content/staff-academy";

export const Route = createFileRoute("/admin/staff-academy/")({
  head: () => ({ meta: [{ title: "Staff Academy — Admin" }] }),
  component: StaffAcademyAdminList,
});

function StaffAcademyAdminList() {
  const { isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const fetchAll = useServerFn(listAllStaffAcademyArticlesAdmin);
  const del = useServerFn(deleteStaffAcademyArticle);
  const upsert = useServerFn(upsertStaffAcademyArticle);
  const reorder = useServerFn(reorderStaffAcademyArticles);

  const [confirmDelete, setConfirmDelete] = useState<DbArticleRow | null>(null);

  const q = useQuery({
    queryKey: ["admin-staff-academy"],
    queryFn: () => fetchAll(),
    enabled: !!isAdmin,
  });

  const rows: DbArticleRow[] = q.data ?? [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-staff-academy"] });
    qc.invalidateQueries({ queryKey: ["staff-academy-articles"] });
  };

  const publishToggle = useMutation({
    mutationFn: (r: DbArticleRow) =>
      upsert({
        data: {
          id: r.id,
          slug: r.slug,
          title: r.title,
          description: r.description,
          category: r.category,
          tags: r.tags,
          status: r.status === "draft" ? "active" : "draft",
          hero_emoji: r.hero_emoji,
          hero_image_url: r.hero_image_url,
          sections: r.sections,
          sort_order: r.sort_order,
        },
      }),
    onSuccess: (_d, r) => {
      toast.success(r.status === "draft" ? "Published" : "Unpublished");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Article deleted");
      setConfirmDelete(null);
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const move = useMutation({
    mutationFn: (ids: string[]) => reorder({ data: { ids } }),
    onSuccess: () => invalidate(),
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const moveRow = (index: number, dir: -1 | 1) => {
    const next = [...rows];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    move.mutate(next.map((r) => r.id));
  };

  const grouped = useMemo(() => {
    const g = new Map<ArticleCategory, DbArticleRow[]>();
    for (const r of rows) {
      const list = g.get(r.category) ?? [];
      list.push(r);
      g.set(r.category, list);
    }
    return g;
  }, [rows]);

  if (loading) {
    return (
      <div className="rounded-lg border p-6 text-sm text-muted-foreground">Loading…</div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="rounded-lg border p-6 text-sm text-muted-foreground">
        Admins only.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          <h1 className="font-display text-2xl font-bold">Staff Academy — Editor</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/staff/academy">View live hub</Link>
          </Button>
          <Button asChild>
            <Link to="/admin/staff-academy/$id" params={{ id: "new" }}>
              <Plus className="mr-1.5 h-4 w-4" /> New article
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All articles ({rows.length})</CardTitle>
          <CardDescription>
            Publish or unpublish, reorder within a category, or delete DB-authored
            articles. In-repo defaults still show on the hub unless a DB row uses the
            same slug (DB wins).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {q.isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No DB articles yet. In-repo defaults still render on the live hub.
              Create a new article to override or extend them.
            </div>
          ) : (
            (Object.keys(CATEGORY_META) as ArticleCategory[]).map((cat) => {
              const list = grouped.get(cat);
              if (!list || list.length === 0) return null;
              return (
                <div key={cat} className="mb-6">
                  <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
                    {CATEGORY_META[cat].emoji} {CATEGORY_META[cat].label}
                  </h2>
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-24">Order</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Updated</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {list.map((r) => {
                          const globalIndex = rows.findIndex((x) => x.id === r.id);
                          return (
                            <TableRow key={r.id}>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => moveRow(globalIndex, -1)}
                                    disabled={move.isPending}
                                    aria-label="Move up"
                                  >
                                    <ArrowUp className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => moveRow(globalIndex, 1)}
                                    disabled={move.isPending}
                                    aria-label="Move down"
                                  >
                                    <ArrowDown className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{r.title}</div>
                                <div className="text-xs text-muted-foreground">
                                  /{r.slug}
                                </div>
                                {r.tags.length > 0 && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {r.tags.slice(0, 4).map((t) => (
                                      <span
                                        key={t}
                                        className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                                      >
                                        #{t}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {r.status === "active" && <Badge>Published</Badge>}
                                {r.status === "coming-soon" && (
                                  <Badge variant="secondary">Coming soon</Badge>
                                )}
                                {r.status === "draft" && (
                                  <Badge variant="outline">Draft</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {r.updated_at?.slice(0, 10)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="inline-flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => publishToggle.mutate(r)}
                                    disabled={publishToggle.isPending}
                                    title={r.status === "draft" ? "Publish" : "Unpublish"}
                                  >
                                    {r.status === "draft" ? (
                                      <Eye className="h-4 w-4" />
                                    ) : (
                                      <EyeOff className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    asChild
                                    size="sm"
                                    variant="ghost"
                                    title="Edit"
                                  >
                                    <Link
                                      to="/admin/staff-academy/$id"
                                      params={{ id: r.id }}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setConfirmDelete(r)}
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{confirmDelete?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the DB row. If an in-repo static article shares the same slug,
              it will show again on the hub as a fallback.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && deleteM.mutate(confirmDelete.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
