import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Sparkles, Construction, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/site-layout";
import { FlashcardsIframe } from "@/components/flashcards-iframe";
import { useAuth } from "@/hooks/use-auth";
import { getFlashcardContent } from "@/lib/flashcards.functions";


export const Route = createFileRoute("/learn/flashcards")({
  head: () => ({
    meta: [
      { title: "365 Flashcards — Auto parts & systems training" },
      {
        name: "description",
        content:
          "Interactive flashcards covering automotive, motorcycle, marine, heavy-duty, agricultural and industrial parts & systems. Designed by 365MotorSales.",
      },
      { property: "og:title", content: "365 Flashcards — Training Cards" },
      {
        property: "og:description",
        content:
          "Practice parts, systems and diagnostics with interactive flashcards from 365MotorSales.",
      },
      { property: "og:url", content: "https://365motorsales.com/learn/flashcards" },
    ],
    links: [{ rel: "canonical", href: "https://365motorsales.com/learn/flashcards" }],
  }),
  component: FlashcardsPage,
});

function FlashcardsPage() {
  const { isAdmin, isModerator } = useAuth();
  const isStaff = isAdmin || isModerator;
  const fetchContent = useServerFn(getFlashcardContent);
  const { data, isLoading } = useQuery({
    queryKey: ["flashcards", "publish-state"],
    queryFn: () => fetchContent(),
    staleTime: 60_000,
  });

  const published = data?.isPublished ?? false;
  const canPlay = published || isStaff;

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            to="/learn"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Learn
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Designed by 365MotorSales
          </span>
        </div>
        <h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">365 Flashcards</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Training cards & knowledge tests across automotive, marine, heavy-duty and more.
        </p>
      </div>

      <div className="container mx-auto px-4 pb-10 pt-4">
        {isLoading ? (
          <div className="flex h-[60vh] items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : canPlay ? (
          <>
            {!published && isStaff && (
              <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                Preview mode: Flashcards are currently <b>Coming Soon</b> for the public. Only staff can see the game.
              </div>
            )}
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <FlashcardsIframe className="h-[80vh] w-full" />
            </div>
          </>
        ) : (
          <ComingSoonCard />
        )}
      </div>
    </SiteLayout>
  );
}

function ComingSoonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-card to-card shadow-sm">
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Construction className="h-8 w-8" />
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
          Coming Soon
        </span>
        <h2 className="font-display text-2xl font-bold sm:text-3xl">
          365 Flashcards is almost ready
        </h2>
        <p className="max-w-xl text-sm text-muted-foreground">
          We're finalizing the card artwork across every category before opening the game to the
          public. Check back soon — automotive, marine, motorcycle, heavy-duty and more are on the
          way.
        </p>
        <Link
          to="/learn"
          className="mt-2 inline-flex items-center gap-1 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Learn
        </Link>
      </div>
    </div>
  );
}
