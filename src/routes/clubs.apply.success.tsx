import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Clock, FileText, LayoutDashboard, Mail } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/clubs/apply/success")({
  head: () => ({
    meta: [
      { title: "Application submitted — 365 MotorSales Clubs" },
      {
        name: "description",
        content:
          "Your club application has been submitted. Our team reviews accreditation documents within a few business days.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => {
    const str = (v: unknown, max: number) =>
      typeof v === "string" && v.trim().length > 0 ? v.slice(0, max) : undefined;
    return {
      club: str(s.club, 64),
      name: str(s.name, 120),
    };
  },
  component: ClubApplySuccessPage,
});

function ClubApplySuccessPage() {
  const { club, name } = Route.useSearch();

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-foreground sm:text-3xl">
            Application submitted
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            {name ? (
              <>
                Thanks — <span className="font-medium text-foreground">{name}</span> is now in the
                review queue.
              </>
            ) : (
              <>Thanks — your club is now in the review queue.</>
            )}
          </p>
        </div>

        <section
          aria-labelledby="next-steps-heading"
          className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6"
        >
          <h2 id="next-steps-heading" className="font-display text-lg font-semibold">
            What happens next
          </h2>
          <ol className="mt-4 space-y-4">
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Clock className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <div className="font-medium">Admin review (1–3 business days)</div>
                <p className="text-sm text-muted-foreground">
                  Our team verifies your accreditation documents (LTO, SEC, DTI, or equivalent).
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Mail className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <div className="font-medium">We'll email you the decision</div>
                <p className="text-sm text-muted-foreground">
                  You'll get a notification at the contact email you provided. If we need more
                  info, we'll reach out from there.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <FileText className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <div className="font-medium">Publish and invite members</div>
                <p className="text-sm text-muted-foreground">
                  Once approved, your club page goes live. You can then add a logo/cover, post
                  rides &amp; events, and invite members.
                </p>
              </div>
            </li>
          </ol>
        </section>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button asChild variant="outline">
            <Link to="/clubs">Browse clubs</Link>
          </Button>
          {club ? (
            <Button
              asChild
              className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Link
                to="/dashboard/clubs/$id"
                params={{ id: club }}
                aria-label="Open your club in the dashboard"
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                <span>Open your club</span>
              </Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to="/dashboard/clubs">Go to your clubs</Link>
            </Button>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
