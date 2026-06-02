import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { confirm } from "@/components/ui/confirm-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { SiteLayout } from "@/components/site-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, ExternalLink } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListCourses, adminUpsertCourse, adminDeleteCourse, adminGetCourseFull,
  adminUpsertModule, adminDeleteModule, adminUpsertLesson, adminDeleteLesson,
  adminListPartners, adminUpsertPartner, adminDeletePartner,
} from "@/lib/education.functions";

export const Route = createFileRoute("/admin/education")({
  component: AdminEducation,
});

function AdminEducation() {
  const { user, loading, isStaff } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && (!user || !isStaff)) navigate({ to: "/" });
  }, [user, loading, isStaff, navigate]);

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold">Education portal admin</h1>
        <Tabs defaultValue="courses" className="mt-6">
          <TabsList>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="partners">Partner schools</TabsTrigger>
          </TabsList>
          <TabsContent value="courses" className="mt-4">
            <CoursesTab />
          </TabsContent>
          <TabsContent value="partners" className="mt-4">
            <PartnersTab />
          </TabsContent>
        </Tabs>
      </div>
    </SiteLayout>
  );
}

// ============ COURSES ============

function CoursesTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-courses"], queryFn: () => adminListCourses() });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const del = useServerFn(adminDeleteCourse);

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => setNewOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> New course
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Slug</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {(data?.courses ?? []).map((c: any) => (
                <tr key={c.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{c.title}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c.slug}</td>
                  <td className="px-3 py-2">{c.category ?? "—"}</td>
                  <td className="px-3 py-2">{c.price_php != null ? `₱${c.price_php}` : "—"}</td>
                  <td className="px-3 py-2"><Badge variant={c.status === "published" ? "default" : "outline"}>{c.status}</Badge></td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="ghost" asChild>
                      <Link to="/learn/$slug" params={{ slug: c.slug }}><ExternalLink className="h-3 w-3" /></Link>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(c.id)}><Edit className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={async () => {
                      if (!(await confirm({ title: `Delete "${c.title}"?`, destructive: true }))) return;
                      await del({ data: { id: c.id } });
                      qc.invalidateQueries({ queryKey: ["admin-courses"] });
                    }}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
              {(data?.courses ?? []).length === 0 && (
                <tr><td className="px-3 py-6 text-center text-muted-foreground" colSpan={6}>No courses yet.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {newOpen && <CourseFormDialog onClose={() => { setNewOpen(false); qc.invalidateQueries({ queryKey: ["admin-courses"] }); }} />}
      {editingId && <CourseEditor courseId={editingId} onClose={() => { setEditingId(null); qc.invalidateQueries({ queryKey: ["admin-courses"] }); }} />}
    </>
  );
}

function CourseFormDialog({ courseId, initial, onClose }: { courseId?: string; initial?: any; onClose: () => void }) {
  const upsert = useServerFn(adminUpsertCourse);
  const [form, setForm] = useState<any>(() => initial ?? {
    slug: "", title: "", summary: "", description: "",
    hero_image_url: "", category: "", level: "beginner",
    duration_minutes: 0, instructor_name: "", instructor_bio: "",
    price_id: "", price_php: null, included_in_tiers: [] as string[],
    status: "draft",
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{courseId ? "Edit course" : "New course"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Slug (URL)"><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="detailing-basics" /></Field>
          <Field label="Summary"><Input value={form.summary ?? ""} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></Field>
          <Field label="Description"><Textarea rows={5} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Hero image URL"><Input value={form.hero_image_url ?? ""} onChange={(e) => setForm({ ...form, hero_image_url: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category"><Input value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Repair, Detailing…" /></Field>
            <Field label="Level">
              <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Duration (minutes)">
              <Input type="number" value={form.duration_minutes ?? 0} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
            </Field>
            <Field label="Instructor">
              <Input value={form.instructor_name ?? ""} onChange={(e) => setForm({ ...form, instructor_name: e.target.value })} />
            </Field>
          </div>
          <Field label="Instructor bio"><Textarea rows={2} value={form.instructor_bio ?? ""} onChange={(e) => setForm({ ...form, instructor_bio: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Stripe price lookup_key (one-time)">
              <Input value={form.price_id ?? ""} onChange={(e) => setForm({ ...form, price_id: e.target.value })} placeholder="course_xxx_onetime" />
            </Field>
            <Field label="Display price (PHP)">
              <Input type="number" value={form.price_php ?? ""} onChange={(e) => setForm({ ...form, price_php: e.target.value === "" ? null : Number(e.target.value) })} />
            </Field>
          </div>
          <Field label="Included in subscription tiers (comma-separated plan names)">
            <Input
              value={(form.included_in_tiers ?? []).join(", ")}
              onChange={(e) => setForm({ ...form, included_in_tiers: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              placeholder="Verified Seller, Dealer Pro"
            />
          </Field>
          <Field label="Status">
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={async () => {
            await upsert({ data: { ...form, id: courseId, price_php: form.price_php ?? undefined, price_id: form.price_id || null } });
            onClose();
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

// ---- Course editor (curriculum) ----

function CourseEditor({ courseId, onClose }: { courseId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [showCourseForm, setShowCourseForm] = useState(false);
  const { data, refetch } = useQuery({
    queryKey: ["admin-course", courseId],
    queryFn: () => adminGetCourseFull({ data: { id: courseId } }),
  });
  const upsertModule = useServerFn(adminUpsertModule);
  const delModule = useServerFn(adminDeleteModule);
  const upsertLesson = useServerFn(adminUpsertLesson);
  const delLesson = useServerFn(adminDeleteLesson);

  const course = (data as any)?.course;
  const modules = (data as any)?.modules ?? [];
  const lessons = (data as any)?.lessons ?? [];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{course?.title ?? "Edit course"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Button variant="outline" size="sm" onClick={() => setShowCourseForm(true)}>
            <Edit className="mr-1 h-3 w-3" /> Edit course details
          </Button>
          {showCourseForm && course && (
            <CourseFormDialog courseId={courseId} initial={course} onClose={() => { setShowCourseForm(false); refetch(); }} />
          )}

          <div className="mt-4">
            <h3 className="mb-2 font-semibold">Modules</h3>
            <div className="space-y-3">
              {modules.map((m: any) => {
                const mLessons = lessons.filter((l: any) => l.module_id === m.id);
                return (
                  <Card key={m.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{m.position}. {m.title}</p>
                          {m.summary && <p className="text-xs text-muted-foreground">{m.summary}</p>}
                        </div>
                        <Button size="sm" variant="ghost" onClick={async () => {
                          if (!(await confirm({ title: `Delete module "${m.title}"?`, destructive: true }))) return;
                          await delModule({ data: { id: m.id } });
                          refetch();
                        }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                      </div>
                      <ul className="mt-2 space-y-1 pl-3 text-sm">
                        {mLessons.map((l: any) => (
                          <li key={l.id} className="flex items-center justify-between">
                            <span>{l.position}. {l.title} {l.is_preview && <Badge variant="outline" className="ml-1 text-[10px]">Preview</Badge>}</span>
                            <Button size="sm" variant="ghost" onClick={async () => {
                              if (!(await confirm({ title: `Delete lesson "${l.title}"?`, destructive: true }))) return;
                              await delLesson({ data: { id: l.id } });
                              refetch();
                            }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                          </li>
                        ))}
                      </ul>
                      <LessonAdder moduleId={m.id} onAdded={refetch} />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <ModuleAdder courseId={courseId} nextPosition={modules.length} onAdded={refetch} />
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModuleAdder({ courseId, nextPosition, onAdded }: { courseId: string; nextPosition: number; onAdded: () => void }) {
  const [title, setTitle] = useState("");
  const upsert = useServerFn(adminUpsertModule);
  return (
    <div className="mt-3 flex gap-2">
      <Input placeholder="New module title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Button size="sm" onClick={async () => {
        if (!title.trim()) return;
        await upsert({ data: { course_id: courseId, title, position: nextPosition } });
        setTitle("");
        onAdded();
      }}><Plus className="h-3 w-3" /></Button>
    </div>
  );
}

function LessonAdder({ moduleId, onAdded }: { moduleId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ title: "", video_url: "", duration_seconds: 0, content_md: "", is_preview: false });
  const upsert = useServerFn(adminUpsertLesson);
  if (!open) {
    return (
      <Button size="sm" variant="outline" className="mt-2" onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-3 w-3" /> Add lesson
      </Button>
    );
  }
  return (
    <div className="mt-2 space-y-2 rounded-md border p-3">
      <Input placeholder="Lesson title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <Input placeholder="Video URL (YouTube, Vimeo, mp4…)" value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} />
      <div className="flex gap-2">
        <Input type="number" placeholder="Duration (sec)" value={form.duration_seconds} onChange={(e) => setForm({ ...form, duration_seconds: Number(e.target.value) })} />
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" checked={form.is_preview} onChange={(e) => setForm({ ...form, is_preview: e.target.checked })} />
          Free preview
        </label>
      </div>
      <Textarea rows={3} placeholder="Lesson notes (markdown)" value={form.content_md} onChange={(e) => setForm({ ...form, content_md: e.target.value })} />
      <div className="flex gap-2">
        <Button size="sm" onClick={async () => {
          if (!form.title.trim()) return;
          await upsert({ data: { module_id: moduleId, title: form.title, video_url: form.video_url || null, duration_seconds: form.duration_seconds, content_md: form.content_md || null, is_preview: form.is_preview, position: 0 } });
          setForm({ title: "", video_url: "", duration_seconds: 0, content_md: "", is_preview: false });
          setOpen(false);
          onAdded();
        }}>Add</Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}

// ============ PARTNERS ============

function PartnersTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-partners"], queryFn: () => adminListPartners() });
  const [editing, setEditing] = useState<any | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const del = useServerFn(adminDeletePartner);

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => setNewOpen(true)}><Plus className="mr-1 h-4 w-4" /> New partner</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Tier</th>
                <th className="px-3 py-2">Sponsored until</th>
                <th className="px-3 py-2">Clicks</th>
                <th className="px-3 py-2">Active</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {(data?.partners ?? []).map((p: any) => (
                <tr key={p.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2"><Badge variant={p.tier === "featured" ? "default" : "outline"}>{p.tier}</Badge></td>
                  <td className="px-3 py-2 text-muted-foreground">{p.sponsored_until ?? "—"}</td>
                  <td className="px-3 py-2">{p.click_count ?? 0}</td>
                  <td className="px-3 py-2">{p.active ? "Yes" : "No"}</td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(p)}><Edit className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={async () => {
                      if (!(await confirm({ title: `Delete ${p.name}?`, destructive: true }))) return;
                      await del({ data: { id: p.id } });
                      qc.invalidateQueries({ queryKey: ["admin-partners"] });
                    }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
              {(data?.partners ?? []).length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No partners yet.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {newOpen && <PartnerFormDialog onClose={() => { setNewOpen(false); qc.invalidateQueries({ queryKey: ["admin-partners"] }); }} />}
      {editing && <PartnerFormDialog initial={editing} onClose={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["admin-partners"] }); }} />}
    </>
  );
}

function PartnerFormDialog({ initial, onClose }: { initial?: any; onClose: () => void }) {
  const upsert = useServerFn(adminUpsertPartner);
  const [form, setForm] = useState<any>(() => initial ?? {
    slug: "", name: "", logo_url: "", website_url: "", description: "",
    location: "", specialties: [], tier: "standard", sponsored_until: "", active: true,
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? "Edit partner" : "New partner"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Slug"><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
          <Field label="Website URL"><Input value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} /></Field>
          <Field label="Logo URL"><Input value={form.logo_url ?? ""} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} /></Field>
          <Field label="Location"><Input value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
          <Field label="Description"><Textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Specialties (comma-separated)">
            <Input value={(form.specialties ?? []).join(", ")} onChange={(e) => setForm({ ...form, specialties: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tier">
              <Select value={form.tier} onValueChange={(v) => setForm({ ...form, tier: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Sponsored until">
              <Input type="date" value={form.sponsored_until ?? ""} onChange={(e) => setForm({ ...form, sponsored_until: e.target.value })} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Active (visible on partner page)
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={async () => {
            await upsert({ data: { ...form, id: initial?.id } });
            onClose();
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
