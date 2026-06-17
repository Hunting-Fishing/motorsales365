import { useState } from "react";
import { confirm } from "@/components/ui/confirm-dialog";
import { useServerFn } from "@tanstack/react-start";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, Upload, Pencil, X, Star, Check } from "lucide-react";
import {
  upsertGalleryAlbum,
  deleteGalleryAlbum,
  addGalleryPhotos,
  deleteGalleryPhoto,
  updateGalleryPhoto,
} from "@/lib/business-mini-site.functions";
import { uploadWithRetry } from "@/lib/storage-upload";
import { isVideoUrl } from "@/lib/media-kind";
import { Progress } from "@/components/ui/progress";

type Album = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  sort_order: number;
};
type Photo = {
  id: string;
  album_id: string;
  url: string;
  caption: string | null;
  sort_order: number;
};

const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB (Supabase default bucket limit)

async function uploadGalleryFile(
  userId: string,
  businessId: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  // Path must start with businessId — the storage RLS policy checks foldername[1] against businesses.id
  const path = `${businessId}/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { publicUrl } = await uploadWithRetry({
    bucket: "business-gallery",
    path,
    file,
    contentType: file.type,
    onProgress: (e) => onProgress(e.percent),
  });
  return publicUrl;
}

export function GalleryTab({
  businessId,
  userId,
  albums,
  photos,
  onChange,
}: {
  businessId: string;
  userId: string;
  albums: Album[];
  photos: Photo[];
  onChange: () => void;
}) {
  const upsertAlbum = useServerFn(upsertGalleryAlbum);
  const delAlbum = useServerFn(deleteGalleryAlbum);
  const addPhotos = useServerFn(addGalleryPhotos);
  const delPhoto = useServerFn(deleteGalleryPhoto);
  const updPhoto = useServerFn(updateGalleryPhoto);

  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<
    { name: string; percent: number; size: number; kind: "image" | "video" }[]
  >([]);
  const [captionFor, setCaptionFor] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState("");

  const createAlbum = async () => {
    if (!newTitle.trim()) return;
    try {
      await upsertAlbum({
        data: {
          businessId,
          title: newTitle.trim(),
          description: newDesc.trim() || null,
          sort_order: albums.length,
        },
      });
      setNewTitle("");
      setNewDesc("");
      setCreating(false);
      toast.success("Album created");
      onChange();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  const saveEdit = async (id: string) => {
    try {
      await upsertAlbum({
        data: { id, businessId, title: editTitle.trim(), description: editDesc.trim() || null },
      });
      setEditingId(null);
      toast.success("Saved");
      onChange();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  const removeAlbum = async (id: string) => {
    if (!(await confirm({ title: "Delete this album and all its photos?", destructive: true })))
      return;
    try {
      await delAlbum({ data: { businessId, id } });
      toast.success("Deleted");
      onChange();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  const onFiles = async (albumId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);

    // Validate sizes and types up front
    for (const f of arr) {
      const isVideo = f.type.startsWith("video/");
      const isImage = f.type.startsWith("image/");
      if (!isImage && !isVideo) {
        toast.error(`${f.name}: only images and videos are allowed`);
        return;
      }
      const limit = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
      if (f.size > limit) {
        toast.error(
          `${f.name} is too large (max ${isVideo ? "50 MB" : "15 MB"})`,
        );
        return;
      }
    }

    setUploadingFor(albumId);
    setUploadProgress(
      arr.map((f) => ({
        name: f.name,
        percent: 0,
        size: f.size,
        kind: f.type.startsWith("video/") ? "video" : "image",
      })),
    );
    try {
      const urls: { url: string }[] = [];
      for (let i = 0; i < arr.length; i++) {
        const f = arr[i];
        const url = await uploadGalleryFile(userId, businessId, f, (percent) => {
          setUploadProgress((prev) =>
            prev.map((p, idx) => (idx === i ? { ...p, percent } : p)),
          );
        });
        urls.push({ url });
      }
      await addPhotos({ data: { businessId, albumId, photos: urls } });
      toast.success(`Uploaded ${urls.length} file${urls.length === 1 ? "" : "s"}`);
      onChange();
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploadingFor(null);
      setUploadProgress([]);
    }
  };

  const removePhoto = async (id: string) => {
    try {
      await delPhoto({ data: { businessId, id } });
      onChange();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  const saveCaption = async (id: string) => {
    try {
      await updPhoto({ data: { businessId, id, caption: captionDraft.trim() || null } });
      setCaptionFor(null);
      setCaptionDraft("");
      toast.success("Caption saved");
      onChange();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  const setAsCover = async (albumId: string, url: string) => {
    try {
      await upsertAlbum({
        data: {
          id: albumId,
          businessId,
          title: albums.find((a) => a.id === albumId)?.title ?? "",
          cover_url: url,
        },
      });
      toast.success("Cover updated");
      onChange();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  return (
    <Card className="space-y-4 p-4 md:p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold">Photo galleries</h2>
          <p className="text-xs text-muted-foreground">
            Group photos into albums — shop interior, recent work, before/after, etc.
          </p>
        </div>
        {!creating && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="mr-1 h-4 w-4" />
            New album
          </Button>
        )}
      </div>

      {creating && (
        <div className="space-y-2 rounded-lg border border-border p-3">
          <div>
            <Label>Album title</Label>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              maxLength={80}
              placeholder="e.g. Recent work"
              className="h-11"
            />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              rows={2}
              maxLength={400}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={createAlbum}>
              Create
            </Button>
          </div>
        </div>
      )}

      {albums.length === 0 && !creating && (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          No albums yet. Create one to start sharing photos with customers.
        </p>
      )}

      <div className="space-y-3">
        {albums.map((a) => {
          const albumPhotos = photos.filter((p) => p.album_id === a.id);
          const isEditing = editingId === a.id;
          return (
            <div key={a.id} className="space-y-3 rounded-lg border border-border p-3">
              {isEditing ? (
                <div className="space-y-2">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    maxLength={80}
                    className="h-11"
                  />
                  <Textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={2}
                    maxLength={400}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={() => saveEdit(a.id)}>
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold">{a.title}</div>
                    {a.description && (
                      <div className="text-xs text-muted-foreground">{a.description}</div>
                    )}
                    <div className="mt-1 text-xs text-muted-foreground">
                      {albumPhotos.length} photo{albumPhotos.length === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Edit album"
                      onClick={() => {
                        setEditingId(a.id);
                        setEditTitle(a.title);
                        setEditDesc(a.description ?? "");
                      }}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Delete album" onClick={() => removeAlbum(a.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {albumPhotos.map((p) => {
                  const isCover = a.cover_url === p.url;
                  const isCaptioning = captionFor === p.id;
                  return (
                    <div
                      key={p.id}
                      className="group relative aspect-square overflow-hidden rounded-md border border-border bg-muted"
                    >
                      {isVideoUrl(p.url) ? (
                        <video
                          src={p.url}
                          className="h-full w-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                          controls
                        />
                      ) : (
                        <img
                          src={p.url}
                          alt={p.caption ?? ""}
                          className="h-full w-full object-cover"
                        />
                      )}
                      {isCover && (
                        <div
                          className="absolute left-1 top-1 rounded-full bg-primary/90 p-1 text-primary-foreground"
                          title="Album cover"
                        >
                          <Star className="h-3 w-3 fill-current" />
                        </div>
                      )}
                      <div className="absolute right-1 top-1 flex gap-1 opacity-0 group-hover:opacity-100">
                        {!isCover && (
                          <button
                            type="button"
                            onClick={() => setAsCover(a.id, p.url)}
                            className="rounded-full bg-background/80 p-1"
                            aria-label="Set as cover"
                            title="Set as cover"
                          >
                            <Star className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setCaptionFor(p.id);
                            setCaptionDraft(p.caption ?? "");
                          }}
                          className="rounded-full bg-background/80 p-1"
                          aria-label="Edit caption"
                          title="Edit caption"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removePhoto(p.id)}
                          className="rounded-full bg-background/80 p-1"
                          aria-label="Remove photo"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {isCaptioning && (
                        <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-background/95 p-1">
                          <Input
                            value={captionDraft}
                            onChange={(e) => setCaptionDraft(e.target.value)}
                            maxLength={300}
                            placeholder="Caption"
                            className="h-7 flex-1 text-xs"
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => saveCaption(p.id)}
                            aria-label="Save caption"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => {
                              setCaptionFor(null);
                              setCaptionDraft("");
                            }}
                            aria-label="Cancel"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-muted/30 p-2 text-center text-xs text-muted-foreground hover:bg-muted/60">
                  <Upload className="h-4 w-4" />
                  {uploadingFor === a.id ? "Uploading…" : "Add photo or video"}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    disabled={uploadingFor === a.id}
                    onChange={(e) => {
                      onFiles(a.id, e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>

              {uploadingFor === a.id && uploadProgress.length > 0 && (
                <div className="space-y-2 rounded-md border border-border bg-muted/40 p-2">
                  {uploadProgress.map((p, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-muted-foreground">
                          {p.kind === "video" ? "🎬 " : "🖼️ "}
                          {p.name}
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          {p.percent}%
                        </span>
                      </div>
                      <Progress value={p.percent} className="h-1.5" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ================ CONTACT CHANNELS ================ */

import { upsertContactChannel, deleteContactChannel } from "@/lib/business-mini-site.functions";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  COUNTRY_CODES,
  parseE164,
  buildE164,
  formatNational,
} from "@/data/country-codes";

type Channel = {
  id: string;
  kind: string;
  label: string | null;
  value: string;
  sort_order: number;
};

const KIND_LABELS: Record<string, string> = {
  phone: "Phone",
  whatsapp: "WhatsApp",
  viber: "Viber",
  telegram: "Telegram",
  instagram: "Instagram",
  tiktok: "TikTok",
  email: "Email",
  facebook: "Facebook",
  x: "X (Twitter)",
  linkedin: "LinkedIn",
};

const PHONE_KINDS = new Set(["phone", "whatsapp", "viber"]);

const KIND_PLACEHOLDER: Record<string, string> = {
  telegram: "@yourhandle",
  instagram: "@yourhandle",
  tiktok: "@yourhandle",
  email: "name@example.com",
  facebook: "https://facebook.com/yourpage",
  x: "@yourhandle",
  linkedin: "https://linkedin.com/company/yourname",
};

function formatChannelValue(kind: string, value: string): string {
  if (PHONE_KINDS.has(kind)) {
    const parsed = parseE164(value);
    const country = COUNTRY_CODES.find((c) => c.iso === parsed.iso);
    if (country) return `${country.flag} ${country.dial} ${formatNational(parsed.national, parsed.iso)}`;
  }
  return value;
}

function PhoneField({
  iso,
  national,
  onIsoChange,
  onNationalChange,
}: {
  iso: string;
  national: string;
  onIsoChange: (v: string) => void;
  onNationalChange: (digits: string) => void;
}) {
  const country = COUNTRY_CODES.find((c) => c.iso === iso) ?? COUNTRY_CODES[0];
  const display = formatNational(national, iso);
  return (
    <div className="flex gap-2">
      <Select value={iso} onValueChange={onIsoChange}>
        <SelectTrigger className="h-11 w-[140px]" aria-label="Country code">
          <SelectValue>
            <span className="inline-flex items-center gap-1">
              <span>{country.flag}</span>
              <span className="text-sm">{country.dial}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {COUNTRY_CODES.map((c) => (
            <SelectItem key={c.iso} value={c.iso}>
              <span className="inline-flex items-center gap-2">
                <span>{c.flag}</span>
                <span className="text-sm">{c.dial}</span>
                <span className="text-xs text-muted-foreground">{c.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="tel"
        inputMode="tel"
        value={display}
        onChange={(e) => onNationalChange(e.target.value.replace(/\D/g, ""))}
        placeholder="969-434-3430"
        className="h-11 flex-1"
        maxLength={24}
      />
    </div>
  );
}


export function ContactChannelsTab({
  businessId,
  channels,
  onChange,
}: {
  businessId: string;
  channels: Channel[];
  onChange: () => void;
}) {
  const upsert = useServerFn(upsertContactChannel);
  const del = useServerFn(deleteContactChannel);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [kind, setKind] = useState<string>("phone");
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [iso, setIso] = useState<string>("PH");
  const [national, setNational] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setKind("phone");
    setLabel("");
    setValue("");
    setIso("PH");
    setNational("");
    setAdding(false);
    setEditingId(null);
  };

  const startEdit = (c: Channel) => {
    setEditingId(c.id);
    setAdding(true);
    setKind(c.kind);
    setLabel(c.label ?? "");
    if (PHONE_KINDS.has(c.kind)) {
      const p = parseE164(c.value);
      setIso(p.iso);
      setNational(p.national);
      setValue("");
    } else {
      setValue(c.value);
      setIso("PH");
      setNational("");
    }
  };


  const save = async () => {
    let finalValue = value.trim();
    if (PHONE_KINDS.has(kind)) {
      const built = buildE164(iso, national);
      if (!built) {
        toast.error("Enter a valid phone number");
        return;
      }
      finalValue = built;
    }
    if (!finalValue) {
      toast.error("Enter a value");
      return;
    }
    if (kind === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(finalValue)) {
      toast.error("Enter a valid email");
      return;
    }
    setSaving(true);
    try {
      await upsert({
        data: {
          id: editingId ?? undefined,
          businessId,
          kind: kind as any,
          label: label.trim() || null,
          value: finalValue,
          sort_order: editingId ? undefined : channels.length,
        } as any,
      });
      toast.success(editingId ? "Updated" : "Added");
      resetForm();
      onChange();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!(await confirm({ title: "Remove this contact channel?" }))) return;
    try {
      await del({ data: { businessId, id } });
      onChange();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  return (
    <Card className="space-y-4 p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-semibold">Contact channels</h2>
          <p className="text-xs text-muted-foreground">
            Add every way customers can reach you — phone, WhatsApp, Viber, Telegram, Instagram,
            TikTok, email, social pages.
          </p>
        </div>
        {!adding && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add channel
          </Button>
        )}
      </div>

      {adding && (
        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Channel</Label>
              <Select
                value={kind}
                onValueChange={(v) => {
                  setKind(v);
                  setValue("");
                  setNational("");
                }}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(KIND_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Label (optional)</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={40}
                placeholder="e.g. Sales, Service"
                className="h-11"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>{KIND_LABELS[kind]} value</Label>
            {PHONE_KINDS.has(kind) ? (
              <PhoneField
                iso={iso}
                national={national}
                onIsoChange={setIso}
                onNationalChange={setNational}
              />
            ) : (
              <Input
                type={kind === "email" ? "email" : "text"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                maxLength={200}
                placeholder={KIND_PLACEHOLDER[kind]}
                className="h-11"
              />
            )}
            {PHONE_KINDS.has(kind) && (
              <p className="text-[11px] text-muted-foreground">
                Pick the country, then type the local number — we store it as international format.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={resetForm} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {editingId ? "Save" : "Add"}
            </Button>
          </div>
        </div>
      )}

      {channels.length === 0 && !adding ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          No contact channels yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Channel</TableHead>
                <TableHead className="w-[140px]">Label</TableHead>
                <TableHead>Value</TableHead>
                <TableHead className="w-[110px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channels.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{KIND_LABELS[c.kind] ?? c.kind}</TableCell>
                  <TableCell className="text-muted-foreground">{c.label ?? "—"}</TableCell>
                  <TableCell className="break-all text-sm">
                    {formatChannelValue(c.kind, c.value)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Edit contact"
                        onClick={() => startEdit(c)}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remove contact"
                        onClick={() => remove(c.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
