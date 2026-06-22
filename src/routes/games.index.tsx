import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Gamepad2, Brain, Wrench, Zap, Play } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { ComingSoonSection } from "@/components/coming-soon";

export const Route = createFileRoute("/games/")({
  head: () => ({
    meta: [
      { title: "365 Games — Learn, play & master the trade" },
      {
        name: "description",
        content:
          "Play training games from 365MotorSales. Flashcards, parts match, diagnostic sprints and more coming soon.",
      },
      { property: "og:title", content: "365 Games — Learn. Play. Master." },
      {
        property: "og:description",
        content:
          "Interactive training games for the auto trade. Flashcards are live; more games coming soon.",
      },
      { property: "og:url", content: "https://365motorsales.com/games" },
    ],
    links: [{ rel: "canonical", href: "https://365motorsales.com/games" }],
  }),
  component: GamesIndex,
});

function GamesIndex() {
  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Gamepad2 className="h-4 w-4" /> 365 Games
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Designed by 365MotorSales
          </span>
        </div>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
          365 Flashcards — Learn. Play. Master.
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Training & knowledge cards across automotive, marine, motorcycle, heavy-duty and more.
          More games coming soon — see below.
        </p>

        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <iframe
            src="/flashcards/index.html"
            title="365 Flashcards"
            className="block h-[80vh] w-full border-0"
            allow="fullscreen"
          />
        </div>

        <div className="mt-3 text-xs text-muted-foreground">
          Prefer a dedicated page?{" "}
          <Link to="/learn/flashcards" className="underline">
            Open flashcards in Learn
          </Link>
          .
        </div>

        <h2 className="mt-10 font-display text-xl font-semibold">Coming soon</h2>
        <ComingSoonSection
          title="More games in development"
          subtitle="We're building more ways to learn and test your knowledge."
          className="mt-3"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-amber-300/60 bg-white/60 p-4 dark:bg-amber-950/20">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
                <Wrench className="h-5 w-5" />
                <span className="font-semibold">Parts Match</span>
              </div>
              <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-100/80">
                Match parts to the right system under the clock.
              </p>
            </div>
            <div className="rounded-lg border border-amber-300/60 bg-white/60 p-4 dark:bg-amber-950/20">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
                <Zap className="h-5 w-5" />
                <span className="font-semibold">Diagnostic Sprint</span>
              </div>
              <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-100/80">
                Read the symptoms — call the fix before time runs out.
              </p>
            </div>
            <div className="rounded-lg border border-amber-300/60 bg-white/60 p-4 dark:bg-amber-950/20">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
                <Brain className="h-5 w-5" />
                <span className="font-semibold">Engine ID Challenge</span>
              </div>
              <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-100/80">
                Identify engines by sight, sound and spec.
              </p>
            </div>
          </div>
        </ComingSoonSection>
      </div>
    </SiteLayout>
  );
}
