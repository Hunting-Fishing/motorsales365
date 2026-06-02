import { createFileRoute } from "@tanstack/react-router";
import { confirm } from "@/components/ui/confirm-dialog";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listOrgMembers } from "@/lib/leads.functions";
import { inviteOrgMember, listOrgInvites, updateMemberRole, removeMember } from "@/lib/organizations.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Mail, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({ orgId: z.string().uuid() });

export const Route = createFileRoute("/dashboard/team/members")({
  validateSearch: searchSchema,
  component: MembersPage,
});

const ROLES = ["owner", "admin", "manager", "member", "viewer"] as const;

function MembersPage() {
  const { orgId } = Route.useSearch();
  const qc = useQueryClient();
  const fetchMembers = useServerFn(listOrgMembers);
  const fetchInvites = useServerFn(listOrgInvites);
  const inviteFn = useServerFn(inviteOrgMember);
  const roleFn = useServerFn(updateMemberRole);
  const removeFn = useServerFn(removeMember);

  const { data: members } = useQuery({
    queryKey: ["org-members", orgId],
    queryFn: () => fetchMembers({ data: { orgId } }),
  });
  const { data: invites } = useQuery({
    queryKey: ["org-invites", orgId],
    queryFn: () => fetchInvites({ data: { orgId } }),
  });

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "manager" | "member" | "viewer">("member");
  const [inviting, setInviting] = useState(false);

  const sendInvite = async () => {
    if (!email.includes("@")) return;
    setInviting(true);
    try {
      const inv = await inviteFn({ data: { orgId, email: email.trim().toLowerCase(), role } });
      const link = `${window.location.origin}/invites/${inv.token}`;
      await navigator.clipboard.writeText(link).catch(() => {});
      toast.success("Invite sent — link also copied to clipboard");
      setEmail("");
      qc.invalidateQueries({ queryKey: ["org-invites", orgId] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to invite");
    } finally {
      setInviting(false);
    }
  };

  const setRoleFor = async (uid: string, r: string) => {
    try { await roleFn({ data: { orgId, userId: uid, role: r } }); toast.success("Role updated"); qc.invalidateQueries({ queryKey: ["org-members", orgId] }); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };
  const removeFor = async (uid: string) => {
    if (!(await confirm({ title: "Remove this member from the team?", destructive: true }))) return;
    try { await removeFn({ data: { orgId, userId: uid } }); toast.success("Removed"); qc.invalidateQueries({ queryKey: ["org-members", orgId] }); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="font-semibold">Invite a teammate</h2>
        <p className="text-sm text-muted-foreground">They'll get access after signing up with the invite link.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input type="email" placeholder="teammate@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1" />
          <select value={role} onChange={(e) => setRole(e.target.value as any)} className="rounded-md border border-border bg-card px-3 py-2 text-sm">
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="member">Sales rep</option>
            <option value="viewer">Viewer</option>
          </select>
          <Button onClick={sendInvite} disabled={inviting || !email.includes("@")}>
            <Mail className="mr-1 h-4 w-4" /> Send invite
          </Button>
        </div>
      </Card>

      {invites && invites.length > 0 && (
        <Card className="p-5">
          <h2 className="font-semibold">Pending invites</h2>
          <ul className="mt-3 divide-y divide-border">
            {invites.map((inv: any) => (
              <li key={inv.id} className="flex items-center gap-3 py-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium">{inv.email}</div>
                  <div className="text-xs text-muted-foreground">{inv.role}</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/invites/${inv.token ?? ""}`);
                    toast.success("Link copied");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="font-semibold">Team members</h2>
        <ul className="mt-3 divide-y divide-border">
          {(members ?? []).map((m: any) => (
            <li key={m.user_id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{m.profiles?.full_name ?? m.user_id}</div>
                <div className="text-xs text-muted-foreground">Joined {new Date(m.joined_at).toLocaleDateString()}</div>
              </div>
              {m.role === "owner" ? (
                <Badge>Owner</Badge>
              ) : (
                <>
                  <select
                    value={m.role}
                    onChange={(e) => setRoleFor(m.user_id, e.target.value)}
                    className="rounded-md border border-border bg-card px-2 py-1 text-xs"
                  >
                    {ROLES.filter((r) => r !== "owner").map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <Button variant="ghost" size="sm" onClick={() => removeFor(m.user_id)}>
                    <Trash2 className="h-4 w-4 text-rose-600" />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
