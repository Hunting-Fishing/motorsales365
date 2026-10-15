import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, MessageSquare, Trash2, MoveRight, ShieldCheck } from "lucide-react";
import { StaffChatDialog } from "@/components/internal-staff/StaffChatDialog";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  listInternalStaff,
  createInternalStaff,
  updateStaffManager,
  deactivateInternalStaff,
  type InternalStaffMember,
} from "@/lib/internal-staff.functions";
import { Staff365Badge } from "@/components/admin/staff-365-badge";
import { useAuth } from "@/hooks/use-auth";
import {
  managerChangeConfirmed,
  signInRestrictionConfirmed,
  staffCreationAckSchema,
  STAFF_CHANGE_UNCONFIRMED,
  STAFF_DIRECTORY_UNAVAILABLE,
  STAFF_CREATION_UNKNOWN,
  STAFF_CREATION_ACKNOWLEDGED,
  STAFF_SIGN_IN_ACKNOWLEDGED,
} from "@/lib/internal-staff-contract";

function useMounted() {
  const active = useRef(true);
  useLayoutEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  return active;
}

type Node = InternalStaffMember & { children: Node[] };

function buildTree(members: InternalStaffMember[]): Node[] {
  const byId = new Map<string, Node>();
  members.forEach((m) => byId.set(m.user_id, { ...m, children: [] }));
  const roots: Node[] = [];
  byId.forEach((node) => {
    if (node.manager_user_id && byId.has(node.manager_user_id)) {
      byId.get(node.manager_user_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

type StaffViewProps = {
  currentUserId: string;
  isAdmin: boolean;
  variant?: "tree" | "list";
};

export function InternalStaffView(props: StaffViewProps) {
  const { user, loading } = useAuth();
  if (loading || !user || user.id !== props.currentUserId)
    return (
      <div role="status" className="p-6 text-muted-foreground">
        Sign in to view the internal team.
      </div>
    );
  // Unmount private forms/pending UI callbacks across account/admin context,
  // including A-to-B-to-A. This is not server authorization or request rollback.
  return <ScopedStaffView key={user.id} {...props} />;
}

function ScopedStaffView(props: StaffViewProps) {
  const [creationLocked, setCreationLocked] = useState(false);
  // Keep unknown-creation custody across an admin-context change or refresh,
  // while remounting the private directory and its pending callbacks.
  return (
    <StaffDirectory
      key={String(props.isAdmin)}
      {...props}
      creationLocked={creationLocked}
      onCreationStarted={() => setCreationLocked(true)}
      onCreationConfirmed={() => setCreationLocked(false)}
    />
  );
}

type CreationCustody = {
  creationLocked: boolean;
  onCreationStarted: () => void;
  onCreationConfirmed: () => void;
};
function StaffDirectory(props: StaffViewProps & CreationCustody) {
  const qc = useQueryClient();
  const fetchStaff = useServerFn(listInternalStaff);
  const queryKey = ["internal-staff", props.currentUserId, props.isAdmin];
  const result = useQuery({ queryKey, queryFn: () => fetchStaff(), staleTime: 0, gcTime: 0 });
  if (result.isLoading || result.isFetching)
    return (
      <div role="status" className="p-6 text-muted-foreground">
        Loading team…
      </div>
    );
  if (result.isError || !Array.isArray(result.data))
    return (
      <div role="alert" className="p-6">
        <p>{STAFF_DIRECTORY_UNAVAILABLE}</p>
        <Button onClick={() => void result.refetch()}>Retry team</Button>
      </div>
    );
  return (
    <StaffActions
      key={result.dataUpdatedAt}
      {...props}
      members={result.data}
      refresh={() => {
        void qc.invalidateQueries({ queryKey, exact: true });
      }}
    />
  );
}

function StaffActions({
  currentUserId,
  isAdmin,
  variant = "tree",
  members,
  refresh,
  creationLocked,
  onCreationStarted,
  onCreationConfirmed,
}: StaffViewProps &
  CreationCustody & {
    members: InternalStaffMember[];
    refresh: () => void;
  }) {
  const active = useMounted();
  const deactivatePending = useRef(false);
  const [deactivating, setDeactivating] = useState(false);
  const deactivateFn = useServerFn(deactivateInternalStaff);

  const roots = useMemo(() => buildTree(members), [members]);
  const [addOpen, setAddOpen] = useState<{ managerId: string } | null>(null);
  const [moveFor, setMoveFor] = useState<InternalStaffMember | null>(null);
  const [chatWith, setChatWith] = useState<InternalStaffMember | null>(null);

  const deactivate = async (uid: string) => {
    if (
      deactivatePending.current ||
      !active.current ||
      !window.confirm(
        "Restrict this account's sign-in? Existing sessions and related access will still need separate verification.",
      )
    )
      return;
    deactivatePending.current = true;
    setDeactivating(true);
    try {
      const ack = await deactivateFn({ data: { userId: uid } });
      if (!active.current) return;
      if (!signInRestrictionConfirmed(ack, uid)) throw new Error();
      toast.message(STAFF_SIGN_IN_ACKNOWLEDGED);
      refresh();
    } catch {
      if (active.current) toast.error(STAFF_CHANGE_UNCONFIRMED);
    } finally {
      if (active.current) {
        deactivatePending.current = false;
        setDeactivating(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Button
            disabled={creationLocked}
            onClick={() => setAddOpen({ managerId: currentUserId })}
          >
            <Plus className="mr-1 h-4 w-4" /> Add staff under me
          </Button>
        </div>
      )}
      {isAdmin && creationLocked && !addOpen && <p role="alert">{STAFF_CREATION_UNKNOWN}</p>}

      <Card className="p-4">
        {variant === "tree" ? (
          roots.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No team members yet.</div>
          ) : (
            <div className="space-y-1">
              {roots.map((r) => (
                <TreeRow
                  key={r.user_id}
                  node={r}
                  depth={0}
                  isAdmin={isAdmin}
                  currentUserId={currentUserId}
                  onAdd={(mid) => {
                    if (!creationLocked) setAddOpen({ managerId: mid });
                  }}
                  onMove={(m) => setMoveFor(m)}
                  onChat={(m) => setChatWith(m)}
                  onDeactivate={deactivate}
                  deactivating={deactivating}
                  creationLocked={creationLocked}
                />
              ))}
            </div>
          )
        ) : (
          <div className="divide-y">
            {members.map((m) => (
              <FlatRow
                key={m.user_id}
                m={m}
                members={members}
                isAdmin={isAdmin}
                currentUserId={currentUserId}
                onChat={() => setChatWith(m)}
                onMove={() => setMoveFor(m)}
                onDeactivate={() => void deactivate(m.user_id)}
                deactivating={deactivating}
              />
            ))}
          </div>
        )}
      </Card>

      {isAdmin && addOpen && (
        <AddDialog
          key={addOpen.managerId}
          managerId={addOpen.managerId}
          members={members}
          onClose={() => setAddOpen(null)}
          onCreated={refresh}
          creationLocked={creationLocked}
          onRequestStarted={onCreationStarted}
          onConfirmed={onCreationConfirmed}
        />
      )}
      {isAdmin && moveFor && (
        <MoveDialog
          key={moveFor.user_id}
          member={moveFor}
          members={members}
          onClose={() => setMoveFor(null)}
          onSaved={refresh}
        />
      )}
      {chatWith && (
        <StaffChatDialog
          open={!!chatWith}
          onOpenChange={(o) => !o && setChatWith(null)}
          otherUserId={chatWith.user_id}
          otherName={chatWith.full_name ?? chatWith.email ?? "Teammate"}
        />
      )}
    </div>
  );
}

function TreeRow({
  node,
  depth,
  isAdmin,
  currentUserId,
  onAdd,
  onMove,
  onChat,
  onDeactivate,
  deactivating,
  creationLocked,
}: {
  node: Node;
  depth: number;
  isAdmin: boolean;
  currentUserId: string;
  onAdd: (managerId: string) => void;
  onMove: (m: InternalStaffMember) => void;
  onChat: (m: InternalStaffMember) => void;
  onDeactivate: (userId: string) => void;
  deactivating: boolean;
  creationLocked: boolean;
}) {
  return (
    <>
      <div
        className="flex flex-wrap items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/40"
        style={{ paddingLeft: 8 + depth * 20 }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold truncate">{node.full_name ?? "—"}</span>
            {node.is_admin && <Badge variant="default">Admin</Badge>}
            {node.user_id === currentUserId && <Badge variant="outline">You</Badge>}
          </div>
          <div className="text-xs text-muted-foreground truncate">{node.email ?? "—"}</div>
        </div>
        <Staff365Badge size="xs" />
        {node.user_id !== currentUserId && (
          <Button size="sm" variant="outline" onClick={() => onChat(node)}>
            <MessageSquare className="mr-1 h-3.5 w-3.5" /> Message
          </Button>
        )}
        {isAdmin && (
          <>
            <Button
              disabled={creationLocked}
              size="sm"
              variant="ghost"
              onClick={() => onAdd(node.user_id)}
              title="Add report under this person"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            {!node.is_admin && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onMove(node)}
                  title="Change manager"
                >
                  <MoveRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  disabled={deactivating}
                  size="sm"
                  variant="ghost"
                  onClick={() => onDeactivate(node.user_id)}
                  title="Restrict sign-in"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </>
            )}
          </>
        )}
      </div>
      {node.children.map((c) => (
        <TreeRow
          key={c.user_id}
          node={c}
          depth={depth + 1}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
          onAdd={onAdd}
          onMove={onMove}
          onChat={onChat}
          onDeactivate={onDeactivate}
          deactivating={deactivating}
          creationLocked={creationLocked}
        />
      ))}
    </>
  );
}

function FlatRow({
  m,
  members,
  isAdmin,
  currentUserId,
  onChat,
  onMove,
  onDeactivate,
  deactivating,
}: {
  m: InternalStaffMember;
  members: InternalStaffMember[];
  isAdmin: boolean;
  currentUserId: string;
  onChat: () => void;
  onMove: () => void;
  onDeactivate: () => void;
  deactivating: boolean;
}) {
  const manager = members.find((x) => x.user_id === m.manager_user_id);
  return (
    <div className="flex flex-wrap items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold truncate">{m.full_name ?? "—"}</span>
          {m.is_admin && <Badge variant="default">Admin</Badge>}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {m.email ?? "—"} · reports to {manager?.full_name ?? "—"}
        </div>
      </div>
      <Staff365Badge size="xs" />
      {m.user_id !== currentUserId && (
        <Button size="sm" variant="outline" onClick={onChat}>
          <MessageSquare className="mr-1 h-3.5 w-3.5" /> Message
        </Button>
      )}

      {isAdmin && !m.is_admin && (
        <>
          <Button size="sm" variant="ghost" onClick={onMove} title="Change manager">
            <MoveRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            disabled={deactivating}
            size="sm"
            variant="ghost"
            onClick={onDeactivate}
            title="Restrict sign-in"
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </>
      )}
    </div>
  );
}

function AddDialog({
  managerId,
  members,
  onClose,
  onCreated,
  creationLocked,
  onRequestStarted,
  onConfirmed,
}: {
  managerId: string;
  members: InternalStaffMember[];
  onClose: () => void;
  onCreated: () => void;
  creationLocked: boolean;
  onRequestStarted: () => void;
  onConfirmed: () => void;
}) {
  const active = useMounted();
  const pending = useRef(false);
  const [fullName, setFullName] = useState("");
  const [localPart, setLocalPart] = useState("");
  const [password, setPassword] = useState("");
  const [manager, setManager] = useState(managerId);
  const [submitting, setSubmitting] = useState(false);
  const createFn = useServerFn(createInternalStaff);

  const submit = async () => {
    if (
      creationLocked ||
      pending.current ||
      !fullName.trim() ||
      !localPart.trim() ||
      password.length < 8
    )
      return;
    pending.current = true;
    onRequestStarted();
    setSubmitting(true);
    const requestedEmail = `${localPart.trim().toLowerCase()}@365motorsales.com`;
    try {
      const result = await createFn({
        data: {
          fullName: fullName.trim(),
          email: requestedEmail,
          password,
          managerUserId: manager,
        },
      });
      if (!active.current) return;
      const ack = staffCreationAckSchema.safeParse(result);
      if (
        !ack.success ||
        ack.data.email.toLowerCase() !== requestedEmail ||
        !ack.data.profileConfirmed
      ) {
        toast.warning(STAFF_CREATION_UNKNOWN);
        return;
      }
      onConfirmed();
      toast.message(STAFF_CREATION_ACKNOWLEDGED);
      onCreated();
      onClose();
    } catch {
      if (active.current) toast.warning(STAFF_CREATION_UNKNOWN);
    } finally {
      if (active.current) {
        pending.current = false;
        setSubmitting(false);
      }
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add internal staff</DialogTitle>
          <DialogDescription>
            Admin requests account creation and a manager/profile update. Role, organization and
            audit provisioning must be verified separately.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="staff-create-name">Full name</Label>
            <Input
              id="staff-create-name"
              disabled={submitting || creationLocked}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jordi Cruz"
            />
          </div>
          <div>
            <Label htmlFor="staff-create-email">Email</Label>
            <div className="flex items-center gap-1">
              <Input
                id="staff-create-email"
                disabled={submitting || creationLocked}
                value={localPart}
                onChange={(e) => setLocalPart(e.target.value.toLowerCase())}
                placeholder="jordi"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                @365motorsales.com
              </span>
            </div>
          </div>
          <div>
            <Label htmlFor="staff-create-password">Temporary password (min 8)</Label>
            <Input
              id="staff-create-password"
              disabled={submitting || creationLocked}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="staff-create-manager">Reports to</Label>
            <select
              value={manager}
              id="staff-create-manager"
              disabled={submitting || creationLocked}
              onChange={(e) => setManager(e.target.value)}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
            >
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.full_name ?? m.email ?? m.user_id}
                </option>
              ))}
            </select>
          </div>
        </div>
        {creationLocked && !submitting && <p role="alert">{STAFF_CREATION_UNKNOWN}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || creationLocked}>
            {submitting ? "Creating…" : "Create staff"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MoveDialog({
  member,
  members,
  onClose,
  onSaved,
}: {
  member: InternalStaffMember;
  members: InternalStaffMember[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const active = useMounted();
  const pending = useRef(false);
  const [manager, setManager] = useState<string>(member.manager_user_id ?? "");
  const [saving, setSaving] = useState(false);
  const moveFn = useServerFn(updateStaffManager);
  const options = members.filter((m) => m.user_id !== member.user_id);

  const save = async () => {
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    const requestedManager = manager || null;
    try {
      const ack = await moveFn({
        data: { userId: member.user_id, managerUserId: requestedManager },
      });
      if (!active.current) return;
      if (!managerChangeConfirmed(ack, member.user_id, requestedManager)) throw new Error();
      toast.message(
        "Manager row update acknowledged. Related role access and audit were not confirmed.",
      );
      onSaved();
      onClose();
    } catch {
      if (active.current) toast.error(STAFF_CHANGE_UNCONFIRMED);
    } finally {
      if (active.current) {
        pending.current = false;
        setSaving(false);
      }
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change manager for {member.full_name}</DialogTitle>
        </DialogHeader>
        <div>
          <Label htmlFor="staff-move-manager">Reports to</Label>
          <select
            id="staff-move-manager"
            disabled={saving}
            value={manager}
            onChange={(e) => setManager(e.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
          >
            <option value="">No manager</option>
            {options.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.full_name ?? m.email}
              </option>
            ))}
          </select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

void ShieldCheck;
