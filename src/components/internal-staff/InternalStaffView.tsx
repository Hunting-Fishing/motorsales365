import { useMemo, useState } from "react";
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

export function InternalStaffView({
  currentUserId,
  isAdmin,
  variant = "tree",
}: {
  currentUserId: string;
  isAdmin: boolean;
  variant?: "tree" | "list";
}) {
  const qc = useQueryClient();
  const fetchStaff = useServerFn(listInternalStaff);
  const deactivateFn = useServerFn(deactivateInternalStaff);
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["internal-staff"],
    queryFn: () => fetchStaff(),
  });

  const roots = useMemo(() => buildTree(members), [members]);
  const [addOpen, setAddOpen] = useState<{ managerId: string } | null>(null);
  const [moveFor, setMoveFor] = useState<InternalStaffMember | null>(null);
  const [chatWith, setChatWith] = useState<InternalStaffMember | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["internal-staff"] });


  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Loading team…</div>;
  }


  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={() => setAddOpen({ managerId: currentUserId })}>
            <Plus className="mr-1 h-4 w-4" /> Add staff under me
          </Button>
        </div>
      )}

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
                  onAdd={(mid) => setAddOpen({ managerId: mid })}
                  onMove={(m) => setMoveFor(m)}
                  onChat={(m) => setChatWith(m)}
                  onDeactivate={async (uid) => {
                    if (!window.confirm("Deactivate this staff account? They will not be able to sign in.")) return;
                    try {
                      await deactivateFn({ data: { userId: uid } });
                      toast.success("Staff deactivated");
                      refresh();
                    } catch (e: any) {
                      toast.error(e?.message ?? "Failed");
                    }
                  }}
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
                onDeactivate={async () => {
                  if (!window.confirm("Deactivate this staff account?")) return;
                  try {
                    await deactivateFn({ data: { userId: m.user_id } });
                    toast.success("Staff deactivated");
                    refresh();
                  } catch (e: any) {
                    toast.error(e?.message ?? "Failed");
                  }
                }}
              />

            ))}
          </div>
        )}
      </Card>

      {isAdmin && addOpen && (
        <AddDialog
          managerId={addOpen.managerId}
          members={members}
          onClose={() => setAddOpen(null)}
          onCreated={refresh}
        />
      )}
      {isAdmin && moveFor && (
        <MoveDialog
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
  onDeactivate,
}: {
  node: Node;
  depth: number;
  isAdmin: boolean;
  currentUserId: string;
  onAdd: (managerId: string) => void;
  onMove: (m: InternalStaffMember) => void;
  onDeactivate: (userId: string) => void;
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
            {node.user_id === currentUserId && (
              <Badge variant="outline">You</Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {node.email ?? "—"}
          </div>
        </div>
        <Staff365Badge size="xs" />
        {node.email && node.user_id !== currentUserId && (
          <Button asChild size="sm" variant="outline">
            <a href={`mailto:${node.email}`}>
              <Mail className="mr-1 h-3.5 w-3.5" /> Message
            </a>
          </Button>
        )}
        {isAdmin && (
          <>
            <Button size="sm" variant="ghost" onClick={() => onAdd(node.user_id)} title="Add report under this person">
              <Plus className="h-3.5 w-3.5" />
            </Button>
            {!node.is_admin && (
              <>
                <Button size="sm" variant="ghost" onClick={() => onMove(node)} title="Change manager">
                  <MoveRight className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDeactivate(node.user_id)} title="Deactivate">
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
          onDeactivate={onDeactivate}
        />
      ))}
    </>
  );
}

function FlatRow({
  m,
  members,
  isAdmin,
  onMove,
  onDeactivate,
}: {
  m: InternalStaffMember;
  members: InternalStaffMember[];
  isAdmin: boolean;
  onMove: () => void;
  onDeactivate: () => void;
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
      {m.email && (
        <Button asChild size="sm" variant="outline">
          <a href={`mailto:${m.email}`}>
            <Mail className="mr-1 h-3.5 w-3.5" /> Message
          </a>
        </Button>
      )}
      {isAdmin && !m.is_admin && (
        <>
          <Button size="sm" variant="ghost" onClick={onMove} title="Change manager">
            <MoveRight className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onDeactivate} title="Deactivate">
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
}: {
  managerId: string;
  members: InternalStaffMember[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [localPart, setLocalPart] = useState("");
  const [password, setPassword] = useState("");
  const [manager, setManager] = useState(managerId);
  const [submitting, setSubmitting] = useState(false);
  const createFn = useServerFn(createInternalStaff);

  const submit = async () => {
    if (!fullName.trim() || !localPart.trim() || password.length < 8) return;
    setSubmitting(true);
    try {
      await createFn({
        data: {
          fullName: fullName.trim(),
          email: `${localPart.trim().toLowerCase()}@365motorsales.com`,
          password,
          managerUserId: manager,
        },
      });
      toast.success("Staff account created");
      onCreated();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add internal staff</DialogTitle>
          <DialogDescription>
            Only admin can create internal 365 staff. The new account is added to
            the internal 365 MotorSales organization.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jordi Cruz" />
          </div>
          <div>
            <Label>Email</Label>
            <div className="flex items-center gap-1">
              <Input value={localPart} onChange={(e) => setLocalPart(e.target.value.toLowerCase())} placeholder="jordi" />
              <span className="text-sm text-muted-foreground whitespace-nowrap">@365motorsales.com</span>
            </div>
          </div>
          <div>
            <Label>Temporary password (min 8)</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <Label>Reports to</Label>
            <select
              value={manager}
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
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
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
  const [manager, setManager] = useState<string>(member.manager_user_id ?? "");
  const [saving, setSaving] = useState(false);
  const moveFn = useServerFn(updateStaffManager);
  const options = members.filter((m) => m.user_id !== member.user_id);

  const save = async () => {
    setSaving(true);
    try {
      await moveFn({ data: { userId: member.user_id, managerUserId: manager || null } });
      toast.success("Manager updated");
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change manager for {member.full_name}</DialogTitle>
        </DialogHeader>
        <div>
          <Label>Reports to</Label>
          <select
            value={manager}
            onChange={(e) => setManager(e.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
          >
            {options.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.full_name ?? m.email}
              </option>
            ))}
          </select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

void ShieldCheck;

