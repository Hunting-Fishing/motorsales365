import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SiteLayout } from "@/components/site-layout";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, MapPin, Search, Wrench, Star } from "lucide-react";
import { listMechanicBusinesses } from "@/lib/education.functions";

export const Route = createFileRoute("/learn/mechanics")({
  head: () => ({
    meta: [
      { title: "Hire a 365-Trained Mechanic — 365 Learn" },
      {
        name: "description",
        content:
          "Find auto repair businesses in the Philippines whose owners have earned 365 Learn course certificates.",
      },
      { property: "og:title", content: "Hire a 365-Trained Mechanic" },
      {
        property: "og:description",
        content: "Directory of mechanics certified through 365 Learn courses.",
      },
    ],
  }),
  component: MechanicDirectory,
});

function MechanicDirectory() {
  const [city, setCity] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["learn", "mechanics", city],
    queryFn: () => listMechanicBusinesses({ data: { city: city || undefined } }),
  });

  const businesses = data?.businesses ?? [];

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-background p-6 sm:p-10">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Wrench className="h-4 w-4" /> 365 Trained Mechanics
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Hire a mechanic with verified training
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            These business owners have earned at least one course certificate from 365 Learn.
            Look for the Award badge on their profile.
          </p>
        </div>

        <div className="mb-6 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter by city (e.g. Cebu)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : businesses.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center">
            <Award className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No certified mechanics{city ? ` in "${city}"` : ""} yet.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Are you a mechanic?{" "}
              <Link to="/learn" className="text-primary hover:underline">
                Enroll in a course
              </Link>{" "}
              to earn your badge.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {businesses.map((b: any) => (
              <Link
                key={b.id}
                to="/businesses/$slug"
                params={{ slug: b.slug }}
                className="group"
              >
                <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {b.logo_url ? (
                        <img
                          src={b.logo_url}
                          alt={b.name}
                          className="h-14 w-14 shrink-0 rounded-lg border bg-background object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border bg-muted">
                          <Wrench className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold">{b.name}</h3>
                        {(b.city || b.region) && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {[b.city, b.region].filter(Boolean).join(", ")}
                          </p>
                        )}
                        {b.rating_count > 0 && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {Number(b.rating_avg).toFixed(1)} ({b.rating_count})
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5">
                      <Badge variant="secondary" className="gap-1 text-[10px]">
                        <Award className="h-3 w-3" />
                        {b.certificate_count} certificate
                        {b.certificate_count === 1 ? "" : "s"}
                      </Badge>
                      {(b.certificate_categories ?? [])
                        .slice(0, 2)
                        .map((c: string) => (
                          <Badge key={c} variant="outline" className="text-[10px]">
                            {c}
                          </Badge>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
