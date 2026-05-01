import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);

  const load = async () => {
    const { data: profs } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200);
    const ids = (profs ?? []).map((p) => p.id);
    const { data: roles } = await supabase.from("user_roles").select("user_id,role").in("user_id", ids);
    const roleMap = new Map<string, string[]>();
    (roles ?? []).forEach((r: any) => {
      const arr = roleMap.get(r.user_id) ?? []; arr.push(r.role); roleMap.set(r.user_id, arr);
    });
    setUsers((profs ?? []).map((p) => ({ ...p, roles: roleMap.get(p.id) ?? [] })));
  };
  useEffect(() => { load(); }, []);

  const grantAdmin = async (userId: string) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
    if (error) toast.error(error.message); else { toast.success("Admin granted"); load(); }
  };
  const revokeAdmin = async (userId: string) => {
    await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
    toast.success("Admin revoked"); load();
  };

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold">Users</h1>
      <div className="space-y-2">
        {users.map((u) => {
          const isAdmin = u.roles.includes("admin");
          return (
            <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
              <div>
                <div className="font-medium">{u.full_name ?? "(no name)"}</div>
                <div className="text-xs text-muted-foreground">{u.seller_type} · joined {formatDate(u.created_at)}</div>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && <Badge>Admin</Badge>}
                {isAdmin
                  ? <Button size="sm" variant="outline" onClick={() => revokeAdmin(u.id)}>Revoke admin</Button>
                  : <Button size="sm" variant="outline" onClick={() => grantAdmin(u.id)}>Make admin</Button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
