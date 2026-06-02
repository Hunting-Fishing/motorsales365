import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, MessageSquareWarning, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/verifications")({
  component: AdminVerifications,
});

const KIND_LABEL: Record<string, string> = {
  repair_shop: "Repair shop",
  insurance: "Insurance",
  dealer: "Dealership",
  other: "Other",
};

function AdminVerifications() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [tab, setTab] = useState("pending");
  const [selected, setSelected] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [docUrls, setDocUrls] = useState<{ name: string; url: string }[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from("verification_requests")
      .select("*, profiles:user_id(full_name, business_name, avatar_url)")
      .order("submitted_at", { ascending: false });
    setRequests(data ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selected) {
      setDocUrls([]);
      return;
    }
    const loadUrls = async () => {
      const docs = (selected.documents ?? []) as { path: string; name: string }[];
      const urls = await Promise.all(
        docs.map(async (d) => {
          const { data } = await supabase.storage
            .from("verification-docs")
            .createSignedUrl(d.path, 300);
          return { name: d.name, url: data?.signedUrl ?? "" };
        }),
      );
      setDocUrls(urls);
    };
    loadUrls();
    setReviewNotes(selected.review_notes ?? "");
  }, [selected]);

  const decide = async (status: "approved" | "rejected" | "more_info") => {
    if (!selected || !user) return;
    const { error } = await supabase
      .from("verification_requests")
      .update({
        status,
        review_notes: reviewNotes.trim() || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", selected.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      status === "approved"
        ? "Approved"
        : status === "rejected"
          ? "Rejected"
          : "Requested more info",
    );
    setSelected(null);
    load();
  };

  const filtered = requests.filter((r) => {
    if (tab === "pending") return r.status === "pending";
    if (tab === "more_info") return r.status === "more_info";
    if (tab === "approved") return r.status === "approved";
    if (tab === "rejected") return r.status === "rejected";
    return true;
  });

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold">Verifications</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending{" "}
            {requests.filter((r) => r.status === "pending").length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {requests.filter((r) => r.status === "pending").length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="more_info">More info</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
            <div className="space-y-2">
              {filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
                  No requests in this state.
                </div>
              ) : (
                filtered.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelected(r)}
                    className={`flex w-full flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary ${selected?.id === r.id ? "border-primary" : "border-border"}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{r.legal_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {KIND_LABEL[r.business_kind]} · submitted {formatDate(r.submitted_at)}
                      </div>
                    </div>
                    <StatusBadge status={r.status} />
                  </button>
                ))
              )}
            </div>

            <aside className="rounded-xl border border-border bg-card p-5 lg:sticky lg:top-20 lg:self-start">
              {!selected ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Select a request to review.
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">
                      {KIND_LABEL[selected.business_kind]}
                    </div>
                    <div className="font-display text-lg font-semibold">{selected.legal_name}</div>
                    <StatusBadge status={selected.status} />
                  </div>

                  <DetailRow
                    label="Submitted by"
                    value={
                      selected.profiles?.business_name ??
                      selected.profiles?.full_name ??
                      selected.user_id
                    }
                  />
                  <DetailRow label="DTI/SEC #" value={selected.dti_sec_registration} />
                  <DetailRow label="Tax ID" value={selected.tax_id} />
                  <DetailRow label="Phone" value={selected.contact_phone} />
                  <DetailRow label="Email" value={selected.contact_email} />
                  <DetailRow
                    label="Address"
                    value={[selected.address, selected.city, selected.region]
                      .filter(Boolean)
                      .join(", ")}
                  />

                  <div>
                    <div className="mb-1 text-xs font-medium text-muted-foreground">Documents</div>
                    {docUrls.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No documents</div>
                    ) : (
                      <ul className="space-y-1">
                        {docUrls.map((d, i) => (
                          <li key={i}>
                            <a
                              href={d.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                            >
                              <FileText className="h-4 w-4" />
                              {d.name}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <Label>Review notes (visible to applicant)</Label>
                    <Textarea
                      rows={3}
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Reason or details…"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => decide("approved")}>
                      <CheckCircle2 className="mr-1 h-4 w-4" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => decide("more_info")}>
                      <MessageSquareWarning className="mr-1 h-4 w-4" /> Request info
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => decide("rejected")}>
                      <XCircle className="mr-1 h-4 w-4" /> Reject
                    </Button>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: any }) {
  if (!value) return null;
  return (
    <div className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: any; label: string }> = {
    pending: { variant: "secondary", label: "Pending" },
    more_info: { variant: "outline", label: "More info" },
    approved: { variant: "default", label: "Approved" },
    rejected: { variant: "destructive", label: "Rejected" },
  };
  const m = map[status] ?? map.pending;
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
