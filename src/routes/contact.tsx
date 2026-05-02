import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — 365 MotorSales Philippines" },
      { name: "description", content: "Get in touch with the 365 MotorSales Philippines team." },
    ],
  }),
  component: () => (
    <SiteLayout>
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <h1 className="font-display text-4xl font-bold">Contact us</h1>
        <p className="mt-4 text-muted-foreground">Questions, partnerships, or support? Email us at <a className="text-primary underline" href="mailto:hello@365motorsales.ph">hello@365motorsales.ph</a>.</p>
      </div>
    </SiteLayout>
  ),
});
