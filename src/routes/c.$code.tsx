import { createFileRoute, Link } from "@tanstack/react-router";
import { RouteErrorBoundary, RouteNotFoundBoundary } from "@/components/route-boundaries";
import { SiteLayout } from "@/components/site-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, ShieldCheck, Printer } from "lucide-react";
import { verifyCertificate } from "@/lib/education.functions";

export const Route = createFileRoute("/c/$code")({
  loader: ({ params }) => verifyCertificate({ data: { code: params.code } }),
  head: ({ loaderData }) => {
    const c = (loaderData as any)?.certificate;
    return {
      meta: [
        { title: c ? `Certificate ${c.code} — 365 Learn` : "Certificate not found" },
        {
          name: "description",
          content: c
            ? `Verified certificate of completion for ${c.course_title}, issued by 365 Motorsales.`
            : "",
        },
      ],
    };
  },
  component: CertificatePage,
  errorComponent: RouteErrorBoundary,
  notFoundComponent: () => <RouteNotFoundBoundary message="Certificate not found." />,
});

function CertificatePage() {
  const data = Route.useLoaderData();
  const cert = (data as any)?.certificate;

  if (!cert) {
    return (
      <SiteLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">Certificate not found</h1>
          <p className="mt-2 text-muted-foreground">This verification code is not valid.</p>
          <Button asChild className="mt-4">
            <Link to="/learn">Browse courses</Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <Card className="overflow-hidden border-2 border-primary/30">
            <CardContent className="p-10 text-center">
              <Award className="mx-auto h-16 w-16 text-primary" />
              <p className="mt-4 text-sm uppercase tracking-widest text-muted-foreground">
                Certificate of Completion
              </p>
              <h1 className="mt-4 text-4xl font-bold tracking-tight">{cert.holder_name}</h1>
              <p className="mt-4 text-muted-foreground">has successfully completed</p>
              <h2 className="mt-2 text-2xl font-semibold">{cert.course_title}</h2>
              <p className="mt-6 text-sm text-muted-foreground">
                Instructor: {cert.instructor_name ?? "365 Motorsales"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Issued on {new Date(cert.issued_at).toLocaleDateString()}
              </p>
              <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                Verified at 365motorsales.com/c/{cert.code}
              </div>
            </CardContent>
          </Card>
          <div className="mt-4 flex justify-center gap-2 print:hidden">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print certificate
            </Button>
            {cert.course_slug && (
              <Button asChild variant="ghost">
                <Link to="/learn/$slug" params={{ slug: cert.course_slug }}>
                  View course
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
