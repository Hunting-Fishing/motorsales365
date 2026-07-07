import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Download,
  FileText,
  Film,
  Image as ImageIcon,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { isStaffEmail } from "@/lib/staff-domain";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Progress } from "@/components/ui/progress";
import {
  deleteStaffAcademyAsset,
  listAllStaffAcademyAssetsAdmin,
  upsertStaffAcademyAsset,
  type StaffAcademyAsset,
} from "@/lib/staff-academy-assets.functions";
import { uploadWithRetry } from "@/lib/storage-upload";

export const Route = createFileRoute("/admin/staff-academy/assets")({
  head: () => ({ meta: [{ title: "Staff Academy — Assets" }] }),
  component: StaffAcademyAssetsAdmin,
});

const KIND_META: Record<
  StaffAcademyAsset["kind"],
  { label: string; icon: typeof ImageIcon }
> = {
  infographic: { label: "Infographic", icon: ImageIcon },
  script: { label: "Script", icon: FileText },
  image: { label: "Image", icon: ImageIcon },
  video: { label: "Video", icon: Film },
  document: { label: "Document", icon: FileText },
};

const BUCKET = "staff-academy-assets";

function humanSize(n: number | null) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function slugSegment(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function guessKind(file: File): StaffAcademyAsset["kind"] {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf") return "document";
  return "document";
}

function StaffAcademyAssetsAdmin() {
  const { isAdmin, loading, user } = useAuth();
  const canManage = !!isAdmin && isStaffEmail(user?.email);
  const qc = useQueryClient();
  const fetchAll = useServerFn(listAllStaffAcademyAssetsAdmin);
  const upsert = useServerFn(upsertStaffAcademyAsset);
  const del = useServerFn(deleteStaffAcademyAsset);

  const [filter, setFilter] = useState<"all" | StaffAcademyAsset["kind"]>("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<StaffAcademyAsset | null>(null);

  const q = useQuery({
    queryKey: ["admin-staff-academy-assets"],
    queryFn: () => fetchAll(),
    enabled: !!isAdmin,
  });

  const rows: StaffAcademyAsset[] = q.data ?? [];
  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.kind === filter)),
    [rows, filter],
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-staff-academy-assets"] });
    qc.invalidateQueries({ queryKey: ["staff-academy-assets"] });
  };

  const deleteM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Asset deleted");
      setConfirmDelete(null);
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const toggleStatus = useMutation({
    mutationFn: (r: StaffAcademyAsset) =>
      upsert({
        data: {
          id: r.id,
          title: r.title,
          description: r.description,
          kind: r.kind,
          storage_path: r.storage_path,
          file_url: r.file_url,
          thumbnail_url: r.thumbnail_url,
          mime_type: r.mime_type,
          file_size: r.file_size,
          tags: r.tags,
          status: r.status === "active" ? "draft" : "active",
          sort_order: r.sort_order,
        },
      }),
    onSuccess: () => {
      toast.success("Updated");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  if (loading) {
    return <div className="rounded-lg border p-6 text-sm text-muted-foreground">Loading…</div>;
  }
  if (!isAdmin) {
    return (
      <div className="rounded-lg border p-6 text-sm text-muted-foreground">Admins only.</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Staff Academy — Assets</h1>
          <p className="text-sm text-muted-foreground">
            Upload infographics, scripts, images and videos for the training hub.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/admin/staff-academy">Articles</Link>
          </Button>
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Upload
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "infographic", "script", "image", "video", "document"] as const).map(
          (k) => (
            <Button
              key={k}
              size="sm"
              variant={filter === k ? "default" : "outline"}
              onClick={() => setFilter(k)}
            >
              {k === "all" ? "All" : KIND_META[k].label}
            </Button>
          ),
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Media library ({filtered.length})</CardTitle>
          <CardDescription>Signed URLs refresh hourly.</CardDescription>
        </CardHeader>
        <CardContent>
          {q.isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No assets yet. Click <strong>Upload</strong> to add one.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((r) => {
                const Icon = KIND_META[r.kind].icon;
                const isImage = r.mime_type?.startsWith("image/");
                const isVideo = r.mime_type?.startsWith("video/");
                return (
                  <div key={r.id} className="rounded-lg border bg-card overflow-hidden">
                    <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                      {isImage ? (
                        <img
                          src={r.file_url}
                          alt={r.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : isVideo ? (
                        <video
                          src={r.file_url}
                          className="h-full w-full object-cover"
                          muted
                          playsInline
                        />
                      ) : (
                        <Icon className="h-10 w-10 text-muted-foreground" />
                      )}
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{r.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {KIND_META[r.kind].label} · {humanSize(r.file_size)}
                          </div>
                        </div>
                        <Badge variant={r.status === "active" ? "default" : "outline"}>
                          {r.status === "active" ? "Published" : "Draft"}
                        </Badge>
                      </div>
                      {r.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {r.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1">
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                        >
                          <a href={r.file_url} target="_blank" rel="noopener">
                            <Download className="mr-1 h-3 w-3" /> Open
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={() => toggleStatus.mutate(r)}
                          disabled={toggleStatus.isPending}
                        >
                          {r.status === "active" ? "Unpublish" : "Publish"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => setConfirmDelete(r)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onDone={() => {
          setUploadOpen(false);
          invalidate();
        }}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{confirmDelete?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the DB row and the file from storage. This cannot be undone.
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

function UploadDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}) {
  const upsert = useServerFn(upsertStaffAcademyAsset);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<StaffAcademyAsset["kind"]>("infographic");
  const [tagsStr, setTagsStr] = useState("");
  const [status, setStatus] = useState<"active" | "draft">("active");
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setFile(null);
    setTitle("");
    setDescription("");
    setKind("infographic");
    setTagsStr("");
    setStatus("active");
    setProgress(0);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handlePick = (f: File | null) => {
    setFile(f);
    if (f) {
      if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
      setKind(guessKind(f));
    }
  };

  const submit = async () => {
    if (!file) {
      toast.error("Choose a file");
      return;
    }
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      const ext = file.name.match(/\.[a-z0-9]+$/i)?.[0] ?? "";
      const path = `${kind}/${Date.now()}-${slugSegment(title)}${ext}`;
      const { publicUrl } = await uploadWithRetry({
        bucket: BUCKET,
        path,
        file,
        contentType: file.type || undefined,
        onProgress: (e) => setProgress(e.percent),
      });
      await upsert({
        data: {
          title: title.trim(),
          description: description.trim(),
          kind,
          storage_path: path,
          file_url: publicUrl,
          thumbnail_url: null,
          mime_type: file.type || null,
          file_size: file.size,
          tags: tagsStr
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          status,
          sort_order: 0,
        },
      });
      toast.success("Asset uploaded");
      reset();
      onDone();
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!uploading) {
          if (!o) reset();
          onOpenChange(o);
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload asset</DialogTitle>
          <DialogDescription>
            Infographics, scripts, images (PNG/JPG/SVG), videos (MP4/WebM), or PDFs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="asset-file">File</Label>
            <Input
              id="asset-file"
              ref={fileRef}
              type="file"
              accept="image/*,video/*,application/pdf"
              onChange={(e) => handlePick(e.target.files?.[0] ?? null)}
              disabled={uploading}
            />
            {file && (
              <p className="mt-1 text-xs text-muted-foreground">
                {file.name} · {humanSize(file.size)}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="asset-title">Title</Label>
            <Input
              id="asset-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. How to onboard a business — infographic"
              disabled={uploading}
            />
          </div>

          <div>
            <Label htmlFor="asset-desc">Description (optional)</Label>
            <Textarea
              id="asset-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={uploading}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select
                value={kind}
                onValueChange={(v) => setKind(v as StaffAcademyAsset["kind"])}
                disabled={uploading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(KIND_META) as StaffAcademyAsset["kind"][]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {KIND_META[k].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as "active" | "draft")}
                disabled={uploading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="asset-tags">Tags (comma separated)</Label>
            <Input
              id="asset-tags"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              placeholder="onboarding, sales, script"
              disabled={uploading}
            />
          </div>

          {uploading && (
            <div className="space-y-1">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">Uploading… {progress}%</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={uploading || !file || !title.trim()}>
            {uploading ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <Upload className="mr-1.5 h-4 w-4" /> Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
