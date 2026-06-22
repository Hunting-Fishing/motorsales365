import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Gamepad2, Brain, Wrench, Zap, Play } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { ComingSoonSection } from "@/components/coming-soon";
import { FlashcardsIframe } from "@/components/flashcards-iframe";


export const Route = createFileRoute("/games/")({
  head: () => ({
    meta: [
      { title: "365 Games — Learn, play & master the trade" },
      {
        name: "description",
        content:
          "Play training games from 365MotorSales. 365 Flashcards and Engine ID Challenge are live; more games coming soon.",
      },
      { property: "og:title", content: "365 Games — Learn. Play. Master." },
      {
        property: "og:description",
        content:
          "Interactive training games for the auto trade. Flashcards and Engine ID Challenge are live; more games coming soon.",
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
          365 Games — Learn. Play. Master.
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Training & knowledge games across automotive, marine, motorcycle, heavy-duty and more.
          More games coming soon — see below.
        </p>

        <h2 className="mt-8 font-display text-lg font-semibold">Active now</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <FlashcardsIframe className="h-[60vh] w-full" />

            <div className="flex items-center justify-between border-t border-border p-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Gamepad2 className="h-4 w-4 text-primary" />
                365 Flashcards
              </div>
              <Link
                to="/learn/flashcards"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary underline"
              >
                Open in Learn <Play className="h-3 w-3" />
              </Link>
            </div>
          </div>
          <Link
            to="/learn/flashcards"
            className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Brain className="h-5 w-5" />
                Engine ID Challenge
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Identify famous engines by sight, sound, and spec. Choose the
                “Identify the Engine” mode inside 365 Flashcards and earn points
                as you name history’s most iconic powerplants.
              </p>
            </div>
            <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary">
              Play now <Play className="h-3 w-3" />
            </div>
          </Link>
        </div>

        <h2 className="mt-10 font-display text-xl font-semibold">Coming soon</h2>
        <ComingSoonSection
          title="More games in development"
          subtitle="We're building more ways to learn and test your knowledge."
          className="mt-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
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
          </div>
        </ComingSoonSection>
      </div>
    </SiteLayout>
  );
}
