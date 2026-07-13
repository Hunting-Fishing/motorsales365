import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Wrench,
  ClipboardList,
  Users2,
  Boxes,
  Calendar as CalendarIcon,
  FileText,
  Receipt,
  BarChart3,
  Truck,
  Building2,
} from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const TITLE = "Shop Manager — 365 Motor Sales";
const DESCRIPTION =
  "Run your automotive shop from inside 365 Motor Sales: work orders, customer + vehicle history, inventory, invoicing, and reminders.";

export const Route = createFileRoute("/_authenticated/shop")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ShopHome,
});

type ModuleCard = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: "coming-soon" | "in-progress";
};

const MODULES: ModuleCard[] = [
  {
    title: "Dashboard",
    description: "Daily KPIs, open work orders, today's schedule.",
    icon: BarChart3,
    status: "in-progress",
  },
  {
    title: "Work Orders",
    description: "Create, dispatch, and close repair jobs.",
    icon: ClipboardList,
    status: "in-progress",
  },
  {
    title: "Customers",
    description: "Household + vehicle history and communications.",
    icon: Users2,
    status: "coming-soon",
  },
  {
    title: "Inventory",
    description: "Parts, SKUs, purchase orders, and vendor management.",
    icon: Boxes,
    status: "coming-soon",
  },
  {
    title: "Calendar",
    description: "Bay scheduling, technicians, and appointments.",
    icon: CalendarIcon,
    status: "coming-soon",
  },
  {
    title: "Quotes & Invoices",
    description: "Estimates, invoicing, and payments.",
    icon: Receipt,
    status: "coming-soon",
  },
  {
    title: "Documents",
    description: "Signed forms, quotes, and inspection PDFs.",
    icon: FileText,
    status: "coming-soon",
  },
  {
    title: "Fleet",
    description: "Fleet accounts, service intervals, and equipment.",
    icon: Truck,
    status: "coming-soon",
  },
  {
    title: "Company Profile",
    description: "Shop settings, staff, and branding.",
    icon: Building2,
    status: "coming-soon",
  },
];

function ShopHome() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex items-center gap-3">
          <Wrench className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Shop Manager</h1>
            <p className="text-muted-foreground">
              Run your shop. Win every job.
            </p>
          </div>
        </div>

        <Alert className="mb-8">
          <AlertTitle>Merged in-tree — porting incrementally.</AlertTitle>
          <AlertDescription>
            The Shop Manager application has been consolidated into 365 Motor
            Sales. The full source is available under{" "}
            <code className="rounded bg-muted px-1">src/shop-manager/</code> and
            pages are being wired into TanStack routes one module at a time,
            starting with Work Orders. Data flows through the{" "}
            <code className="rounded bg-muted px-1">shop_manager</code> schema
            in this project's database.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => (
            <Card key={m.title} className="relative">
              <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                <m.icon className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">{m.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{m.description}</p>
                <Badge
                  variant={m.status === "in-progress" ? "default" : "secondary"}
                >
                  {m.status === "in-progress" ? "In progress" : "Coming soon"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-10 text-sm text-muted-foreground">
          Looking for the marketing page and pricing?{" "}
          <Link to="/shop-manager" className="underline hover:text-foreground">
            See Shop Manager plans
          </Link>
          .
        </div>
      </div>
    </SiteLayout>
  );
}
