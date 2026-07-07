import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Inbox, MessageSquare, QrCode, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/dashboard/partner/inbox")({
  component: InboxTab,
});

function InboxTab() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border-sky-300 bg-sky-50 p-5 dark:border-sky-500/40 dark:bg-sky-500/10">
        <div className="mb-2 flex items-center gap-2">
          <Inbox className="h-5 w-5" />
          <h2 className="font-semibold">Sales leads</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Inquiries on listings, businesses and tow requests assigned to your team.
        </p>
        <Button asChild className="mt-3">
          <Link to="/dashboard/team/leads">
            Open sales leads <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </Card>

      <Card className="border-violet-300 bg-violet-50 p-5 dark:border-violet-500/40 dark:bg-violet-500/10">
        <div className="mb-2 flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          <h2 className="font-semibold">QR leads</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Signups and messages captured from your QR-ad landing pages.
        </p>
        <Button asChild className="mt-3">
          <Link to="/admin/qr-leads">
            Open QR leads <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </Card>

      <Card className="p-5 md:col-span-2">
        <div className="mb-2 flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <h2 className="font-semibold">Direct messages</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Personal messages from other users on the marketplace.
        </p>
        <Button asChild variant="outline" className="mt-3">
          <Link to="/dashboard/messages">
            Open messages <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </Card>
    </div>
  );
}
