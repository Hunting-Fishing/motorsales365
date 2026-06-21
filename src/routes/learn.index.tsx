import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SiteLayout } from "@/components/site-layout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Clock, Search, Sparkles, Megaphone, ArrowRight } from "lucide-react";
import { listCourses, listCourseCategories } from "@/lib/education.functions";
import { FeaturedTrainingRail } from "@/components/learn/featured-training-rail";
import { BusinessReadyRail } from "@/components/learn/business-ready-rail";

export const Route = createFileRoute("/learn/")({
  head: () => ({
    meta: [
      { title: "365 Learn — Auto repair, detailing & business courses" },
      {
        name: "description",
        content:
          "Hands-on courses for repair, detailing, bodywork and running an auto business. Earn certificates from 365 Motorsales.",
      },
      { property: "og:title", content: "365 Learn — Courses for the auto trade" },
      {
        property: "og:description",
        content:
          "Video courses + quizzes + certificates. Pay per course or unlock everything with a 365 subscription.",
      },
    ],
  }),
  component: LearnIndex,
});

function LearnIndex() {
  const [category, setCategory] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const { data: cats } = useQuery({
    queryKey: ["learn", "categories"],
    queryFn: () => listCourseCategories(),
  });
  const { data, isLoading } = useQuery({
    queryKey: ["learn", "list", category, search],
    queryFn: () => listCourses({ data: { category, search: search || undefined } }),
  });

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Designed by 365MotorSales
          </span>
        </div>
        <div className="mt-4 mb-8 rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-background p-6 sm:p-10">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" /> 365 Learn
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Level up your skills in the auto trade
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Hands-on courses on repair, detailing, bodywork and running a sustainable auto business
            — taught by working pros. Pay per course or unlock everything with a 365 subscription.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link to="/learn/flashcards">Play 365 Flashcards</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/games">Browse all games</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/pricing">View subscriptions</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/learn/mechanics">Hire a trained mechanic</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/partner-training">Sponsored training schools</Link>
            </Button>
          </div>
        </div>


        <FeaturedTrainingRail className="mb-8" />

        <BusinessReadyRail className="mb-8" />

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search courses…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant={!category ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setCategory(undefined)}
            >
              All
            </Badge>
            {(cats?.categories ?? []).map((c) => (
              <Badge
                key={c}
                variant={category === c ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setCategory(c)}
              >
                {c}
              </Badge>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="aspect-video animate-pulse bg-muted" />
                <CardContent className="space-y-2 p-4">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (data?.courses ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center">
            <GraduationCap className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No courses yet. Check back soon.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data!.courses.map((c: any) => (
              <Link key={c.id} to="/learn/$slug" params={{ slug: c.slug }} className="group">
                <Card className="overflow-hidden transition-shadow hover:shadow-md">
                  <div className="aspect-video overflow-hidden bg-muted">
                    {c.hero_image_url ? (
                      <img
                        src={c.hero_image_url}
                        alt={c.title}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <GraduationCap className="h-12 w-12" />
                      </div>
                    )}
                  </div>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full bg-secondary px-2 py-0.5">
                        {c.category ?? "General"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {c.duration_minutes ?? 0}m
                      </span>
                    </div>
                    <h3 className="line-clamp-2 font-semibold">{c.title}</h3>
                    {c.summary && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">{c.summary}</p>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-muted-foreground">
                        {c.instructor_name ?? "365 Motorsales"}
                      </span>
                      {c.price_php != null ? (
                        <span className="font-semibold">
                          ₱{Number(c.price_php).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-xs text-primary">Subscription</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Sponsor your Academy CTA */}
        <section className="mt-10">
          <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6 sm:p-10">
            <div className="flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-primary/10 p-3 text-primary">
                  <Megaphone className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Promotional Ad Space Available
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-bold sm:text-3xl">
                    Sponsor your Academy, Institution, School, or Learning Center here
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    Feature your training programs to Filipino auto buyers, sellers, and aspiring
                    mechanics. Get a dedicated card on /learn, rotational carousel placement, and
                    direct enrollment links to your courses.
                  </p>
                </div>
              </div>
              <Button asChild size="lg" className="shrink-0">
                <Link to="/advertise">
                  Claim your spot <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Inquiries are reviewed by our advertising team within 1–2 business days.
          </p>
        </section>
      </div>
    </SiteLayout>
  );
}
