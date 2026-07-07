import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, ExternalLink, GraduationCap, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { isStaffEmail } from "@/lib/staff-domain";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ARTICLES,
  CATEGORY_META,
  mergeArticles,
  type Article,
  type ArticleCategory,
} from "@/content/staff-academy";
import { listStaffAcademyArticles } from "@/lib/staff-academy-articles.functions";

export const Route = createFileRoute("/_authenticated/staff/academy")({
  head: () => ({
    meta: [
      { title: "Staff Academy — 365 Motor Sales" },
      { name: "robots", content: "noindex,nofollow" },
      {
        name: "description",
        content:
          "Internal training and enablement hub for 365 Motor Sales staff.",
      },
    ],
  }),
  component: StaffAcademyHub,
});

function StaffAcademyHub() {
  const { user, loading, isAdmin } = useAuth();
  const [query, setQuery] = useState("");
  const loadDb = useServerFn(listStaffAcademyArticles);

  const isStaff = isStaffEmail(user?.email);

  const dbQuery = useQuery({
    queryKey: ["staff-academy-articles"],
    queryFn: () => loadDb(),
    enabled: !!user && (isStaff || isAdmin),
    staleTime: 60_000,
  });

  const articles: Article[] = useMemo(
    () => mergeArticles(dbQuery.data, { includeDrafts: isAdmin }),
    [dbQuery.data, isAdmin],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter((a) => {
      const haystack = [
        a.title,
        a.description,
        a.tags.join(" "),
        a.sections
          .map((s) => [s.heading, s.body, s.bullets?.join(" ")].filter(Boolean).join(" "))
          .join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query, articles]);

  const grouped = useMemo(() => {
    const m = new Map<ArticleCategory, Article[]>();
    for (const a of filtered) {
      const list = m.get(a.category) ?? [];
      list.push(a);
      m.set(a.category, list);
    }
    return m;
  }, [filtered]);

  const recentlyUpdated = useMemo(
    () =>
      [...articles]
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
        .slice(0, 3),
    [articles],
  );

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="mx-auto max-w-lg">
        <Card>
          <CardContent className="p-8 text-center">
            <GraduationCap className="mx-auto h-10 w-10 text-muted-foreground" />
            <h1 className="mt-4 font-display text-xl font-bold">Staff only</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The Staff Academy is limited to accounts on the{" "}
              <strong>@365motorsales.com</strong> domain.
              {user?.email ? ` You're signed in as ${user.email}.` : ""}
            </p>
            <Button asChild className="mt-4">
              <Link to="/support">Contact support</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const firstName = (user?.email ?? "").split("@")[0].split(".")[0] || "team";

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="uppercase tracking-wide">
            <Sparkles className="mr-1 h-3 w-3" /> 365 Staff
          </Badge>
          <span className="text-xs text-muted-foreground">Internal — not indexed</span>
        </div>
        <h1 className="font-display text-3xl font-bold capitalize">
          Welcome back, {firstName}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Playbooks, feature guides, roadmap previews, shareable assets, scripts, and
          compliance rules — everything you need to help sellers succeed on 365.
        </p>
      </header>

      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search guides, scripts, features…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {!query && (
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">Recently updated</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {recentlyUpdated.map((a) => (
              <Link
                key={a.slug}
                to="/staff/academy/$slug"
                params={{ slug: a.slug }}
                className="group block"
              >
                <Card className="h-full transition hover:border-primary">
                  <CardContent className="p-4">
                    <div className="text-2xl">{a.heroEmoji ?? "📄"}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {CATEGORY_META[a.category].label}
                      </Badge>
                      {a.status === "coming-soon" && (
                        <Badge className="text-[10px]">Coming soon</Badge>
                      )}
                    </div>
                    <h3 className="mt-2 font-medium leading-snug group-hover:text-primary">
                      {a.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {a.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-8">
        {(Object.keys(CATEGORY_META) as ArticleCategory[]).map((cat) => {
          const list = grouped.get(cat);
          if (!list || list.length === 0) return null;
          const meta = CATEGORY_META[cat];
          return (
            <div key={cat}>
              <div className="mb-3 flex items-baseline justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-semibold">
                    <span className="mr-2">{meta.emoji}</span>
                    {meta.label}
                  </h2>
                  <p className="text-xs text-muted-foreground">{meta.blurb}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {list.length} article{list.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((a) => (
                  <Link
                    key={a.slug}
                    to="/staff/academy/$slug"
                    params={{ slug: a.slug }}
                    className="group block"
                  >
                    <Card className="h-full transition hover:border-primary">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="text-2xl">{a.heroEmoji ?? "📄"}</div>
                          {a.status === "coming-soon" && (
                            <Badge className="text-[10px]">Coming soon</Badge>
                          )}
                          {a.status === "draft" && (
                            <Badge variant="outline" className="text-[10px]">
                              Draft
                            </Badge>
                          )}
                        </div>
                        <h3 className="mt-2 font-medium leading-snug group-hover:text-primary">
                          {a.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {a.description}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1">
                          {a.tags.slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
            No articles match "{query}". Try a different search.
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-muted/30 p-5">
        <h2 className="font-display text-base font-semibold">Need something that's not here?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ping the team on Slack, or use the support form for a paper trail.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/support">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open support
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <a href="mailto:team@365motorsales.com?subject=Staff Academy suggestion">
              Suggest an article
            </a>
          </Button>
        </div>
      </section>
    </div>
  );
}
