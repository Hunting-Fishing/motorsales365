import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { isStaffEmail } from "@/lib/staff-domain";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ARTICLES,
  CATEGORY_META,
  dbRowToArticle,
  getArticle,
  type Article,
} from "@/content/staff-academy";
import {
  getStaffAcademyArticleBySlug,
  recordStaffAcademyArticleView,
} from "@/lib/staff-academy-articles.functions";

export const Route = createFileRoute("/_authenticated/staff/academy/$slug")({
  head: ({ params }) => {
    const article = getArticle(params.slug);
    return {
      meta: [
        {
          title: article
            ? `${article.title} — Staff Academy`
            : "Staff Academy",
        },
        { name: "robots", content: "noindex,nofollow" },
        {
          name: "description",
          content: article?.description ?? "Internal staff article.",
        },
      ],
    };
  },
  component: ArticlePage,
});

function NotFound() {
  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardContent className="p-8 text-center">
          <h1 className="font-display text-xl font-bold">Article not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            That guide doesn't exist yet — it may have moved or is still a draft.
          </p>
          <Button asChild className="mt-4">
            <Link to="/staff/academy">Back to Staff Academy</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ArticlePage() {
  const { user, loading, isAdmin } = useAuth();
  const { slug } = Route.useParams();
  const loadDb = useServerFn(getStaffAcademyArticleBySlug);

  const isStaff = isStaffEmail(user?.email);
  const canView = !!user && (isStaff || isAdmin);

  const dbQuery = useQuery({
    queryKey: ["staff-academy-article", slug],
    queryFn: () => loadDb({ data: { slug } }),
    enabled: canView,
    staleTime: 60_000,
  });

  const staticArticle = getArticle(slug);
  const article: Article | undefined = dbQuery.data
    ? dbRowToArticle(dbQuery.data as any)
    : staticArticle;

  if (loading || dbQuery.isLoading) {
    return (
      <div className="rounded-lg border p-6 text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="mx-auto max-w-lg">
        <Card>
          <CardContent className="p-8 text-center">
            <h1 className="font-display text-xl font-bold">Staff only</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in with your @365motorsales.com account to view this article.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!article) return <NotFound />;

  const related: Article[] = ARTICLES.filter(
    (a) => a.category === article.category && a.slug !== article.slug,
  ).slice(0, 4);

  const catMeta = CATEGORY_META[article.category];

  return (
    <div className="mx-auto max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/staff/academy">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Staff Academy
        </Link>
      </Button>

      <article className="space-y-6">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              <span className="mr-1">{catMeta.emoji}</span>
              {catMeta.label}
            </Badge>
            {article.status === "coming-soon" && <Badge>Coming soon</Badge>}
            {article.status === "draft" && <Badge variant="outline">Draft</Badge>}
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" /> Updated {article.updatedAt}
            </span>
          </div>
          <div className="flex items-start gap-3">
            {article.heroEmoji && (
              <div className="text-4xl leading-none">{article.heroEmoji}</div>
            )}
            <div>
              <h1 className="font-display text-3xl font-bold leading-tight">
                {article.title}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{article.description}</p>
            </div>
          </div>
        </header>

        <div className="space-y-5">
          {article.sections.map((s, i) => (
            <section key={i} className="space-y-2">
              {s.heading && (
                <h2 className="font-display text-lg font-semibold">{s.heading}</h2>
              )}
              {s.body && (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{s.body}</p>
              )}
              {s.bullets && s.bullets.length > 0 && (
                <ul className="list-disc space-y-1.5 pl-5 text-sm text-foreground/90">
                  {s.bullets.map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              )}
              {s.cta && (
                <div className="pt-1">
                  <Button asChild size="sm" variant="secondary">
                    {s.cta.external ? (
                      <a href={s.cta.to} target="_blank" rel="noreferrer">
                        {s.cta.label}
                      </a>
                    ) : (
                      <Link to={s.cta.to as any}>{s.cta.label}</Link>
                    )}
                  </Button>
                </div>
              )}
            </section>
          ))}
        </div>

        <footer className="rounded-xl border bg-muted/30 p-4">
          <p className="text-xs text-muted-foreground">
            Something wrong or outdated?{" "}
            <a
              className="underline"
              href={`mailto:team@365motorsales.com?subject=Staff Academy: ${encodeURIComponent(article.title)}`}
            >
              Suggest an edit
            </a>
            .
          </p>
        </footer>

        {related.length > 0 && (
          <section>
            <h2 className="mb-3 font-display text-lg font-semibold">
              Related in {catMeta.label}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  to="/staff/academy/$slug"
                  params={{ slug: r.slug }}
                  className="group"
                >
                  <Card className="h-full transition hover:border-primary">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-2">
                        <div className="text-xl">{r.heroEmoji ?? "📄"}</div>
                        <div>
                          <h3 className="font-medium leading-snug group-hover:text-primary">
                            {r.title}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {r.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}
