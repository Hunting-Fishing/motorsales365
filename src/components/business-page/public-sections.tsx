import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Images,
  Phone,
  Mail,
  MessageCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Instagram,
  Facebook,
  Linkedin,
} from "lucide-react";

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
type Channel = {
  id: string;
  kind: string;
  label: string | null;
  value: string;
  sort_order: number;
};

/* ============== GALLERY ============== */

export function PublicGallerySection({
  albums,
  photos,
  accent,
  onAlbumOpen,
}: {
  albums: Album[];
  photos: Photo[];
  accent?: string | null;
  onAlbumOpen?: (albumId: string) => void;
}) {
  const [openAlbumId, setOpenAlbumId] = useState<string | null>(null);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const openPhotos = openAlbumId ? photos.filter((p) => p.album_id === openAlbumId) : [];

  const close = useCallback(() => setLightboxIdx(null), []);
  const prev = useCallback(
    () =>
      setLightboxIdx((i) => (i === null ? null : (i - 1 + openPhotos.length) % openPhotos.length)),
    [openPhotos.length],
  );
  const next = useCallback(
    () => setLightboxIdx((i) => (i === null ? null : (i + 1) % openPhotos.length)),
    [openPhotos.length],
  );

  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx, close, prev, next]);

  if (albums.length === 0) return null;

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <Images className="h-5 w-5" style={accent ? { color: accent } : undefined} />
        <h2 className="font-display text-lg font-semibold">Gallery</h2>
      </div>

      {!openAlbumId ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {albums.map((a) => {
            const count = photos.filter((p) => p.album_id === a.id).length;
            const cover = a.cover_url ?? photos.find((p) => p.album_id === a.id)?.url ?? null;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  setOpenAlbumId(a.id);
                  onAlbumOpen?.(a.id);
                }}
                className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted text-left"
              >
                {cover ? (
                  <img
                    src={cover}
                    alt={a.title}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <Images className="h-8 w-8" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-2 text-white">
                  <div className="truncate text-sm font-semibold">{a.title}</div>
                  <div className="text-xs opacity-80">
                    {count} photo{count === 1 ? "" : "s"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div>
          <Button variant="ghost" size="sm" onClick={() => setOpenAlbumId(null)}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            All albums
          </Button>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {openPhotos.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setLightboxIdx(i)}
                className="relative aspect-square overflow-hidden rounded-md border border-border bg-muted"
              >
                {isVideoUrl(p.url) ? (
                  <>
                    <video
                      src={p.url}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="rounded-full bg-white/90 p-2 text-black">
                        <Play className="h-4 w-4 fill-current" />
                      </div>
                    </div>
                  </>
                ) : (
                  <img
                    src={p.url}
                    alt={p.caption ?? ""}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {lightboxIdx !== null && openPhotos[lightboxIdx] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          {openPhotos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                aria-label="Previous"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                className="absolute right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                aria-label="Next"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          <img
            src={openPhotos[lightboxIdx].url}
            alt={openPhotos[lightboxIdx].caption ?? ""}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {openPhotos[lightboxIdx].caption && (
            <div className="absolute inset-x-0 bottom-4 mx-auto max-w-2xl px-4 text-center text-sm text-white">
              {openPhotos[lightboxIdx].caption}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/* ============== CONTACT CHANNELS ============== */

function channelHref(kind: string, value: string): string | undefined {
  const v = value.trim();
  switch (kind) {
    case "phone":
    case "viber":
      return `tel:${v.replace(/\s+/g, "")}`;
    case "whatsapp": {
      const num = v.replace(/[^\d]/g, "");
      return `https://wa.me/${num}`;
    }
    case "telegram":
      return v.startsWith("http") ? v : `https://t.me/${v.replace(/^@/, "")}`;
    case "instagram":
      return v.startsWith("http") ? v : `https://instagram.com/${v.replace(/^@/, "")}`;
    case "tiktok":
      return v.startsWith("http") ? v : `https://tiktok.com/@${v.replace(/^@/, "")}`;
    case "x":
      return v.startsWith("http") ? v : `https://x.com/${v.replace(/^@/, "")}`;
    case "email":
      return `mailto:${v}`;
    case "facebook":
    case "linkedin":
      return v.startsWith("http") ? v : undefined;
  }
  return undefined;
}

const KIND_LABELS: Record<string, string> = {
  phone: "Phone",
  whatsapp: "WhatsApp",
  viber: "Viber",
  telegram: "Telegram",
  instagram: "Instagram",
  tiktok: "TikTok",
  email: "Email",
  facebook: "Facebook",
  x: "X",
  linkedin: "LinkedIn",
};

function ChannelIcon({ kind }: { kind: string }) {
  switch (kind) {
    case "phone":
    case "viber":
      return <Phone className="h-4 w-4" />;
    case "email":
      return <Mail className="h-4 w-4" />;
    case "whatsapp":
    case "telegram":
    case "tiktok":
    case "x":
      return <MessageCircle className="h-4 w-4" />;
    case "instagram":
      return <Instagram className="h-4 w-4" />;
    case "facebook":
      return <Facebook className="h-4 w-4" />;
    case "linkedin":
      return <Linkedin className="h-4 w-4" />;
  }
  return <MessageCircle className="h-4 w-4" />;
}

export function PublicContactSection({
  channels,
  accent,
}: {
  channels: Channel[];
  accent?: string | null;
}) {
  if (channels.length === 0) return null;
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <Phone className="h-5 w-5" style={accent ? { color: accent } : undefined} />
        <h2 className="font-display text-lg font-semibold">Get in touch</h2>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {channels.map((c) => {
          const href = channelHref(c.kind, c.value);
          const content = (
            <div className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50">
              <ChannelIcon kind={c.kind} />
              <div className="min-w-0 flex-1">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {KIND_LABELS[c.kind] ?? c.kind}
                  {c.label ? ` · ${c.label}` : ""}
                </div>
                <div className="truncate text-sm font-medium">{c.value}</div>
              </div>
            </div>
          );
          return href ? (
            <a
              key={c.id}
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
            >
              {content}
            </a>
          ) : (
            <div key={c.id}>{content}</div>
          );
        })}
      </div>
    </Card>
  );
}

/* ============== FEATURED VIDEO EMBED ============== */

function parseVideoEmbed(url: string, provider: string | null): string | null {
  try {
    const u = new URL(url);
    if (provider === "youtube" || u.hostname.includes("youtube.com") || u.hostname === "youtu.be") {
      let id = "";
      if (u.hostname === "youtu.be") id = u.pathname.slice(1);
      else if (u.pathname === "/watch") id = u.searchParams.get("v") ?? "";
      else if (u.pathname.startsWith("/embed/")) id = u.pathname.slice(7);
      else if (u.pathname.startsWith("/shorts/")) id = u.pathname.slice(8);
      if (!/^[\w-]{6,20}$/.test(id)) return null;
      return `https://www.youtube.com/embed/${id}`;
    }
    if (provider === "vimeo" || u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop() ?? "";
      if (!/^\d{5,12}$/.test(id)) return null;
      return `https://player.vimeo.com/video/${id}`;
    }
    if (provider === "facebook" || u.hostname.includes("facebook.com")) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`;
    }
  } catch {
    return null;
  }
  return null;
}

export function FeaturedVideoEmbed({ url, provider }: { url: string; provider: string | null }) {
  const embed = parseVideoEmbed(url, provider);
  if (!embed) return null;
  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
      <iframe
        src={embed}
        title="Featured video"
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}
