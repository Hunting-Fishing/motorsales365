import { useId, useLayoutEffect, useRef, useState } from "react";
import { Search, ArrowRightLeft, ShieldCheck, ShieldAlert } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { searchTransferableUsers } from "@/lib/admin-users.functions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
type Flight = { controller: AbortController; epoch: object };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const searchFailure = "Could not search users. Try again.";
const transferFailure =
  "Transfer was not confirmed. The outcome may be unknown. Refresh business details before trying again.";
const sameId = (left: string, right: string) => left.toLowerCase() === right.toLowerCase();

function searchRows(value: unknown): ProfileHit[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(searchFailure);
  const rows = Reflect.get(value, "rows");
  if (!Array.isArray(rows) || rows.length > 20) throw new Error(searchFailure);
  const ids = new Set<string>();
  return rows.map((row: unknown) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error(searchFailure);
    const id: unknown = Reflect.get(row, "id");
    if (typeof id !== "string" || !uuid.test(id) || ids.has(id.toLowerCase()))
      throw new Error(searchFailure);
    ids.add(id.toLowerCase());
    const nullable = (field: string) => {
      const item: unknown = Reflect.get(row, field);
      if (item !== null && typeof item !== "string") throw new Error(searchFailure);
      return item;
    };
    return {
      id,
      full_name: nullable("full_name"),
      business_name: nullable("business_name"),
      signup_intent: nullable("signup_intent"),
      email: nullable("email"),
      email_confirmed_at: nullable("email_confirmed_at"),
    };
  });
}
function confirmsOwner(value: unknown, businessId: string, newOwnerId: string) {
  if (!Array.isArray(value) || value.length !== 1) return false;
  const row: unknown = value[0];
  if (!row || typeof row !== "object" || Array.isArray(row)) return false;
  if (Object.keys(row).sort().join(",") !== "id,owner_id") return false;
  const id: unknown = Reflect.get(row, "id");
  const owner: unknown = Reflect.get(row, "owner_id");
  return (
    typeof id === "string" &&
    uuid.test(id) &&
    sameId(id, businessId) &&
    typeof owner === "string" &&
    uuid.test(owner) &&
    sameId(owner, newOwnerId)
  );
}

export function TransferBusinessOwnerDialog(props: Props) {
  const { user, loading } = useAuth();
  if (!props.open || loading || !user?.id || !uuid.test(user.id)) return null;
  // Every observed account/target/prior-owner/open transition creates a new
  // private form, including A -> B -> A. Client fences are not DB authority.
  return (
    <TransferSession
      key={JSON.stringify([user.id, props.businessId, props.currentOwnerId])}
      {...props}
    />
  );
}
function TransferSession(props: Props) {
  const [closed, setClosed] = useState(false);
  if (closed) return null;
  return (
    <TransferForm
      {...props}
      onClose={() => {
        setClosed(true);
        props.onOpenChange(false);
      }}
    />
  );
}
function TransferForm({
  businessId,
  businessName,
  currentOwnerId,
  onTransferred,
  onClose,
}: Props & { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ProfileHit[]>([]);
  const [selected, setSelected] = useState<ProfileHit | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [includeUnverified, setIncludeUnverified] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const runSearch = useServerFn(searchTransferableUsers);
  const searchId = useId();
  const lifecycle = useRef({ alive: false, epoch: {} });
  const searchFlight = useRef<Flight | null>(null);
  const transferFlight = useRef<Flight | null>(null);
  const visibleResults = useRef<ProfileHit[]>([]);
  const selectedHit = useRef<ProfileHit | null>(null);
  const validTarget =
    uuid.test(businessId) && (currentOwnerId === null || uuid.test(currentOwnerId));
  const alive = () => lifecycle.current.alive;
  const current = (flight: Flight, slot: { current: Flight | null }) =>
    alive() &&
    lifecycle.current.epoch === flight.epoch &&
    slot.current === flight &&
    !flight.controller.signal.aborted;
  const invalidate = () => {
    lifecycle.current.alive = false;
    lifecycle.current.epoch = {};
    searchFlight.current?.controller.abort();
    transferFlight.current?.controller.abort();
    searchFlight.current = null;
    transferFlight.current = null;
    visibleResults.current = [];
    selectedHit.current = null;
  };
  useLayoutEffect(() => {
    const scope = lifecycle.current;
    scope.alive = true;
    scope.epoch = {};
    // StrictMode cleanup/setup cannot revive an old pending flight.
    return () => {
      scope.alive = false;
      scope.epoch = {};
      searchFlight.current?.controller.abort();
      transferFlight.current?.controller.abort();
      searchFlight.current = null;
      transferFlight.current = null;
      visibleResults.current = [];
      selectedHit.current = null;
    };
  }, []);
  const clearSearch = () => {
    searchFlight.current?.controller.abort();
    searchFlight.current = null;
    visibleResults.current = [];
    selectedHit.current = null;
    setSearching(false);
    setResults([]);
    setSelected(null);
  };
  const close = () => {
    if (!alive()) return;
    invalidate(); // synchronous, even when the parent ignores onOpenChange
    onClose();
  };
  const search = async () => {
    const text = query.trim();
    if (!alive() || !validTarget || transferFlight.current || !text || text.length > 200) return;
    clearSearch();
    const flight = { controller: new AbortController(), epoch: lifecycle.current.epoch };
    searchFlight.current = flight;
    setSearching(true);
    try {
      if (!current(flight, searchFlight)) return;
      const raw = await runSearch({
        data: { query: text, includeUnverified },
        signal: flight.controller.signal,
      });
      if (!current(flight, searchFlight)) return;
      const rows = searchRows(raw);
      if (!current(flight, searchFlight)) return;
      visibleResults.current = rows;
      setResults(rows);
    } catch {
      if (current(flight, searchFlight)) {
        visibleResults.current = [];
        setResults([]);
        toast.error(searchFailure);
      }
    } finally {
      if (current(flight, searchFlight)) {
        searchFlight.current = null;
        setSearching(false);
      }
    }
  };
  const transfer = async () => {
    const choice = selectedHit.current;
    if (!alive() || !validTarget || transferFlight.current || unconfirmed || !choice) return;
    const newOwnerId = choice.id; // immutable dispatch snapshot, not post-await selection
    if (!uuid.test(newOwnerId) || (currentOwnerId !== null && sameId(newOwnerId, currentOwnerId)))
      return;
    searchFlight.current?.controller.abort();
    searchFlight.current = null;
    setSearching(false);
    const flight = { controller: new AbortController(), epoch: lifecycle.current.epoch };
    transferFlight.current = flight; // one-flight before await/state flush
    setSubmitting(true);
    let confirmed = false;
    try {
      if (!current(flight, transferFlight)) return;
      // Existing browser/table RLS remains the authority. Comparing the displayed
      // prior owner avoids overwriting a different current value, but is not an
      // audited/atomic migration of ownership, staff or related access.
      let request = supabase
        .from("businesses")
        .update({ owner_id: newOwnerId })
        .eq("id", businessId);
      request =
        currentOwnerId === null
          ? request.is("owner_id", null)
          : request.eq("owner_id", currentOwnerId);
      const { data, error } = await request
        .select("id,owner_id")
        .abortSignal(flight.controller.signal);
      if (!current(flight, transferFlight)) return;
      if (error || !confirmsOwner(data, businessId, newOwnerId)) throw new Error(transferFailure);
      confirmed = true;
      if (!current(flight, transferFlight)) return;
      toast.success("Business owner row update confirmed.");
      try {
        if (current(flight, transferFlight)) onTransferred?.();
      } finally {
        // A consumer callback failure must not leave a confirmed old-owner form
        // resubmittable. A callback scope change must not close the new form.
        if (current(flight, transferFlight)) close();
      }
    } catch {
      if (current(flight, transferFlight)) {
        if (confirmed) {
          toast.error("Owner update confirmed. Refresh business details to continue.");
          if (current(flight, transferFlight)) close();
        } else {
          setUnconfirmed(true);
          toast.error(transferFailure);
        }
      }
    } finally {
      if (current(flight, transferFlight)) {
        transferFlight.current = null;
        setSubmitting(false);
      }
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Transfer owner — {businessName}</DialogTitle>
          <DialogDescription>
            Search by name, business name, or user ID. Current owner:{" "}
            <code className="text-xs">{currentOwnerId ?? "none"}</code>
          </DialogDescription>
        </DialogHeader>
        {!validTarget && <p role="alert">Owner transfer is unavailable for this business.</p>}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void search();
          }}
          aria-label="Search transferable users"
        >
          <fieldset disabled={submitting || !validTarget} className="space-y-3">
            <label htmlFor={searchId} className="text-sm font-medium">
              Find a new owner
            </label>
            <div className="flex gap-2">
              <Input
                id={searchId}
                placeholder="Search users…"
                value={query}
                maxLength={200}
                onChange={(event) => {
                  if (!alive() || transferFlight.current) return;
                  clearSearch();
                  setQuery(event.target.value);
                }}
              />
              <Button type="submit" disabled={searching || !query.trim()}>
                <Search aria-hidden="true" className="mr-1 h-4 w-4" />
                {searching ? "Searching…" : "Search"}
              </Button>
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={includeUnverified}
                onCheckedChange={(value) => {
                  if (!alive() || transferFlight.current) return;
                  clearSearch();
                  setIncludeUnverified(value === true);
                }}
              />
              Include users whose email is not confirmed
            </label>
          </fieldset>
        </form>
        <div className="max-h-72 overflow-auto rounded-md border" aria-busy={searching}>
          {results.length === 0 ? (
            <p className="p-3 text-center text-xs text-muted-foreground">
              {searching ? "Searching…" : "No matching users in this search."}
            </p>
          ) : (
            <ul aria-label="Transferable users" className="divide-y">
              {results.map((profile) => {
                const isCurrent = currentOwnerId !== null && sameId(profile.id, currentOwnerId);
                const isSelected = selected?.id === profile.id;
                const verified = Boolean(profile.email_confirmed_at);
                return (
                  <li key={profile.id}>
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      disabled={submitting || unconfirmed}
                      className={
                        "flex w-full items-center justify-between gap-2 p-3 text-left hover:bg-muted/50 " +
                        (isSelected ? "bg-muted" : "")
                      }
                      onClick={() => {
                        if (
                          !alive() ||
                          transferFlight.current ||
                          unconfirmed ||
                          !visibleResults.current.includes(profile)
                        )
                          return;
                        selectedHit.current = profile;
                        setSelected(profile);
                      }}
                    >
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 truncate text-sm font-medium">
                          {profile.full_name || profile.business_name || "(no name)"}
                          <Badge variant={verified ? "secondary" : "destructive"} className="gap-1">
                            {verified ? (
                              <ShieldCheck aria-hidden="true" className="h-3 w-3" />
                            ) : (
                              <ShieldAlert aria-hidden="true" className="h-3 w-3" />
                            )}
                            {verified ? "Email confirmed" : "Email not confirmed"}
                          </Badge>
                          {isCurrent && <Badge variant="secondary">Current owner</Badge>}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {profile.email ? profile.email + " · " : ""}
                          {profile.business_name && profile.full_name
                            ? profile.business_name + " · "
                            : ""}
                          {profile.signup_intent || "user"} · {profile.id}
                        </span>
                      </span>
                      {isSelected && <Badge>Selected</Badge>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {unconfirmed && (
          <p role="alert" className="text-sm text-destructive">
            {transferFailure}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Confirmation covers the returned business owner row only, not staff or related access. If
          the response is interrupted, the change may still have been applied. Refresh business
          details before retrying.
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              void transfer();
            }}
            disabled={
              !validTarget ||
              !selected ||
              submitting ||
              unconfirmed ||
              (currentOwnerId !== null && selected !== null && sameId(selected.id, currentOwnerId))
            }
          >
            <ArrowRightLeft aria-hidden="true" className="mr-1 h-4 w-4" />
            {submitting ? "Transferring…" : "Transfer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
