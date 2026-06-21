import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Sparkles } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";

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
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <iframe
            src="/flashcards/index.html"
            title="365 Flashcards"
            className="block h-[80vh] w-full border-0"
            allow="fullscreen"
          />
        </div>
      </div>
    </SiteLayout>
  );
}
