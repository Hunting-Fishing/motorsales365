import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Award, PlayCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { listMyEnrollments } from "@/lib/education.functions";

export const Route = createFileRoute("/dashboard/learning")({
  component: DashboardLearning,
});

function DashboardLearning() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["my-enrollments", user?.id],
    queryFn: () => listMyEnrollments(),
    enabled: Boolean(user?.id),
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">My learning</h1>
      <p className="text-sm text-muted-foreground">Courses you're enrolled in and certificates you've earned.</p>

      {isLoading ? (
        <p className="mt-6 text-muted-foreground">Loading…</p>
      ) : (data?.enrollments ?? []).length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed p-12 text-center">
          <GraduationCap className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">You haven't enrolled in any courses yet.</p>
          <Button asChild className="mt-4">
            <Link to="/learn">Browse courses</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data!.enrollments.map((e: any) => (
            <Card key={e.id} className="overflow-hidden">
              <div className="aspect-video overflow-hidden bg-muted">
                {e.course?.hero_image_url ? (
                  <img src={e.course.hero_image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <GraduationCap className="h-12 w-12" />
                  </div>
                )}
              </div>
              <CardContent className="space-y-2 p-4">
                <h3 className="font-semibold">{e.course?.title}</h3>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Enrolled {new Date(e.enrolled_at).toLocaleDateString()}</span>
                  {e.completed_at && <span className="text-green-600">Completed</span>}
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {e.course && (
                    <Button asChild size="sm" variant="default">
                      <Link to="/learn/$slug" params={{ slug: e.course.slug }}>
                        <PlayCircle className="mr-1 h-3 w-3" /> Continue
                      </Link>
                    </Button>
                  )}
                  {e.certificate_code && (
                    <Button asChild size="sm" variant="outline">
                      <Link to="/c/$code" params={{ code: e.certificate_code }}>
                        <Award className="mr-1 h-3 w-3" /> Certificate
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
