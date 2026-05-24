import { MapPin, Phone, Mail, MessageSquare, Clock, Navigation, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ADDRESS = "Metro Manila, Philippines";
const PHONE = "+63 917 000 0000";
const PHONE_DISPLAY = "+63 917 000 0000";
const EMAIL = "hello@365motorsales.ph";
const VIBER_URL = "viber://chat?number=%2B639170000000";
const MAPS_QUERY = encodeURIComponent(ADDRESS);
const MAPS_LINK = `https://www.google.com/maps/search/?api=1&query=${MAPS_QUERY}`;

const HOURS: Array<{ day: string; hours: string; today?: boolean }> = [
  { day: "Mon", hours: "9:00 AM – 6:00 PM" },
  { day: "Tue", hours: "9:00 AM – 6:00 PM" },
  { day: "Wed", hours: "9:00 AM – 6:00 PM" },
  { day: "Thu", hours: "9:00 AM – 6:00 PM" },
  { day: "Fri", hours: "9:00 AM – 6:00 PM" },
  { day: "Sat", hours: "10:00 AM – 4:00 PM" },
  { day: "Sun", hours: "Closed" },
];

function isOpenNow(): boolean {
  const now = new Date();
  const day = now.getDay(); // 0 Sun .. 6 Sat
  const hour = now.getHours() + now.getMinutes() / 60;
  if (day === 0) return false;
  if (day === 6) return hour >= 10 && hour < 16;
  return hour >= 9 && hour < 18;
}

function todayIndex(): number {
  // Map JS day (0=Sun..6=Sat) to our array (0=Mon..6=Sun)
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}

export function ShopProfile() {
  const mapsBrowserKey = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
  const embedUrl = mapsBrowserKey
    ? `https://www.google.com/maps/embed/v1/place?key=${mapsBrowserKey}&q=${MAPS_QUERY}&zoom=11`
    : null;
  const open = isOpenNow();
  const today = todayIndex();

  return (
    <section aria-labelledby="shop-profile-title" className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 id="shop-profile-title" className="font-display text-lg font-semibold sm:text-xl">
              365 MotorSales PH
            </h2>
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <ShieldCheck className="h-3 w-3" /> Verified
            </Badge>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{ADDRESS}</span>
          </p>
        </div>
        <Badge
          className={
            open
              ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
              : "bg-muted text-muted-foreground"
          }
          variant="secondary"
        >
          <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${open ? "bg-emerald-500" : "bg-muted-foreground"}`} />
          {open ? "Open now" : "Closed"}
        </Badge>
      </div>

      {/* Map */}
      <a
        href={MAPS_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block aspect-[16/9] w-full overflow-hidden border-y bg-muted sm:aspect-[21/9]"
        aria-label="Open location in Google Maps"
      >
        {embedUrl ? (
          <iframe
            title="Shop location"
            src={embedUrl}
            className="pointer-events-none h-full w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/5 to-primary/15">
            <MapPin className="h-10 w-10 text-primary/60" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-background/90 to-transparent px-3 py-2 text-xs">
          <span className="truncate font-medium">{ADDRESS}</span>
          <span className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-primary-foreground">
            <Navigation className="h-3 w-3" /> Directions
          </span>
        </div>
      </a>

      {/* Quick contact actions — large tap targets */}
      <div className="grid grid-cols-3 gap-2 p-3 sm:p-4">
        <Button asChild variant="default" className="h-14 flex-col gap-1 text-[11px] leading-none">
          <a href={`tel:${PHONE.replace(/\s/g, "")}`} aria-label={`Call ${PHONE_DISPLAY}`}>
            <Phone className="h-4 w-4" />
            <span>Call</span>
          </a>
        </Button>
        <Button asChild variant="outline" className="h-14 flex-col gap-1 text-[11px] leading-none">
          <a href={VIBER_URL} aria-label="Chat on Viber">
            <MessageSquare className="h-4 w-4" />
            <span>Chat</span>
          </a>
        </Button>
        <Button asChild variant="outline" className="h-14 flex-col gap-1 text-[11px] leading-none">
          <a href={`mailto:${EMAIL}`} aria-label={`Email ${EMAIL}`}>
            <Mail className="h-4 w-4" />
            <span>Email</span>
          </a>
        </Button>
      </div>

      {/* Hours */}
      <div className="border-t p-4 sm:p-5">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Clock className="h-4 w-4 text-primary" />
          Business hours
        </div>
        <ul className="divide-y rounded-lg border bg-background text-sm">
          {HOURS.map((h, i) => (
            <li
              key={h.day}
              className={`flex items-center justify-between px-3 py-2 ${
                i === today ? "bg-primary/5 font-semibold" : ""
              }`}
            >
              <span className="flex items-center gap-2">
                {h.day}
                {i === today && <Badge variant="outline" className="text-[9px]">Today</Badge>}
              </span>
              <span className={h.hours === "Closed" ? "text-muted-foreground" : ""}>{h.hours}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Need help with a specific listing?{" "}
          <Link to="/contact" className="font-medium text-primary underline-offset-2 hover:underline">
            Visit contact page
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

export function ShopProfileCompact() {
  // Minimal card variant for tight spaces
  return (
    <Card>
      <CardContent className="p-4">
        <ShopProfile />
      </CardContent>
    </Card>
  );
}
