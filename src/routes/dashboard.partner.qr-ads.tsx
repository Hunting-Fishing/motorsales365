import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, ArrowRight, Printer } from "lucide-react";

export const Route = createFileRoute("/dashboard/partner/qr-ads")({
  component: QrAdsTab,
});

function QrAdsTab() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border-violet-300 bg-violet-50 p-5 dark:border-violet-500/40 dark:bg-violet-500/10 md:col-span-2">
        <div className="mb-2 flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          <h2 className="font-semibold">Your personal QR ads</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Pick a template, drop your QR on it, and share or print. Every scan is tracked to you.
        </p>
        <Button asChild className="mt-3">
          <Link to="/admin/advertisements/qr-ads">
            Manage QR ads <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </Card>

      <Card className="p-5">
        <div className="mb-2 flex items-center gap-2">
          <Printer className="h-5 w-5" />
          <h2 className="font-semibold">Landing page previews</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          See what a scanner sees before you print. Great for choosing which templates to share.
        </p>
        <Button asChild variant="outline" className="mt-3">
          <Link to="/resources/qr-landing">
            Preview landings <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </Card>
    </div>
  );
}
