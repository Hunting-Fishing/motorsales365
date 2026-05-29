import { useState } from "react";
import { Search, ArrowRightLeft, ShieldCheck, ShieldAlert } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { searchTransferableUsers } from "@/lib/admin-users.functions";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  businessName: string;
  currentOwnerId: string | null;
  onTransferred?: () => void;
};

type ProfileHit = {
  id: string;
  full_name: string | null;
  business_name: string | null;
  signup_intent: string | null;
  email: string | null;
  email_confirmed_at: string | null;
};

export function TransferBusinessOwnerDialog({
  open, onOpenChange, businessId, businessName, currentOwnerId, onTransferred,
}: Props) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ProfileHit[]>([]);
  const [selected, setSelected] = useState<ProfileHit | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [includeUnverified, setIncludeUnverified] = useState(false);
  const runSearch = useServerFn(searchTransferableUsers);

  const reset = () => {
    setQuery(""); setResults([]); setSelected(null);
  };

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSelected(null);
    try {
      const { rows } = await runSearch({ data: { query: q, includeUnverified } });
      setResults(rows ?? []);
    } catch (e: any) {
      toast.error(e?.message ?? "Search failed");
      setResults([]);
    }
    setSearching(false);
  };

  const transfer = async () => {
    if (!selected) return;
    if (selected.id === currentOwnerId) {
      toast.error("Already owned by this user");
      return;
    }
    setSubmitting(true);
    const { error } = await (supabase as any)
      .from("businesses")
      .update({ owner_id: selected.id })
      .eq("id", businessId);
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Transferred "${businessName}" to ${selected.full_name || selected.business_name || selected.id}`);
    reset();
    onOpenChange(false);
    onTransferred?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Transfer owner — {businessName}</DialogTitle>
          <DialogDescription>
            Search by name, business name, or paste a user ID (UUID).
            Current owner:{" "}
            <code className="text-xs">{currentOwnerId ?? "none"}</code>
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            placeholder="Search users…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") search(); }}
          />
          <Button onClick={search} disabled={searching || !query.trim()}>
            <Search className="mr-1 h-4 w-4" />
            {searching ? "Searching…" : "Search"}
          </Button>
        </div>

        <div className="max-h-72 overflow-auto rounded-md border">
          {results.length === 0 ? (
            <div className="p-3 text-center text-xs text-muted-foreground">
              {searching ? "Searching…" : "No results yet"}
            </div>
          ) : (
            <ul className="divide-y">
              {results.map((p) => {
                const isCurrent = p.id === currentOwnerId;
                const isSelected = selected?.id === p.id;
                return (
                  <li
                    key={p.id}
                    className={`flex cursor-pointer items-center justify-between gap-2 p-3 hover:bg-muted/50 ${isSelected ? "bg-muted" : ""}`}
                    onClick={() => setSelected(p)}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {p.full_name || p.business_name || "(no name)"}
                        {isCurrent && <Badge variant="secondary" className="ml-2">Current owner</Badge>}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {p.business_name && p.full_name ? p.business_name + " · " : ""}
                        {p.signup_intent || "user"} · {p.id}
                      </div>
                    </div>
                    {isSelected && <Badge>Selected</Badge>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={transfer} disabled={!selected || submitting || selected?.id === currentOwnerId}>
            <ArrowRightLeft className="mr-1 h-4 w-4" />
            {submitting ? "Transferring…" : "Transfer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
