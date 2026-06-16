import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Circle, ChevronRight, ChevronDown, Sparkles, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useServerFn } from "@tanstack/react-start";
import { updateBusinessPageSettings } from "@/lib/business-pages.functions";
import { setVanitySlug } from "@/lib/business-mini-site.functions";
import { uploadWithRetry } from "@/lib/storage-upload";
import { toast } from "sonner";

interface ChecklistInput {
  biz: any;
  services: any[];
  products: any[];
  posts: any[];
  albums: any[];
  photos: any[];
  contactChannels: any[];
  bookableItems: any[];
  availability: any[];
}

type InlineKind = "logo" | "cover" | "description" | "phone" | "vanity" | null;

interface Item {
  key: string;
  label: string;
  description: string;
  done: boolean;
  tabValue: string;
  anchor?: string;
  inline?: Exclude<InlineKind, null>;
}

function buildItems(d: ChecklistInput): Item[] {
  const b = d.biz ?? {};
  return [
    {
      key: "logo",
      label: "Add a logo",
      description: "Your brand mark — shown across the directory and your mini-site.",
      done: !!b.logo_url,
      tabValue: "profile",
      anchor: "onboard-logo",
      inline: "logo",
    },
    {
      key: "cover",
      label: "Add a cover image or featured video",
      description: "Big hero image (or a 1080p video) — first thing visitors see.",
      done: !!b.cover_url || !!b.featured_video_url,
      tabValue: "profile",
      anchor: "onboard-cover",
      inline: "cover",
    },
    {
      key: "description",
      label: "Write a description",
      description: "At least 50 characters about what you do, the brands you carry, your story.",
      done: typeof b.description === "string" && b.description.trim().length >= 50,
      tabValue: "profile",
      anchor: "onboard-description",
      inline: "description",
    },
    {
      key: "hours",
      label: "Set your opening hours",
      description: "When you're open. Customers won't book if they don't know.",
      done: !!b.hours,
      tabValue: "hours",
    },
    {
      key: "phone",
      label: "Add a phone number",
      description: "So customers can call or message directly.",
      done: !!b.phone,
      tabValue: "profile",
      anchor: "onboard-phone",
      inline: "phone",
    },
    {
      key: "services",
      label: "List at least one service",
      description: "What you sell or do — show up in search for the right keywords.",
      done: (d.services?.length ?? 0) >= 1,
      tabValue: "services",
    },
    {
      key: "gallery",
      label: "Upload 3+ gallery photos",
      description: "Shop photos, recent work, before/after — builds trust fast.",
      done: (d.photos?.length ?? 0) >= 3,
      tabValue: "gallery",
    },
    {
      key: "contact",
      label: "Add one extra contact channel",
      description: "WhatsApp, Viber, Telegram, Messenger — meet customers where they are.",
      done: (d.contactChannels?.length ?? 0) >= 1,
      tabValue: "contact",
    },
    {
      key: "bookings",
      label: "Enable bookings (optional)",
      description:
        "Let customers book a slot directly — set at least one bookable service and weekly hours.",
      done: (d.bookableItems?.length ?? 0) >= 1 && (d.availability?.length ?? 0) >= 1,
      tabValue: "bookings",
    },
    {
      key: "vanity",
      label: "Claim a short URL",
      description: "Pick a clean address like /b/yourshop — easier to share, more professional.",
      done: !!b.vanity_slug,
      tabValue: "profile",
      anchor: "onboard-vanity",
      inline: "vanity",
    },
  ];
}

export function OnboardingChecklist({
  data,
  userId,
  onJumpTab,
  onSaved,
}: {
  data: ChecklistInput;
  userId: string;
  onJumpTab: (tabValue: string, anchor?: string) => void;
  onSaved: () => void;
}) {
  const items = buildItems(data);
  const done = items.filter((i) => i.done).length;
  const total = items.length;
  const pct = Math.round((done / total) * 100);
  const [openKey, setOpenKey] = useState<string | null>(null);

  if (done === total) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
          <Sparkles className="h-5 w-5" />
          <h2 className="font-display text-base font-semibold">Mini-site complete</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Nice work — every recommended field is filled. Keep posts and gallery fresh to stay on top
          of the directory.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold">Set up your mini-site</h2>
          <p className="text-xs text-muted-foreground">
            {done} of {total} complete · {pct}%
          </p>
        </div>
      </div>
      <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ul className="space-y-1.5">
        {items.map((it) => {
          const isOpen = openKey === it.key;
          const expandable = !!it.inline && !it.done;
          return (
            <li key={it.key}>
              <button
                type="button"
                onClick={() => {
                  if (it.done) return;
                  if (expandable) {
                    setOpenKey(isOpen ? null : it.key);
                  } else {
                    onJumpTab(it.tabValue, it.anchor);
                  }
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md border border-transparent p-2 text-left transition-colors",
                  it.done ? "opacity-60" : "hover:border-border hover:bg-muted/40",
                  isOpen && "border-border bg-muted/40",
                )}
              >
                {it.done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <div className={cn("text-sm font-medium", it.done && "line-through")}>
                    {it.label}
                  </div>
                  <div className="text-xs text-muted-foreground">{it.description}</div>
                </div>
                {!it.done &&
                  (expandable ? (
                    isOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ))}
              </button>
              {expandable && isOpen && (
                <div className="ml-8 mr-2 mt-1 mb-2 rounded-md border border-border bg-background p-3">
                  <InlineEditor
                    kind={it.inline!}
                    biz={data.biz}
                    userId={userId}
                    onDone={() => {
                      setOpenKey(null);
                      onSaved();
                    }}
                    onOpenTab={() => {
                      setOpenKey(null);
                      onJumpTab(it.tabValue, it.anchor);
                    }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/* ------------- Inline editors ------------- */

function InlineEditor({
  kind,
  biz,
  userId,
  onDone,
  onOpenTab,
}: {
  kind: Exclude<InlineKind, null>;
  biz: any;
  userId: string;
  onDone: () => void;
  onOpenTab: () => void;
}) {
  if (kind === "logo" || kind === "cover") {
    return (
      <MediaInline
        kind={kind}
        biz={biz}
        userId={userId}
        onDone={onDone}
        onOpenTab={onOpenTab}
      />
    );
  }
  if (kind === "description") {
    return <DescriptionInline biz={biz} onDone={onDone} />;
  }
  if (kind === "phone") {
    return <PhoneInline biz={biz} onDone={onDone} />;
  }
  if (kind === "vanity") {
    return <VanityInline biz={biz} onDone={onDone} />;
  }
  return null;
}

async function uploadMedia(userId: string, businessId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${businessId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { publicUrl } = await uploadWithRetry({
    bucket: "business-media",
    path,
    file,
    contentType: file.type,
  });
  return publicUrl;
}

function MediaInline({
  kind,
  biz,
  userId,
  onDone,
  onOpenTab,
}: {
  kind: "logo" | "cover";
  biz: any;
  userId: string;
  onDone: () => void;
  onOpenTab: () => void;
}) {
  const save = useServerFn(updateBusinessPageSettings);
  const initial: string | null = kind === "logo" ? biz.logo_url : biz.cover_url;
  const [url, setUrl] = useState<string | null>(initial);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const u = await uploadMedia(userId, biz.id, file);
      setUrl(u);
      await save({
        data: {
          businessId: biz.id,
          [kind === "logo" ? "logo_url" : "cover_url"]: u,
        } as any,
      });
      toast.success(kind === "logo" ? "Logo saved" : "Cover saved");
      onDone();
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {url ? (
        <div className="relative inline-block">
          <img
            src={url}
            alt={kind}
            className={cn(
              "rounded-md border border-border object-cover",
              kind === "logo" ? "h-20 w-20" : "h-28 w-full max-w-sm",
            )}
          />
          <button
            type="button"
            onClick={() => setUrl(null)}
            className="absolute -right-2 -top-2 rounded-full bg-background p-1 shadow"
            aria-label="Clear"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
            disabled={busy}
          />
          <span className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 text-sm hover:bg-muted">
            <Upload className="h-4 w-4" />
            {busy ? "Uploading…" : url ? "Replace image" : "Choose image"}
          </span>
        </label>
        {kind === "cover" && (
          <Button size="sm" variant="ghost" type="button" onClick={onOpenTab}>
            Or add a featured video
          </Button>
        )}
      </div>
    </div>
  );
}

function DescriptionInline({ biz, onDone }: { biz: any; onDone: () => void }) {
  const save = useServerFn(updateBusinessPageSettings);
  const [value, setValue] = useState<string>(biz.description ?? "");
  const [busy, setBusy] = useState(false);
  const len = value.trim().length;

  const submit = async () => {
    if (len < 50) {
      toast.error("Please write at least 50 characters.");
      return;
    }
    setBusy(true);
    try {
      await save({ data: { businessId: biz.id, description: value.trim() } });
      toast.success("Description saved");
      onDone();
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">About / description</Label>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        maxLength={4000}
        placeholder="Tell customers what makes you different — services, brands, story."
      />
      <div className="flex items-center justify-between gap-2">
        <span className={cn("text-xs", len < 50 ? "text-muted-foreground" : "text-emerald-600")}>
          {len}/50 characters
        </span>
        <Button size="sm" type="button" onClick={submit} disabled={busy || len < 50}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

function PhoneInline({ biz, onDone }: { biz: any; onDone: () => void }) {
  const save = useServerFn(updateBusinessPageSettings);
  const [value, setValue] = useState<string>(biz.phone ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      toast.error("Please enter a phone number.");
      return;
    }
    setBusy(true);
    try {
      await save({ data: { businessId: biz.id, phone: trimmed } });
      toast.success("Phone saved");
      onDone();
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">Phone</Label>
      <Input
        type="tel"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={40}
        placeholder="+63 9XX XXX XXXX"
        className="h-10"
      />
      <div className="flex justify-end">
        <Button size="sm" type="button" onClick={submit} disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

function VanityInline({ biz, onDone }: { biz: any; onDone: () => void }) {
  const save = useServerFn(setVanitySlug);
  const [value, setValue] = useState<string>(biz.vanity_slug ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const slug = value.trim().toLowerCase();
    if (!/^[a-z0-9-]{3,40}$/.test(slug)) {
      toast.error("Use 3–40 lowercase letters, numbers, or dashes.");
      return;
    }
    setBusy(true);
    try {
      await save({ data: { businessId: biz.id, slug } });
      toast.success("Short URL saved");
      onDone();
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">Short URL</Label>
      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground">/b/</span>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value.toLowerCase())}
          maxLength={40}
          placeholder="yourshop"
          className="h-10"
        />
      </div>
      <div className="flex justify-end">
        <Button size="sm" type="button" onClick={submit} disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
