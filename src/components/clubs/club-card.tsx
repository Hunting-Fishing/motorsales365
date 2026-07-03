import { Link } from "@tanstack/react-router";
import { BadgeCheck, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type ClubCardData = {
  id: string;
  slug: string;
  name: string;
  type: string;
  verified?: boolean;
  logo_url?: string | null;
  cover_url?: string | null;
  member_count?: number | null;
  region?: string | null;
  city?: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  motorcycle_riding: "Motorcycle riding",
  car_club: "Car club",
  off_road: "Off-road",
  truck_club: "Truck club",
  brand_owners: "Brand owners",
  general_motoring: "General motoring",
  other: "Other",
};

export function ClubCard({ club }: { club: ClubCardData }) {
  return (
    <Link
      to="/clubs/$slug"
      params={{ slug: club.slug }}
      className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:shadow-md"
    >
      <div className="relative aspect-[16/9] w-full bg-muted">
        {club.cover_url ? (
          <img
            src={club.cover_url}
            alt={`${club.name} cover`}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 text-primary/40">
            <Users className="h-10 w-10" />
          </div>
        )}
        {club.logo_url && (
          <div className="absolute -bottom-6 left-4 h-14 w-14 overflow-hidden rounded-full border-4 border-card bg-card">
            <img src={club.logo_url} alt="" className="h-full w-full object-cover" />
          </div>
        )}
      </div>
      <div className={`p-4 ${club.logo_url ? "pt-8" : ""}`}>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-base font-semibold leading-tight">{club.name}</h3>
          {club.verified && (
            <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-label="Verified" />
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="text-[10px]">
            {TYPE_LABEL[club.type] ?? club.type}
          </Badge>
          {(club.city || club.region) && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {[club.city, club.region].filter(Boolean).join(", ")}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" />
            {club.member_count ?? 0}
          </span>
        </div>
      </div>
    </Link>
  );
}
