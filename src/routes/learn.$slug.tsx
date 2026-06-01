import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { CheckCircle2, Lock, PlayCircle, GraduationCap, Award, Clock } from "lucide-react";
import { getCourse, getEnrollmentProgress, createCourseCheckout } from "@/lib/education.functions";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { getStripeEnvironment } from "@/lib/stripe";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/learn/$slug")({
  loader: async ({ params }) => {
    const res = await getCourse({ data: { slug: params.slug } });
    return res;
  },
  head: ({ loaderData }) => {
    const c = loaderData?.course as any;
    if (!c) return { meta: [{ title: "Course not found — 365 Learn" }] };
    return {
      meta: [
        { title: `${c.title} — 365 Learn` },
        { name: "description", content: c.summary ?? `Learn ${c.title} on 365 Motorsales.` },
        { property: "og:title", content: c.title },
        { property: "og:description", content: c.summary ?? "" },
        ...(c.hero_image_url ? [{ property: "og:image", content: c.hero_image_url as string }] : []),
      ],
    };
  },
  component: CourseDetail,
});

function CourseDetail() {
  const data = Route.useLoaderData();
  const params = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCheckout, setShowCheckout] = useState(false);

  const course = data?.course as any;
  const modules = (data?.modules ?? []) as any[];
  const lessons = (data?.lessons ?? []) as any[];

  const { data: progress } = useQuery({
    queryKey: ["course-progress", course?.id, user?.id],
    queryFn: () => getEnrollmentProgress({ data: { courseId: course.id } }),
    enabled: Boolean(course?.id && user?.id),
  });

  if (!course) {
    return (
      <SiteLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">Course not found</h1>
          <Button asChild className="mt-4"><Link to="/learn">Back to catalog</Link></Button>
        </div>
      </SiteLayout>
    );
  }

  const enrolled = Boolean(progress?.enrollment);
  const completedIds = new Set(progress?.completedLessonIds ?? []);
  const totalLessons = lessons.length;
  const completedCount = lessons.filter((l) => completedIds.has(l.id)).length;
  const isFree = course.price_php == null && !course.price_id;

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Link to="/learn" className="text-sm text-muted-foreground hover:underline">← All courses</Link>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {course.category && <Badge variant="secondary">{course.category}</Badge>}
              <Badge variant="outline">{course.level}</Badge>
              {course.duration_minutes ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> {course.duration_minutes} min
                </span>
              ) : null}
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{course.title}</h1>
            {course.summary && <p className="mt-3 text-lg text-muted-foreground">{course.summary}</p>}
            {course.hero_image_url && (
              <img
                src={course.hero_image_url}
                alt={course.title}
                className="mt-6 aspect-video w-full rounded-xl object-cover"
              />
            )}
            {course.description && (
              <div className="prose dark:prose-invert mt-6 max-w-none whitespace-pre-wrap">
                {course.description}
              </div>
            )}

            <h2 className="mt-10 text-xl font-semibold">Curriculum</h2>
            <div className="mt-3 space-y-4">
              {modules.map((m) => {
                const mLessons = lessons.filter((l) => l.module_id === m.id);
                return (
                  <Card key={m.id}>
                    <CardContent className="p-4">
                      <h3 className="font-semibold">{m.title}</h3>
                      {m.summary && <p className="mt-1 text-sm text-muted-foreground">{m.summary}</p>}
                      <ul className="mt-3 space-y-1">
                        {mLessons.map((l) => {
                          const done = completedIds.has(l.id);
                          const canOpen = enrolled || l.is_preview;
                          return (
                            <li key={l.id}>
                              {canOpen ? (
                                <Link
                                  to="/learn/$slug/watch/$lessonId"
                                  params={{ slug: params.slug, lessonId: l.id }}
                                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-secondary"
                                >
                                  <span className="flex items-center gap-2">
                                    {done ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <PlayCircle className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    {l.title}
                                    {l.is_preview && !enrolled && <Badge variant="outline" className="ml-2 text-[10px]">Preview</Badge>}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {Math.round((l.duration_seconds ?? 0) / 60)}m
                                  </span>
                                </Link>
                              ) : (
                                <div className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-2">
                                    <Lock className="h-4 w-4" />
                                    {l.title}
                                  </span>
                                  <span className="text-xs">{Math.round((l.duration_seconds ?? 0) / 60)}m</span>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
              {modules.length === 0 && (
                <p className="text-sm text-muted-foreground">Curriculum will be published soon.</p>
              )}
            </div>
          </div>

          <aside className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardContent className="p-5">
                <div className="text-sm text-muted-foreground">Instructor</div>
                <div className="font-semibold">{course.instructor_name ?? "365 Motorsales"}</div>
                {course.instructor_bio && (
                  <p className="mt-1 text-xs text-muted-foreground">{course.instructor_bio}</p>
                )}

                <div className="mt-5 border-t pt-4">
                  {enrolled ? (
                    <>
                      <div className="mb-3 text-sm">
                        <div className="font-semibold">{completedCount}/{totalLessons} lessons complete</div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${totalLessons ? (completedCount / totalLessons) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                      {lessons[0] && (
                        <Button asChild className="w-full">
                          <Link to="/learn/$slug/watch/$lessonId" params={{ slug: params.slug, lessonId: lessons[0].id }}>
                            <PlayCircle className="mr-2 h-4 w-4" />
                            {completedCount > 0 ? "Continue learning" : "Start course"}
                          </Link>
                        </Button>
                      )}
                      {progress?.certificate && (
                        <Button asChild variant="outline" className="mt-2 w-full">
                          <Link to="/c/$code" params={{ code: (progress.certificate as any).code }}>
                            <Award className="mr-2 h-4 w-4" /> View certificate
                          </Link>
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="mb-3 flex items-baseline gap-2">
                        {course.price_php != null ? (
                          <>
                            <span className="text-3xl font-bold">₱{Number(course.price_php).toLocaleString()}</span>
                            <span className="text-sm text-muted-foreground">one-time</span>
                          </>
                        ) : isFree ? (
                          <span className="text-2xl font-bold">Free</span>
                        ) : (
                          <span className="text-lg font-semibold">Included in subscription</span>
                        )}
                      </div>
                      {(course.included_in_tiers ?? []).length > 0 && (
                        <p className="mb-3 text-xs text-muted-foreground">
                          Also free with: {(course.included_in_tiers as string[]).join(", ")}
                        </p>
                      )}
                      {!user ? (
                        <Button asChild className="w-full">
                          <Link to="/login">Sign in to enroll</Link>
                        </Button>
                      ) : isFree ? (
                        <EnrollFreeButton courseId={course.id} onEnrolled={() => queryClient.invalidateQueries({ queryKey: ["course-progress", course.id] })} />
                      ) : course.price_id ? (
                        showCheckout ? (
                          <CheckoutCard courseId={course.id} />
                        ) : (
                          <Button className="w-full" onClick={() => setShowCheckout(true)}>
                            Buy this course
                          </Button>
                        )
                      ) : (
                        <Button asChild className="w-full">
                          <Link to="/pricing">Upgrade subscription</Link>
                        </Button>
                      )}
                    </>
                  )}
                </div>

                <div className="mt-4 space-y-2 border-t pt-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2"><GraduationCap className="h-3 w-3" /> Certificate of completion</div>
                  <div className="flex items-center gap-2"><PlayCircle className="h-3 w-3" /> {totalLessons} lessons</div>
                  <div className="flex items-center gap-2"><Clock className="h-3 w-3" /> {course.duration_minutes ?? 0} minutes total</div>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </SiteLayout>
  );
}

function EnrollFreeButton({ courseId, onEnrolled }: { courseId: string; onEnrolled: () => void }) {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      className="w-full"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const { supabase } = await import("@/integrations/supabase/client");
          await supabase.from("course_enrollments").insert({ user_id: (await supabase.auth.getUser()).data.user?.id, course_id: courseId, source: "admin_grant" });
        } catch { /* ignore duplicate */ }
        onEnrolled();
        setLoading(false);
      }}
    >
      {loading ? "Enrolling…" : "Enroll for free"}
    </Button>
  );
}

function CheckoutCard({ courseId }: { courseId: string }) {
  const params = Route.useParams();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const createCheckout = useServerFn(createCourseCheckout);

  useState(() => {
    (async () => {
      try {
        const cs = await createCheckout({
          data: {
            courseId,
            returnUrl: `${window.location.origin}/learn/${params.slug}?session_id={CHECKOUT_SESSION_ID}`,
            environment: getStripeEnvironment(),
          },
        });
        setClientSecret(cs);
      } catch (e: any) {
        setError(e?.message ?? "Could not start checkout");
      }
    })();
    return undefined;
  });

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!clientSecret) return <p className="text-sm text-muted-foreground">Loading checkout…</p>;
  return <StripeEmbeddedCheckoutInline clientSecret={clientSecret} />;
}

function StripeEmbeddedCheckoutInline({ clientSecret }: { clientSecret: string }) {
  return (
    <div className="min-h-[500px]">
      <StripeEmbeddedCheckout priceId="placeholder" returnUrl={window.location.href} key={clientSecret} />
    </div>
  );
}
