import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireDomainRole } from "@/integrations/supabase/admin-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ============ PUBLIC: CATALOG ============

export const listCourses = createServerFn({ method: "GET" })
  .inputValidator((input: { category?: string; search?: string; limit?: number } = {}) =>
    z
      .object({
        category: z.string().max(60).optional(),
        search: z.string().max(120).optional(),
        limit: z.number().int().min(1).max(60).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    let q = supabaseAdmin
      .from("courses")
      .select(
        "id, slug, title, summary, hero_image_url, category, level, duration_minutes, instructor_name, price_php, included_in_tiers, published_at",
      )
      .eq("status", "published")
      .order("published_at", { ascending: false });
    if (data.category) q = q.eq("category", data.category);
    if (data.search) q = q.ilike("title", `%${data.search}%`);
    const { data: rows, error } = await q.limit(data.limit ?? 48);
    if (error) throw new Error(error.message);
    return { courses: rows ?? [] };
  });

export const listCourseCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await supabaseAdmin
    .from("courses")
    .select("category")
    .eq("status", "published")
    .not("category", "is", null);
  const set = new Set<string>();
  for (const r of data ?? []) if ((r as any).category) set.add((r as any).category);
  return { categories: Array.from(set).sort() };
});

export const getCourse = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) =>
    z.object({ slug: z.string().min(1).max(120) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: course, error } = await supabaseAdmin
      .from("courses")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!course) return { course: null, modules: [], lessons: [], quizzes: [], sponsor: null };

    const [{ data: modules }, { data: quizzes }] = await Promise.all([
      supabaseAdmin
        .from("course_modules")
        .select("*")
        .eq("course_id", (course as any).id)
        .order("position"),
      supabaseAdmin
        .from("course_quizzes")
        .select("id, module_id, title, pass_threshold, is_final, position")
        .eq("course_id", (course as any).id)
        .order("position"),
    ]);
    const moduleIds = (modules ?? []).map((m: any) => m.id);
    let lessons: any[] = [];
    if (moduleIds.length) {
      const { data: ls } = await supabaseAdmin
        .from("course_lessons")
        .select("id, module_id, position, title, duration_seconds, is_preview")
        .in("module_id", moduleIds)
        .order("position");
      lessons = ls ?? [];
    }

    // Fetch sponsor partner if course is sponsored and within window
    let sponsor: any = null;
    const sponsorId = (course as any).sponsor_partner_id as string | null;
    const sponsoredUntil = (course as any).sponsored_until as string | null;
    if (sponsorId && (!sponsoredUntil || new Date(sponsoredUntil) > new Date())) {
      const { data: p } = await supabaseAdmin
        .from("training_partners")
        .select("name, slug, logo_url, website_url, location")
        .eq("id", sponsorId)
        .eq("active", true)
        .maybeSingle();
      sponsor = p ?? null;
    }
    return { course, modules: modules ?? [], lessons, quizzes: quizzes ?? [], sponsor };
  });

// ============ ENROLLMENT / ACCESS ============

async function ensureEnrolledViaSubscription(userId: string, course: any): Promise<string | null> {
  const tiers: string[] = course.included_in_tiers ?? [];
  if (!tiers.length) return null;
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("plan_id, status, current_period_end")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!sub) return null;
  if ((sub as any).current_period_end && new Date((sub as any).current_period_end) < new Date())
    return null;
  const { data: plan } = await supabaseAdmin
    .from("subscription_plans")
    .select("name")
    .eq("id", (sub as any).plan_id)
    .maybeSingle();
  if (!plan || !tiers.includes((plan as any).name)) return null;
  // Auto-enroll
  const { data: enrolled } = await supabaseAdmin
    .from("course_enrollments")
    .upsert(
      { user_id: userId, course_id: course.id, source: "subscription" },
      { onConflict: "user_id,course_id" },
    )
    .select("id")
    .maybeSingle();
  return (enrolled as any)?.id ?? null;
}

export const getCourseAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { courseId: string }) =>
    z.object({ courseId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId as string;
    const { data: course } = await supabaseAdmin
      .from("courses")
      .select("id, included_in_tiers")
      .eq("id", data.courseId)
      .maybeSingle();
    if (!course) return { enrolled: false, enrollmentId: null as string | null };

    const { data: existing } = await supabaseAdmin
      .from("course_enrollments")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", data.courseId)
      .maybeSingle();
    if (existing) return { enrolled: true, enrollmentId: (existing as any).id };

    const viaSub = await ensureEnrolledViaSubscription(userId, course);
    if (viaSub) return { enrolled: true, enrollmentId: viaSub };
    return { enrolled: false, enrollmentId: null };
  });

export const getLessonContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { lessonId: string }) =>
    z.object({ lessonId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId as string;
    const { data: lesson } = await supabaseAdmin
      .from("course_lessons")
      .select("id, module_id, title, video_url, content_md, duration_seconds, is_preview, position")
      .eq("id", data.lessonId)
      .maybeSingle();
    if (!lesson) throw new Error("Lesson not found");

    const { data: mod } = await supabaseAdmin
      .from("course_modules")
      .select("course_id, title")
      .eq("id", (lesson as any).module_id)
      .maybeSingle();
    if (!mod) throw new Error("Module not found");

    if ((lesson as any).is_preview) {
      return { lesson, allowed: true, resources: [] as any[] };
    }

    const { data: course } = await supabaseAdmin
      .from("courses")
      .select("id, included_in_tiers")
      .eq("id", (mod as any).course_id)
      .maybeSingle();

    const { data: enrollment } = await supabaseAdmin
      .from("course_enrollments")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", (mod as any).course_id)
      .maybeSingle();
    let enrollmentId = (enrollment as any)?.id as string | undefined;
    if (!enrollmentId && course) {
      const subId = await ensureEnrolledViaSubscription(userId, course);
      enrollmentId = subId ?? undefined;
    }
    if (!enrollmentId) {
      return {
        lesson: { id: (lesson as any).id, title: (lesson as any).title },
        allowed: false,
        resources: [],
      };
    }

    const { data: resources } = await supabaseAdmin
      .from("course_resources")
      .select("id, label, file_url")
      .eq("lesson_id", (lesson as any).id);

    return { lesson, allowed: true, resources: resources ?? [], enrollmentId };
  });

export const markLessonComplete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { lessonId: string; watchSeconds?: number }) =>
    z
      .object({
        lessonId: z.string().uuid(),
        watchSeconds: z.number().int().min(0).max(86400).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId as string;
    const { data: lesson } = await supabaseAdmin
      .from("course_lessons")
      .select("module_id")
      .eq("id", data.lessonId)
      .maybeSingle();
    if (!lesson) throw new Error("Lesson not found");
    const { data: mod } = await supabaseAdmin
      .from("course_modules")
      .select("course_id")
      .eq("id", (lesson as any).module_id)
      .maybeSingle();
    if (!mod) throw new Error("Module not found");
    const { data: enrollment } = await supabaseAdmin
      .from("course_enrollments")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", (mod as any).course_id)
      .maybeSingle();
    if (!enrollment) throw new Error("Not enrolled");

    await supabaseAdmin.from("course_lesson_progress").upsert(
      {
        enrollment_id: (enrollment as any).id,
        lesson_id: data.lessonId,
        watch_seconds: data.watchSeconds ?? 0,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "enrollment_id,lesson_id" },
    );
    return { ok: true };
  });

export const getEnrollmentProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { courseId: string }) =>
    z.object({ courseId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId as string;
    const { data: enrollment } = await supabaseAdmin
      .from("course_enrollments")
      .select("id, source, enrolled_at, completed_at")
      .eq("user_id", userId)
      .eq("course_id", data.courseId)
      .maybeSingle();
    if (!enrollment)
      return { enrollment: null, completedLessonIds: [] as string[], certificate: null };
    const { data: progress } = await supabaseAdmin
      .from("course_lesson_progress")
      .select("lesson_id, completed_at")
      .eq("enrollment_id", (enrollment as any).id)
      .not("completed_at", "is", null);
    const { data: cert } = await supabaseAdmin
      .from("course_certificates")
      .select("code, issued_at")
      .eq("enrollment_id", (enrollment as any).id)
      .maybeSingle();
    return {
      enrollment,
      completedLessonIds: (progress ?? []).map((p: any) => p.lesson_id),
      certificate: cert,
    };
  });

// ============ QUIZ ============

export const getQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { quizId: string }) =>
    z.object({ quizId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId as string;
    const { data: quiz } = await supabaseAdmin
      .from("course_quizzes")
      .select("id, course_id, title, pass_threshold, is_final")
      .eq("id", data.quizId)
      .maybeSingle();
    if (!quiz) throw new Error("Quiz not found");
    const { data: enrollment } = await supabaseAdmin
      .from("course_enrollments")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", (quiz as any).course_id)
      .maybeSingle();
    if (!enrollment) throw new Error("Not enrolled");
    // Return questions WITHOUT the correct_index
    const { data: qs } = await supabaseAdmin
      .from("course_quiz_questions")
      .select("id, position, prompt, choices")
      .eq("quiz_id", data.quizId)
      .order("position");
    return { quiz, questions: qs ?? [], enrollmentId: (enrollment as any).id };
  });

export const submitQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { quizId: string; answers: Array<{ questionId: string; choice: number }> }) =>
      z
        .object({
          quizId: z.string().uuid(),
          answers: z
            .array(
              z.object({ questionId: z.string().uuid(), choice: z.number().int().min(0).max(20) }),
            )
            .min(1)
            .max(200),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId as string;
    const { data: quiz } = await supabaseAdmin
      .from("course_quizzes")
      .select("id, course_id, pass_threshold, is_final")
      .eq("id", data.quizId)
      .maybeSingle();
    if (!quiz) throw new Error("Quiz not found");

    const { data: enrollment } = await supabaseAdmin
      .from("course_enrollments")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", (quiz as any).course_id)
      .maybeSingle();
    if (!enrollment) throw new Error("Not enrolled");

    const { data: questions } = await supabaseAdmin
      .from("course_quiz_questions")
      .select("id, correct_index")
      .eq("quiz_id", data.quizId);
    const correctMap = new Map<string, number>(
      (questions ?? []).map((q: any) => [q.id, q.correct_index]),
    );
    let correct = 0;
    for (const a of data.answers) {
      if (correctMap.get(a.questionId) === a.choice) correct += 1;
    }
    const total = correctMap.size || data.answers.length;
    const score = Math.round((correct / total) * 100);
    const passed = score >= ((quiz as any).pass_threshold ?? 80);

    await supabaseAdmin.from("course_quiz_attempts").insert({
      enrollment_id: (enrollment as any).id,
      quiz_id: data.quizId,
      score,
      passed,
      answers: data.answers,
    });

    let certificateCode: string | null = null;
    if (passed && (quiz as any).is_final) {
      // Issue certificate if not already issued
      const { data: existing } = await supabaseAdmin
        .from("course_certificates")
        .select("code")
        .eq("enrollment_id", (enrollment as any).id)
        .maybeSingle();
      if (existing) {
        certificateCode = (existing as any).code;
      } else {
        const code = generateCertCode();
        await supabaseAdmin.from("course_certificates").insert({
          enrollment_id: (enrollment as any).id,
          user_id: userId,
          course_id: (quiz as any).course_id,
          code,
        });
        await supabaseAdmin
          .from("course_enrollments")
          .update({ completed_at: new Date().toISOString() })
          .eq("id", (enrollment as any).id);
        certificateCode = code;
      }
    }

    return { score, passed, total, correct, certificateCode };
  });

function generateCertCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `365C-${out.slice(0, 5)}-${out.slice(5)}`;
}

// ============ CERTIFICATE VERIFY (public) ============

export const verifyCertificate = createServerFn({ method: "GET" })
  .inputValidator((input: { code: string }) =>
    z.object({ code: z.string().min(6).max(40) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: cert } = await supabaseAdmin
      .from("course_certificates")
      .select("code, issued_at, user_id, course_id")
      .eq("code", data.code.toUpperCase())
      .maybeSingle();
    if (!cert) return { certificate: null };
    const [{ data: course }, { data: profile }] = await Promise.all([
      supabaseAdmin
        .from("courses")
        .select("title, slug, instructor_name")
        .eq("id", (cert as any).course_id)
        .maybeSingle(),
      supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("id", (cert as any).user_id)
        .maybeSingle(),
    ]);
    return {
      certificate: {
        code: (cert as any).code,
        issued_at: (cert as any).issued_at,
        course_title: (course as any)?.title ?? "Course",
        course_slug: (course as any)?.slug ?? null,
        instructor_name: (course as any)?.instructor_name ?? null,
        holder_name: (profile as any)?.full_name ?? "Student",
      },
    };
  });

// ============ DASHBOARD: MY COURSES ============

export const listMyEnrollments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId as string;
    const { data: enrollments } = await supabaseAdmin
      .from("course_enrollments")
      .select("id, course_id, source, enrolled_at, completed_at")
      .eq("user_id", userId)
      .order("enrolled_at", { ascending: false });
    if (!enrollments?.length) return { enrollments: [] };
    const courseIds = enrollments.map((e: any) => e.course_id);
    const [{ data: courses }, { data: certs }] = await Promise.all([
      supabaseAdmin
        .from("courses")
        .select("id, slug, title, hero_image_url, duration_minutes, category")
        .in("id", courseIds),
      supabaseAdmin
        .from("course_certificates")
        .select("enrollment_id, code")
        .in(
          "enrollment_id",
          enrollments.map((e: any) => e.id),
        ),
    ]);
    const courseMap = new Map((courses ?? []).map((c: any) => [c.id, c]));
    const certMap = new Map((certs ?? []).map((c: any) => [c.enrollment_id, c.code]));
    return {
      enrollments: enrollments.map((e: any) => ({
        ...e,
        course: courseMap.get(e.course_id) ?? null,
        certificate_code: certMap.get(e.id) ?? null,
      })),
    };
  });

// ============ PARTNERS (public) ============

export const listTrainingPartners = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("training_partners")
    .select(
      "id, slug, name, logo_url, website_url, description, location, specialties, tier, sponsored_until",
    )
    .eq("active", true)
    .order("tier", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return { partners: data ?? [] };
});

// ============ ADMIN ============

const courseInputSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(200),
  summary: z.string().max(500).nullable().optional(),
  description: z.string().max(10000).nullable().optional(),
  hero_image_url: z.string().url().max(2000).nullable().optional(),
  category: z.string().max(60).nullable().optional(),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  duration_minutes: z.number().int().min(0).max(100000).optional(),
  instructor_name: z.string().max(200).nullable().optional(),
  instructor_bio: z.string().max(2000).nullable().optional(),
  price_id: z.string().max(120).nullable().optional(),
  price_php: z.number().nonnegative().nullable().optional(),
  included_in_tiers: z.array(z.string().max(60)).max(20).optional(),
  status: z.enum(["draft", "published", "archived"]),
});

export const adminUpsertCourse = createServerFn({ method: "POST" })
  .middleware([requireDomainRole("moderator", "education.adminUpsertCourse")])
  .inputValidator((input: unknown) => courseInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const row: any = {
      slug: data.slug,
      title: data.title,
      summary: data.summary ?? null,
      description: data.description ?? null,
      hero_image_url: data.hero_image_url ?? null,
      category: data.category ?? null,
      level: data.level,
      duration_minutes: data.duration_minutes ?? 0,
      instructor_name: data.instructor_name ?? null,
      instructor_bio: data.instructor_bio ?? null,
      price_id: data.price_id ?? null,
      price_php: data.price_php ?? null,
      included_in_tiers: data.included_in_tiers ?? [],
      status: data.status,
      published_at: data.status === "published" ? new Date().toISOString() : null,
    };
    if (data.id) {
      const { data: updated } = await supabaseAdmin
        .from("courses")
        .update(row)
        .eq("id", data.id)
        .select()
        .maybeSingle();
      return { course: updated };
    }
    const { data: inserted } = await supabaseAdmin
      .from("courses")
      .insert(row)
      .select()
      .maybeSingle();
    return { course: inserted };
  });

export const adminListCourses = createServerFn({ method: "GET" })
  .middleware([requireDomainRole("moderator", "education.adminListCourses")])
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin
      .from("courses")
      .select(
        "id, slug, title, status, category, price_php, published_at, created_at, sponsor_partner_id, sponsored_until",
      )
      .order("created_at", { ascending: false });
    return { courses: data ?? [] };
  });

export const adminDeleteCourse = createServerFn({ method: "POST" })
  .middleware([requireDomainRole("moderator", "education.adminDeleteCourse")])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await supabaseAdmin.from("courses").delete().eq("id", data.id);
    return { ok: true };
  });

export const adminGetCourseFull = createServerFn({ method: "POST" })
  .middleware([requireDomainRole("moderator", "education.adminGetCourseFull")])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: course } = await supabaseAdmin
      .from("courses")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    const { data: modules } = await supabaseAdmin
      .from("course_modules")
      .select("*")
      .eq("course_id", data.id)
      .order("position");
    const moduleIds = (modules ?? []).map((m: any) => m.id);
    let lessons: any[] = [];
    if (moduleIds.length) {
      const { data: ls } = await supabaseAdmin
        .from("course_lessons")
        .select("*")
        .in("module_id", moduleIds)
        .order("position");
      lessons = ls ?? [];
    }
    const { data: quizzes } = await supabaseAdmin
      .from("course_quizzes")
      .select("*")
      .eq("course_id", data.id)
      .order("position");
    return { course, modules: modules ?? [], lessons, quizzes: quizzes ?? [] };
  });

const moduleSchema = z.object({
  id: z.string().uuid().optional(),
  course_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  summary: z.string().max(500).nullable().optional(),
  position: z.number().int().min(0).max(1000),
});
export const adminUpsertModule = createServerFn({ method: "POST" })
  .middleware([requireDomainRole("moderator", "education.adminUpsertModule")])
  .inputValidator((input: unknown) => moduleSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { data: r } = await supabaseAdmin
        .from("course_modules")
        .update({
          title: data.title,
          summary: data.summary ?? null,
          position: data.position,
        })
        .eq("id", data.id)
        .select()
        .maybeSingle();
      return { module: r };
    }
    const { data: r } = await supabaseAdmin
      .from("course_modules")
      .insert({
        course_id: data.course_id,
        title: data.title,
        summary: data.summary ?? null,
        position: data.position,
      })
      .select()
      .maybeSingle();
    return { module: r };
  });

export const adminDeleteModule = createServerFn({ method: "POST" })
  .middleware([requireDomainRole("moderator", "education.adminDeleteModule")])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await supabaseAdmin.from("course_modules").delete().eq("id", data.id);
    return { ok: true };
  });

const lessonSchema = z.object({
  id: z.string().uuid().optional(),
  module_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  video_url: z.string().url().max(2000).nullable().optional(),
  duration_seconds: z.number().int().min(0).max(86400).optional(),
  content_md: z.string().max(20000).nullable().optional(),
  is_preview: z.boolean().optional(),
  position: z.number().int().min(0).max(1000),
});
export const adminUpsertLesson = createServerFn({ method: "POST" })
  .middleware([requireDomainRole("moderator", "education.adminUpsertLesson")])
  .inputValidator((input: unknown) => lessonSchema.parse(input))
  .handler(async ({ data, context }) => {
    const row = {
      module_id: data.module_id,
      title: data.title,
      video_url: data.video_url ?? null,
      duration_seconds: data.duration_seconds ?? 0,
      content_md: data.content_md ?? null,
      is_preview: data.is_preview ?? false,
      position: data.position,
    };
    if (data.id) {
      const { data: r } = await supabaseAdmin
        .from("course_lessons")
        .update(row)
        .eq("id", data.id)
        .select()
        .maybeSingle();
      return { lesson: r };
    }
    const { data: r } = await supabaseAdmin
      .from("course_lessons")
      .insert(row)
      .select()
      .maybeSingle();
    return { lesson: r };
  });

export const adminDeleteLesson = createServerFn({ method: "POST" })
  .middleware([requireDomainRole("moderator", "education.adminDeleteLesson")])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await supabaseAdmin.from("course_lessons").delete().eq("id", data.id);
    return { ok: true };
  });

// ---- Partners admin ----

const partnerSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(200),
  logo_url: z.string().url().max(2000).nullable().optional(),
  website_url: z.string().url().max(2000),
  description: z.string().max(2000).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  specialties: z.array(z.string().max(60)).max(20).optional(),
  tier: z.enum(["featured", "standard"]),
  sponsored_until: z.string().nullable().optional(),
  active: z.boolean(),
});

export const adminListPartners = createServerFn({ method: "GET" })
  .middleware([requireDomainRole("moderator", "education.adminListPartners")])
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin
      .from("training_partners")
      .select("*")
      .order("tier", { ascending: true })
      .order("created_at", { ascending: false });
    return { partners: data ?? [] };
  });

export const adminUpsertPartner = createServerFn({ method: "POST" })
  .middleware([requireDomainRole("moderator", "education.adminUpsertPartner")])
  .inputValidator((input: unknown) => partnerSchema.parse(input))
  .handler(async ({ data, context }) => {
    const row: any = {
      slug: data.slug,
      name: data.name,
      logo_url: data.logo_url ?? null,
      website_url: data.website_url,
      description: data.description ?? null,
      location: data.location ?? null,
      specialties: data.specialties ?? [],
      tier: data.tier,
      sponsored_until: data.sponsored_until || null,
      active: data.active,
    };
    if (data.id) {
      const { data: r } = await supabaseAdmin
        .from("training_partners")
        .update(row)
        .eq("id", data.id)
        .select()
        .maybeSingle();
      return { partner: r };
    }
    const { data: r } = await supabaseAdmin
      .from("training_partners")
      .insert(row)
      .select()
      .maybeSingle();
    return { partner: r };
  });

export const adminDeletePartner = createServerFn({ method: "POST" })
  .middleware([requireDomainRole("moderator", "education.adminDeletePartner")])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await supabaseAdmin.from("training_partners").delete().eq("id", data.id);
    return { ok: true };
  });

// ---- Course checkout (Stripe) ----

import { type StripeEnv, createStripeClient, validateReturnUrl } from "@/lib/stripe.server";

export const createCourseCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { courseId: string; returnUrl: string; environment: StripeEnv }) =>
    z
      .object({
        courseId: z.string().uuid(),
        returnUrl: z.string().url(),
        environment: z.enum(["sandbox", "live"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    validateReturnUrl(data.returnUrl);
    const userId = context.userId as string;
    const claims = context.claims as any;
    const { data: course } = await supabaseAdmin
      .from("courses")
      .select("id, title, price_id, price_php, slug")
      .eq("id", data.courseId)
      .eq("status", "published")
      .maybeSingle();
    if (!course) throw new Error("Course not found");
    if (!(course as any).price_id) throw new Error("This course is not available for purchase");

    const stripe = createStripeClient(data.environment);
    const prices = await stripe.prices.list({ lookup_keys: [(course as any).price_id] });
    if (!prices.data.length) throw new Error("Stripe price not configured for this course");
    const stripePrice = prices.data[0];

    // Reuse or create a customer
    let customerId: string | undefined;
    const email = claims?.email as string | undefined;
    if (userId) {
      const found = await stripe.customers.search({
        query: `metadata['userId']:'${userId}'`,
        limit: 1,
      });
      customerId = found.data[0]?.id;
    }
    if (!customerId && email) {
      const existing = await stripe.customers.list({ email, limit: 1 });
      customerId = existing.data[0]?.id;
    }
    if (!customerId) {
      const created = await stripe.customers.create({
        ...(email && { email }),
        metadata: { userId },
      });
      customerId = created.id;
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      mode: "payment",
      ui_mode: "embedded_page",
      return_url: data.returnUrl,
      customer: customerId,
      payment_intent_data: { description: (course as any).title },
      metadata: {
        userId,
        kind: "course",
        courseId: (course as any).id,
        courseSlug: (course as any).slug,
      },
    });

    return session.client_secret;
  });

// ============ #17 — CERTIFIED MECHANICS / BUSINESS BADGES ============

const MECHANIC_CATEGORIES = ["Motorcycles", "Trucks", "Buying", "Documents"];

/**
 * Public: list businesses whose owner has at least one course certificate.
 * Used by /learn/mechanics to surface trained pros from the directory.
 */
export const listMechanicBusinesses = createServerFn({ method: "GET" })
  .inputValidator((input: { city?: string; limit?: number } = {}) =>
    z
      .object({
        city: z.string().max(80).optional(),
        limit: z.number().int().min(1).max(60).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    // 1. Pull certificates joined to courses to filter to mechanic categories.
    const { data: certs } = await supabaseAdmin
      .from("course_certificates")
      .select("user_id, course_id, code, issued_at, courses!inner(category, title, slug)")
      .in("courses.category", MECHANIC_CATEGORIES);
    if (!certs?.length) return { businesses: [] };

    // group cert count per user
    const byUser = new Map<string, { count: number; categories: Set<string> }>();
    for (const c of certs as any[]) {
      const entry = byUser.get(c.user_id) ?? { count: 0, categories: new Set<string>() };
      entry.count += 1;
      if (c.courses?.category) entry.categories.add(c.courses.category);
      byUser.set(c.user_id, entry);
    }
    const ownerIds = Array.from(byUser.keys());

    // 2. Pull active businesses owned by those users.
    let q = supabaseAdmin
      .from("businesses")
      .select(
        "id, slug, name, logo_url, city, region, type_slug, rating_avg, rating_count, owner_id",
      )
      .eq("status", "active")
      .in("owner_id", ownerIds);
    if (data.city) q = q.ilike("city", `%${data.city}%`);
    const { data: rows } = await q.limit(data.limit ?? 48);

    return {
      businesses: (rows ?? []).map((b: any) => ({
        ...b,
        certificate_count: byUser.get(b.owner_id)?.count ?? 0,
        certificate_categories: Array.from(byUser.get(b.owner_id)?.categories ?? []),
      })),
    };
  });

/**
 * Public: list course certificates earned by a business owner.
 * Used on /businesses/:slug to display a Certified Training badge.
 */
export const listOwnerCertificates = createServerFn({ method: "GET" })
  .inputValidator((input: { ownerId: string }) =>
    z.object({ ownerId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: certs } = await supabaseAdmin
      .from("course_certificates")
      .select("code, issued_at, courses(title, slug, category)")
      .eq("user_id", data.ownerId)
      .order("issued_at", { ascending: false })
      .limit(12);
    return { certificates: certs ?? [] };
  });

// ============ #17 — ADMIN SPONSORSHIP CONTROLS ============

export const adminSetCourseSponsor = createServerFn({ method: "POST" })
  .middleware([requireDomainRole("moderator", "education.adminSetCourseSponsor")])
  .inputValidator((input: unknown) =>
    z
      .object({
        courseId: z.string().uuid(),
        sponsorPartnerId: z.string().uuid().nullable(),
        sponsoredUntil: z.string().datetime().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("courses")
      .update({
        sponsor_partner_id: data.sponsorPartnerId,
        sponsored_until: data.sponsoredUntil,
      })
      .eq("id", data.courseId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
