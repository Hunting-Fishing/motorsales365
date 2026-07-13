import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2, Globe } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listDocCheckCountries,
  getDocCheckCountry,
  upsertDocCheckCountry,
  upsertDocCheckSection,
  deleteDocCheckSection,
  upsertDocCheckDocument,
  deleteDocCheckDocument,
  upsertDocCheckLink,
  deleteDocCheckLink,
  type DocCheckCountry,
  type DocCheckSection,
  type DocCheckDocument,
  type DocCheckLink,
} from "@/lib/document-check.functions";

export const Route = createFileRoute("/admin/document-check")({
  head: () => ({
    meta: [
      { title: "Admin — Document Check" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminDocumentCheckPage,
});

const SECTION_KINDS: DocCheckSection["kind"][] = [
  "quick_guide",
  "buying",
  "selling",
  "import",
  "export",
  "insurance",
  "documents",
];

function AdminDocumentCheckPage() {
  const list = useServerFn(listDocCheckCountries);
  const get = useServerFn(getDocCheckCountry);
  const upsertCountry = useServerFn(upsertDocCheckCountry);

  const [countries, setCountries] = useState<DocCheckCountry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const data = await list();
      setCountries(data);
      if (!selected && data.length) setSelected(data[0].code);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load countries");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <h1 className="font-display text-2xl font-bold">Document Check — admin</h1>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-[280px_1fr]">
            <aside className="space-y-1">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  Countries
                </span>
                <NewCountryButton
                  onCreated={async (code) => {
                    await refresh();
                    setSelected(code);
                  }}
                  upsertCountry={upsertCountry}
                />
              </div>
              <div className="max-h-[70vh] space-y-1 overflow-y-auto rounded-lg border border-border p-1">
                {countries.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => setSelected(c.code)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted ${
                      selected === c.code ? "bg-muted font-semibold" : ""
                    }`}
                  >
                    <span className="text-lg">{c.flag_emoji}</span>
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    {!c.is_published && (
                      <Badge variant="outline" className="text-[10px]">
                        Draft
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </aside>

            <div>
              {selected ? (
                <CountryEditor
                  code={selected}
                  getFn={get}
                  refreshList={refresh}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a country to edit.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}

function NewCountryButton({
  onCreated,
  upsertCountry,
}: {
  onCreated: (code: string) => void;
  upsertCountry: ReturnType<typeof useServerFn<typeof upsertDocCheckCountry>>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={async () => {
        const code = prompt("ISO country code (2 letters, e.g. br)")?.toLowerCase().trim();
        if (!code) return;
        const name = prompt("Country name")?.trim();
        if (!name) return;
        setBusy(true);
        try {
          await upsertCountry({
            data: {
              code,
              name,
              flag_emoji: "🏳️",
              region: "Other",
              slug: code,
              is_published: false,
            },
          });
          toast.success("Country added");
          onCreated(code);
        } catch (e: any) {
          toast.error(e.message ?? "Failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      <Plus className="h-3.5 w-3.5" /> New
    </Button>
  );
}

function CountryEditor({
  code,
  getFn,
  refreshList,
}: {
  code: string;
  getFn: ReturnType<typeof useServerFn<typeof getDocCheckCountry>>;
  refreshList: () => Promise<void>;
}) {
  const upsertCountry = useServerFn(upsertDocCheckCountry);
  const upsertSection = useServerFn(upsertDocCheckSection);
  const deleteSection = useServerFn(deleteDocCheckSection);
  const upsertDoc = useServerFn(upsertDocCheckDocument);
  const deleteDoc = useServerFn(deleteDocCheckDocument);
  const upsertLink = useServerFn(upsertDocCheckLink);
  const deleteLink = useServerFn(deleteDocCheckLink);

  const [country, setCountry] = useState<DocCheckCountry | null>(null);
  const [sections, setSections] = useState<DocCheckSection[]>([]);
  const [documents, setDocuments] = useState<DocCheckDocument[]>([]);
  const [links, setLinks] = useState<DocCheckLink[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    try {
      // Admin can see unpublished — call getDocCheckCountry which respects RLS
      // (admin policy grants full read).
      const data = await getFn({ data: { code } });
      if (data) {
        setCountry(data.country);
        setSections(data.sections);
        setDocuments(data.documents);
        setLinks(data.links);
      } else {
        setCountry(null);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Load failed");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (loading || !country) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading country…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Country meta */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">{country.flag_emoji}</span>
            {country.name}
            {!country.is_published && <Badge variant="outline">Draft</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Field label="Name">
            <Input
              value={country.name}
              onChange={(e) => setCountry({ ...country, name: e.target.value })}
            />
          </Field>
          <Field label="Flag emoji">
            <Input
              value={country.flag_emoji}
              onChange={(e) => setCountry({ ...country, flag_emoji: e.target.value })}
            />
          </Field>
          <Field label="Region">
            <Input
              value={country.region}
              onChange={(e) => setCountry({ ...country, region: e.target.value })}
            />
          </Field>
          <Field label="Slug (URL)">
            <Input
              value={country.slug}
              onChange={(e) => setCountry({ ...country, slug: e.target.value })}
            />
          </Field>
          <Field label="Currency">
            <Input
              value={country.currency ?? ""}
              onChange={(e) => setCountry({ ...country, currency: e.target.value })}
            />
          </Field>
          <Field label="Drives on (left/right)">
            <Input
              value={country.drives_on ?? ""}
              onChange={(e) => setCountry({ ...country, drives_on: e.target.value })}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Summary">
              <Textarea
                rows={2}
                value={country.summary ?? ""}
                onChange={(e) => setCountry({ ...country, summary: e.target.value })}
              />
            </Field>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={country.is_published}
              onCheckedChange={(v) => setCountry({ ...country, is_published: v })}
            />
            <span className="text-sm">Published (publicly visible)</span>
          </div>
          <div className="flex justify-end md:col-span-2">
            <Button
              onClick={async () => {
                try {
                  await upsertCountry({
                    data: {
                      code: country.code,
                      name: country.name,
                      flag_emoji: country.flag_emoji,
                      region: country.region,
                      slug: country.slug,
                      summary: country.summary,
                      currency: country.currency,
                      drives_on: country.drives_on,
                      sort_order: country.sort_order,
                      is_published: country.is_published,
                    },
                  });
                  toast.success("Country saved");
                  await refreshList();
                } catch (e: any) {
                  toast.error(e.message ?? "Failed");
                }
              }}
            >
              <Save className="h-4 w-4" /> Save country
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
      <SectionsEditor
        countryCode={country.code}
        sections={sections}
        setSections={setSections}
        upsertSection={upsertSection}
        deleteSection={deleteSection}
        onChanged={reload}
      />

      {/* Documents */}
      <DocumentsEditor
        countryCode={country.code}
        documents={documents}
        setDocuments={setDocuments}
        upsertDoc={upsertDoc}
        deleteDoc={deleteDoc}
        onChanged={reload}
      />

      {/* Links */}
      <LinksEditor
        countryCode={country.code}
        links={links}
        setLinks={setLinks}
        upsertLink={upsertLink}
        deleteLink={deleteLink}
        onChanged={reload}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function SectionsEditor({
  countryCode,
  sections,
  setSections,
  upsertSection,
  deleteSection,
  onChanged,
}: {
  countryCode: string;
  sections: DocCheckSection[];
  setSections: (s: DocCheckSection[]) => void;
  upsertSection: ReturnType<typeof useServerFn<typeof upsertDocCheckSection>>;
  deleteSection: ReturnType<typeof useServerFn<typeof deleteDocCheckSection>>;
  onChanged: () => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<Record<string, Partial<DocCheckSection>>>({});
  const updateDraft = (id: string, patch: Partial<DocCheckSection>) =>
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Sections</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            try {
              await upsertSection({
                data: {
                  country_code: countryCode,
                  kind: "quick_guide",
                  title: "New section",
                  body_md: "",
                  sort_order: (sections.at(-1)?.sort_order ?? 0) + 10,
                  is_published: true,
                },
              });
              await onChanged();
            } catch (e: any) {
              toast.error(e.message ?? "Failed");
            }
          }}
        >
          <Plus className="h-3.5 w-3.5" /> Add section
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {sections.length === 0 && (
          <p className="text-sm text-muted-foreground">No sections yet.</p>
        )}
        {sections.map((s) => {
          const draft = { ...s, ...drafts[s.id] };
          return (
            <div key={s.id} className="rounded-lg border border-border p-3">
              <div className="grid gap-2 md:grid-cols-[160px_1fr_120px_auto]">
                <Select
                  value={draft.kind}
                  onValueChange={(v: any) => updateDraft(s.id, { kind: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTION_KINDS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={draft.title}
                  onChange={(e) => updateDraft(s.id, { title: e.target.value })}
                />
                <Input
                  type="number"
                  value={draft.sort_order}
                  onChange={(e) =>
                    updateDraft(s.id, { sort_order: Number(e.target.value) })
                  }
                />
                <div className="flex items-center gap-2">
                  <Switch
                    checked={draft.is_published}
                    onCheckedChange={(v) => updateDraft(s.id, { is_published: v })}
                  />
                  <span className="text-xs">Live</span>
                </div>
              </div>
              <Textarea
                className="mt-2 font-mono text-xs"
                rows={10}
                value={draft.body_md}
                onChange={(e) => updateDraft(s.id, { body_md: e.target.value })}
              />
              <div className="mt-2 flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    if (!confirm("Delete this section?")) return;
                    try {
                      await deleteSection({ data: { id: s.id } });
                      await onChanged();
                    } catch (e: any) {
                      toast.error(e.message ?? "Failed");
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      await upsertSection({
                        data: {
                          id: s.id,
                          country_code: countryCode,
                          kind: draft.kind as any,
                          title: draft.title,
                          body_md: draft.body_md,
                          sort_order: draft.sort_order,
                          is_published: draft.is_published,
                        },
                      });
                      toast.success("Saved");
                      await onChanged();
                      setDrafts((d) => {
                        const copy = { ...d };
                        delete copy[s.id];
                        return copy;
                      });
                    } catch (e: any) {
                      toast.error(e.message ?? "Failed");
                    }
                  }}
                >
                  <Save className="h-4 w-4" /> Save
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function DocumentsEditor({
  countryCode,
  documents,
  setDocuments: _setDocuments,
  upsertDoc,
  deleteDoc,
  onChanged,
}: {
  countryCode: string;
  documents: DocCheckDocument[];
  setDocuments: (d: DocCheckDocument[]) => void;
  upsertDoc: ReturnType<typeof useServerFn<typeof upsertDocCheckDocument>>;
  deleteDoc: ReturnType<typeof useServerFn<typeof deleteDocCheckDocument>>;
  onChanged: () => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<Record<string, Partial<DocCheckDocument>>>({});
  const updateDraft = (id: string, patch: Partial<DocCheckDocument>) =>
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Document reference</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            const code = prompt("Document code (e.g. or_cr)")?.trim();
            if (!code) return;
            try {
              await upsertDoc({
                data: {
                  country_code: countryCode,
                  code,
                  name: "New document",
                  description_md: "",
                  sort_order: (documents.at(-1)?.sort_order ?? 0) + 10,
                },
              });
              await onChanged();
            } catch (e: any) {
              toast.error(e.message ?? "Failed");
            }
          }}
        >
          <Plus className="h-3.5 w-3.5" /> Add document
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {documents.length === 0 && (
          <p className="text-sm text-muted-foreground">No documents yet.</p>
        )}
        {documents.map((d) => {
          const draft = { ...d, ...drafts[d.id] };
          return (
            <div key={d.id} className="rounded-lg border border-border p-3">
              <div className="grid gap-2 md:grid-cols-2">
                <Field label="Code">
                  <Input
                    value={draft.code}
                    onChange={(e) => updateDraft(d.id, { code: e.target.value })}
                  />
                </Field>
                <Field label="Name">
                  <Input
                    value={draft.name}
                    onChange={(e) => updateDraft(d.id, { name: e.target.value })}
                  />
                </Field>
                <Field label="Who issues">
                  <Input
                    value={draft.who_issues ?? ""}
                    onChange={(e) => updateDraft(d.id, { who_issues: e.target.value })}
                  />
                </Field>
                <Field label="Typical cost">
                  <Input
                    value={draft.typical_cost ?? ""}
                    onChange={(e) => updateDraft(d.id, { typical_cost: e.target.value })}
                  />
                </Field>
                <Field label="Validity">
                  <Input
                    value={draft.validity ?? ""}
                    onChange={(e) => updateDraft(d.id, { validity: e.target.value })}
                  />
                </Field>
                <Field label="Sort order">
                  <Input
                    type="number"
                    value={draft.sort_order}
                    onChange={(e) =>
                      updateDraft(d.id, { sort_order: Number(e.target.value) })
                    }
                  />
                </Field>
              </div>
              <Field label="Description (markdown)">
                <Textarea
                  className="mt-1 font-mono text-xs"
                  rows={4}
                  value={draft.description_md}
                  onChange={(e) =>
                    updateDraft(d.id, { description_md: e.target.value })
                  }
                />
              </Field>
              <div className="mt-2 flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    if (!confirm("Delete document?")) return;
                    try {
                      await deleteDoc({ data: { id: d.id } });
                      await onChanged();
                    } catch (e: any) {
                      toast.error(e.message ?? "Failed");
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      await upsertDoc({
                        data: {
                          id: d.id,
                          country_code: countryCode,
                          code: draft.code,
                          name: draft.name,
                          description_md: draft.description_md ?? "",
                          who_issues: draft.who_issues,
                          typical_cost: draft.typical_cost,
                          validity: draft.validity,
                          sort_order: draft.sort_order,
                        },
                      });
                      toast.success("Saved");
                      await onChanged();
                    } catch (e: any) {
                      toast.error(e.message ?? "Failed");
                    }
                  }}
                >
                  <Save className="h-4 w-4" /> Save
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function LinksEditor({
  countryCode,
  links,
  setLinks: _setLinks,
  upsertLink,
  deleteLink,
  onChanged,
}: {
  countryCode: string;
  links: DocCheckLink[];
  setLinks: (l: DocCheckLink[]) => void;
  upsertLink: ReturnType<typeof useServerFn<typeof upsertDocCheckLink>>;
  deleteLink: ReturnType<typeof useServerFn<typeof deleteDocCheckLink>>;
  onChanged: () => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<Record<string, Partial<DocCheckLink>>>({});
  const updateDraft = (id: string, patch: Partial<DocCheckLink>) =>
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Agency links</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            const label = prompt("Label")?.trim();
            const url = prompt("URL (https://...)")?.trim();
            if (!label || !url) return;
            try {
              await upsertLink({
                data: {
                  country_code: countryCode,
                  label,
                  url,
                  sort_order: (links.at(-1)?.sort_order ?? 0) + 10,
                },
              });
              await onChanged();
            } catch (e: any) {
              toast.error(e.message ?? "Failed");
            }
          }}
        >
          <Plus className="h-3.5 w-3.5" /> Add link
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {links.length === 0 && (
          <p className="text-sm text-muted-foreground">No links yet.</p>
        )}
        {links.map((l) => {
          const draft = { ...l, ...drafts[l.id] };
          return (
            <div
              key={l.id}
              className="grid items-center gap-2 rounded-md border border-border p-2 md:grid-cols-[1fr_2fr_140px_80px_auto]"
            >
              <Input
                placeholder="Label"
                value={draft.label}
                onChange={(e) => updateDraft(l.id, { label: e.target.value })}
              />
              <Input
                placeholder="URL"
                value={draft.url}
                onChange={(e) => updateDraft(l.id, { url: e.target.value })}
              />
              <Select
                value={draft.section_kind ?? "all"}
                onValueChange={(v) =>
                  updateDraft(l.id, { section_kind: v === "all" ? null : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sections</SelectItem>
                  {SECTION_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={draft.sort_order}
                onChange={(e) =>
                  updateDraft(l.id, { sort_order: Number(e.target.value) })
                }
              />
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    if (!confirm("Delete link?")) return;
                    try {
                      await deleteLink({ data: { id: l.id } });
                      await onChanged();
                    } catch (e: any) {
                      toast.error(e.message ?? "Failed");
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      await upsertLink({
                        data: {
                          id: l.id,
                          country_code: countryCode,
                          section_kind: draft.section_kind,
                          label: draft.label,
                          url: draft.url,
                          sort_order: draft.sort_order,
                        },
                      });
                      toast.success("Saved");
                      await onChanged();
                    } catch (e: any) {
                      toast.error(e.message ?? "Failed");
                    }
                  }}
                >
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
