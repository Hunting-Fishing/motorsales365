import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/site-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  PlayCircle,
  Lock,
  ChevronLeft,
  ListChecks,
  Download,
  Award,
} from "lucide-react";
import {
  getCourse,
  getLessonContent,
  markLessonComplete,
  getEnrollmentProgress,
  getQuiz,
  submitQuiz,
} from "@/lib/education.functions";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/learn_/$slug/watch/$lessonId")({
  loader: async ({ params }) => {
    const course = await getCourse({ data: { slug: params.slug } });
    return course;
  },
  head: () => ({ meta: [{ title: "Lesson — 365 Learn" }] }),
  component: Watch,
});

function Watch() {
  const data = Route.useLoaderData();
  const params = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  const course = data?.course as any;
  const modules = (data?.modules ?? []) as any[];
  const lessons = (data?.lessons ?? []) as any[];
  const quizzes = (data?.quizzes ?? []) as any[];

  const { data: lessonData, isLoading } = useQuery({
    queryKey: ["lesson", params.lessonId, user?.id],
    queryFn: () => getLessonContent({ data: { lessonId: params.lessonId } }),
    enabled: Boolean(user?.id),
  });

  const { data: progress, refetch } = useQuery({
    queryKey: ["course-progress", course?.id, user?.id],
    queryFn: () => getEnrollmentProgress({ data: { courseId: course.id } }),
    enabled: Boolean(course?.id && user?.id),
  });

  const completedIds = new Set(progress?.completedLessonIds ?? []);
  const markComplete = useServerFn(markLessonComplete);

  if (!course) {
    return (
      <SiteLayout>
        <div className="p-12 text-center">Course not found.</div>
      </SiteLayout>
    );
  }

  const allowed = (lessonData as any)?.allowed;
  const lesson = (lessonData as any)?.lesson;
  const currentIdx = lessons.findIndex((l) => l.id === params.lessonId);
  const next = lessons[currentIdx + 1];
  const moduleQuiz = quizzes.find((q) => q.module_id === lesson?.module_id);

  return (
    <SiteLayout>
      <div className="container mx-auto grid gap-6 px-4 py-6 lg:grid-cols-[1fr_320px]">
        <div>
          <Link
            to="/learn/$slug"
            params={{ slug: params.slug }}
            className="inline-flex items-center text-sm text-muted-foreground hover:underline"
          >
            <ChevronLeft className="h-4 w-4" /> {course.title}
          </Link>

          {isLoading ? (
            <div className="mt-4 aspect-video animate-pulse rounded-xl bg-muted" />
          ) : !allowed ? (
            <Card className="mt-4">
              <CardContent className="p-8 text-center">
                <Lock className="mx-auto h-10 w-10 text-muted-foreground" />
                <h2 className="mt-3 text-xl font-semibold">You're not enrolled in this course</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Purchase the course or activate a subscription to access this lesson.
                </p>
                <Button asChild className="mt-4">
                  <Link to="/learn/$slug" params={{ slug: params.slug }}>
                    Go to enrollment
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <h1 className="mt-4 text-2xl font-bold">{lesson?.title}</h1>
              {lesson?.video_url ? (
                <div className="mt-4 aspect-video overflow-hidden rounded-xl bg-black">
                  {/youtube|youtu\.be|vimeo|player/i.test(lesson.video_url) ? (
                    <iframe
                      src={normalizeEmbedUrl(lesson.video_url)}
                      title={lesson.title}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video src={lesson.video_url} controls className="h-full w-full" />
                  )}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
                  Video coming soon.
                </div>
              )}

              {lesson?.content_md && (
                <div className="prose dark:prose-invert mt-6 max-w-none whitespace-pre-wrap">
                  {lesson.content_md}
                </div>
              )}

              {(lessonData as any)?.resources?.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold">Lesson resources</h3>
                  <ul className="mt-2 space-y-1">
                    {(lessonData as any).resources.map((r: any) => (
                      <li key={r.id}>
                        <a
                          href={r.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <Download className="h-4 w-4" /> {r.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-8 flex flex-wrap items-center gap-2">
                <Button
                  variant={completedIds.has(params.lessonId) ? "secondary" : "default"}
                  onClick={async () => {
                    await markComplete({ data: { lessonId: params.lessonId } });
                    await refetch();
                  }}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {completedIds.has(params.lessonId) ? "Marked complete" : "Mark as complete"}
                </Button>
                {next && (
                  <Button asChild variant="outline">
                    <Link
                      to="/learn_/$slug/watch/$lessonId"
                      params={{ slug: params.slug, lessonId: next.id }}
                    >
                      Next lesson →
                    </Link>
                  </Button>
                )}
                {moduleQuiz && (
                  <QuizLauncher
                    quizId={moduleQuiz.id}
                    onPassed={() => {
                      refetch();
                      queryClient.invalidateQueries({ queryKey: ["course-progress", course.id] });
                    }}
                  />
                )}
              </div>
            </>
          )}
        </div>

        <aside>
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-semibold">Course outline</h3>
              <div className="space-y-3 text-sm">
                {modules.map((m) => {
                  const mLessons = lessons.filter((l) => l.module_id === m.id);
                  const mQuiz = quizzes.find((q) => q.module_id === m.id);
                  return (
                    <div key={m.id}>
                      <div className="mb-1 font-medium">{m.title}</div>
                      <ul className="space-y-0.5">
                        {mLessons.map((l) => (
                          <li key={l.id}>
                            <Link
                              to="/learn_/$slug/watch/$lessonId"
                              params={{ slug: params.slug, lessonId: l.id }}
                              className={`flex items-center gap-2 rounded px-2 py-1 hover:bg-secondary ${l.id === params.lessonId ? "bg-secondary font-medium" : ""}`}
                            >
                              {completedIds.has(l.id) ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                              ) : (
                                <PlayCircle className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                              <span className="truncate">{l.title}</span>
                            </Link>
                          </li>
                        ))}
                        {mQuiz && (
                          <li className="px-2 py-1 text-xs text-muted-foreground">
                            <ListChecks className="mr-1 inline h-3 w-3" /> Quiz: {mQuiz.title}
                          </li>
                        )}
                      </ul>
                    </div>
                  );
                })}
                {quizzes
                  .filter((q) => q.is_final)
                  .map((q) => (
                    <div
                      key={q.id}
                      className="rounded-md border border-primary/30 bg-primary/5 p-2 text-xs"
                    >
                      <ListChecks className="mr-1 inline h-3 w-3" /> Final quiz: {q.title}
                    </div>
                  ))}
              </div>

              {progress?.certificate && (
                <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                  <Link to="/c/$code" params={{ code: (progress.certificate as any).code }}>
                    <Award className="mr-2 h-4 w-4" /> Certificate
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </SiteLayout>
  );
}

function normalizeEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") && u.pathname === "/watch") {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (u.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    if (u.hostname.includes("vimeo.com") && /^\/\d+/.test(u.pathname)) {
      return `https://player.vimeo.com/video${u.pathname}`;
    }
    return url;
  } catch {
    return url;
  }
}

function QuizLauncher({ quizId, onPassed }: { quizId: string; onPassed: () => void }) {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<any>(null);
  const submit = useServerFn(submitQuiz);

  const { data: quizData, isLoading } = useQuery({
    queryKey: ["quiz", quizId, open],
    queryFn: () => getQuiz({ data: { quizId } }),
    enabled: open,
  });

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <ListChecks className="mr-2 h-4 w-4" /> Take module quiz
      </Button>
    );
  }

  return (
    <Card className="mt-4 w-full">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">{(quizData as any)?.quiz?.title ?? "Quiz"}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setOpen(false);
              setResult(null);
              setAnswers({});
            }}
          >
            Close
          </Button>
        </div>
        {isLoading ? (
          <p>Loading…</p>
        ) : result ? (
          <div>
            <p className="text-lg font-semibold">
              {result.passed ? "🎉 Passed!" : "Not quite — try again"}
            </p>
            <p className="text-sm text-muted-foreground">
              Score: {result.score}% ({result.correct}/{result.total})
            </p>
            {result.certificateCode && (
              <p className="mt-2 text-sm">
                Certificate code:{" "}
                <code className="rounded bg-secondary px-1.5 py-0.5">{result.certificateCode}</code>
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {((quizData as any)?.questions ?? []).map((q: any, qi: number) => (
              <div key={q.id}>
                <p className="font-medium">
                  {qi + 1}. {q.prompt}
                </p>
                <div className="mt-2 space-y-1">
                  {(q.choices ?? []).map((choice: string, ci: number) => (
                    <label
                      key={ci}
                      className="flex cursor-pointer items-center gap-2 rounded p-1.5 hover:bg-secondary"
                    >
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === ci}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: ci }))}
                      />
                      <span className="text-sm">{choice}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <Button
              onClick={async () => {
                const submission = Object.entries(answers).map(([questionId, choice]) => ({
                  questionId,
                  choice,
                }));
                if (submission.length === 0) return;
                const r = await submit({ data: { quizId, answers: submission } });
                setResult(r);
                if (r.passed) onPassed();
              }}
              disabled={Object.keys(answers).length === 0}
            >
              Submit quiz
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
