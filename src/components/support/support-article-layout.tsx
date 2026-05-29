import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, ArrowLeft, Mail } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function SupportArticleLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <SiteLayout>
      <div className="border-b border-border bg-secondary/30">
        <div className="container mx-auto max-w-4xl px-4 py-8 sm:py-10">
          <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link to="/support" className="hover:text-foreground">Support</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground">{title}</span>
          </nav>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">{description}</p>
        </div>
      </div>

      <article className="container mx-auto max-w-4xl px-4 py-10">{children}</article>

      <div className="container mx-auto max-w-4xl px-4 pb-16">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Still need help?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Our team replies within 1 business day. Filipino or English.
              </p>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button asChild variant="outline">
                <Link to="/support">
                  <ArrowLeft className="h-4 w-4" /> Help Center
                </Link>
              </Button>
              <Button asChild>
                <Link to="/support" hash="contact">
                  <Mail className="h-4 w-4" /> Contact us
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </SiteLayout>
  );
}
