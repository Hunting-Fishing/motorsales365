import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Inbox, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/admin/qr-leads")({
  component: QrLeadsAdmin,
  head: () => ({
    meta: [
      { title: "QR Leads — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type QrLead = {
  id: string;
  referral_code: string | null;
  name: string;
  contact: string;
  interest_type: string;
  interest_detail: string | null;
  status: "new" | "contacted" | "qualified" | "closed" | "archived";
  notes: string | null;
  landing_url: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
};

const INTEREST_LABELS: Record<string, string> = {
  buying_vehicle: "Buying vehicle",
  selling_vehicle: "Selling vehicle",
  business_listing: "Business listing",
  parts: "Parts",
  services: "Services",
  other: "Other",
};

const STATUSES: QrLead["status"][] = ["new", "contacted", "qualified", "closed", "archived"];

function QrLeadsAdmin() {
  const [leads, setLeads] = useState<QrLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("qr_lead_captures" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      toast.error(error.message);
    } else {
      setLeads((data ?? []) as unknown as QrLead[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return leads.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (!needle) return true;
      return (
        l.name.toLowerCase().includes(needle) ||
        l.contact.toLowerCase().includes(needle) ||
        (l.referral_code ?? "").toLowerCase().includes(needle) ||
        (l.interest_detail ?? "").toLowerCase().includes(needle)
      );
    });
  }, [leads, q, statusFilter]);

  const updateLead = async (id: string, patch: Partial<QrLead>) => {
    const { error } = await supabase
      .from("qr_lead_captures" as never)
      .update(patch as never)
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    toast.success("Updated");
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <Inbox className="h-6 w-6" /> QR Landing Leads
        </h1>
        <p className="text-sm text-muted-foreground">
          Leads submitted from the QR scan landing page form.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, contact, referral code, details…"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Interest</TableHead>
              <TableHead>QR code</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                  No leads yet.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((l) => (
                <>
                  <TableRow
                    key={l.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => setExpanded(expanded === l.id ? null : l.id)}
                  >
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell className="font-mono text-xs">{l.contact}</TableCell>
                    <TableCell>{INTEREST_LABELS[l.interest_type] ?? l.interest_type}</TableCell>
                    <TableCell className="font-mono text-xs">{l.referral_code ?? "—"}</TableCell>
                    <TableCell>
                      <Select
                        value={l.status}
                        onValueChange={(v) =>
                          updateLead(l.id, { status: v as QrLead["status"] })
                        }
                      >
                        <SelectTrigger
                          className="h-8 w-32"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                  {expanded === l.id && (
                    <TableRow key={l.id + "-x"}>
                      <TableCell colSpan={6} className="bg-muted/30">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Details
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm">
                              {l.interest_detail || (
                                <span className="text-muted-foreground italic">
                                  (none provided)
                                </span>
                              )}
                            </p>
                            {l.landing_url && (
                              <p className="mt-2 text-xs text-muted-foreground break-all">
                                Landed on: {l.landing_url}
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Internal notes
                            </p>
                            <Textarea
                              defaultValue={l.notes ?? ""}
                              rows={3}
                              className="mt-1"
                              onBlur={(e) => {
                                const v = e.target.value;
                                if (v !== (l.notes ?? "")) updateLead(l.id, { notes: v });
                              }}
                            />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
