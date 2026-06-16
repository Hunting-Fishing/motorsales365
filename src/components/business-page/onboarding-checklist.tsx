import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface Item {
  key: string;
  label: string;
  description: string;
  done: boolean;
  tabValue: string;
  anchor?: string;
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
    },
    {
      key: "cover",
      label: "Add a cover image or featured video",
      description: "Big hero image (or a 1080p video) — first thing visitors see.",
      done: !!b.cover_url || !!b.featured_video_url,
      tabValue: "profile",
      anchor: "onboard-cover",
    },
    {
      key: "description",
      label: "Write a description",
      description: "At least 50 characters about what you do, the brands you carry, your story.",
      done: typeof b.description === "string" && b.description.trim().length >= 50,
      tabValue: "profile",
      anchor: "onboard-description",
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
    },
  ];
}

export function OnboardingChecklist({
  data,
  onJumpTab,
}: {
  data: ChecklistInput;
  onJumpTab: (tabValue: string, anchor?: string) => void;
}) {
  const items = buildItems(data);
  const done = items.filter((i) => i.done).length;
  const total = items.length;
  const pct = Math.round((done / total) * 100);

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
        {items.map((it) => (
          <li key={it.key}>
            <button
              type="button"
              onClick={() => onJumpTab(it.tabValue, it.anchor)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md border border-transparent p-2 text-left transition-colors",
                it.done ? "opacity-60" : "hover:border-border hover:bg-muted/40",
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
              {!it.done && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
