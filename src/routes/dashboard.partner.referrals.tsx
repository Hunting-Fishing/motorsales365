import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Share2, Trophy, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/dashboard/partner/referrals")({
  component: ReferralsTab,
});

function ReferralsTab() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-500/40 dark:bg-emerald-500/10 md:col-span-2">
        <div className="mb-2 flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h2 className="font-semibold">My referrals</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Your referral link, share templates and complete referral history.
        </p>
        <Button asChild className="mt-3">
          <Link to="/dashboard/referral">
            Open referrals <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </Card>

      <Card className="p-5">
        <div className="mb-2 flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          <h2 className="font-semibold">Partner program</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Apply, view your commission rate and read the partner terms.
        </p>
        <Button asChild variant="outline" className="mt-3">
          <Link to="/partner-program">
            Partner program <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </Card>

      <Card className="p-5">
        <div className="mb-2 flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          <h2 className="font-semibold">Promoter resources</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Ready-made posts, images and copy you can share right now.
        </p>
        <Button asChild variant="outline" className="mt-3">
          <Link to="/resources/qr-landing">
            Open resources <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </Card>
    </div>
  );
}
