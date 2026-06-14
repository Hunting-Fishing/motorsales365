import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyOrgs } from "@/lib/leads.functions";
import { createOrganization } from "@/lib/organizations.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { FormFeedbackLink } from "@/components/form-feedback";
import { Building2, Users, Inbox, BarChart3, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/team")({
  component: TeamLayout,
});

function TeamLayout() {
  const fetchOrgs = useServerFn(listMyOrgs);
  const {
    data: orgs,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["my-orgs"],
    queryFn: () => fetchOrgs(),
  });
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [createOpen, setCreateOpen] = useState(false);

  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  useEffect(() => {
    if (!selectedOrgId && orgs && orgs.length > 0) setSelectedOrgId(orgs[0].id);
  }, [orgs, selectedOrgId]);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading team…</div>;

  if (!orgs || orgs.length === 0) {
    return <CreateOrgEmptyState onCreated={() => refetch()} />;
  }

  const tabs = [
    { to: "/dashboard/team/leads", label: "Inbox", Icon: Inbox },
    { to: "/dashboard/team/members", label: "Members", Icon: Users },
    { to: "/dashboard/team/performance", label: "Performance", Icon: BarChart3 },
  ];

  const activeOrg = orgs.find((o: any) => o.id === selectedOrgId) ?? orgs[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
          <Building2 className="h-4 w-4 text-primary" />
          <select
            value={activeOrg.id}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            className="bg-transparent text-sm font-semibold outline-none"
          >
            {orgs.map((o: any) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> New team
          </Button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map(({ to, label, Icon }) => {
          const active = pathname === to || pathname.startsWith(to + "/");
          return (
            <Link
              key={to}
              to={to}
              search={{ orgId: activeOrg.id } as any}
              className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </div>

      <Outlet />

      <CreateOrgDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => {
          setSelectedOrgId(id);
          refetch();
        }}
      />
    </div>
  );
}

function CreateOrgDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const create = useServerFn(createOrganization);

  const submit = async () => {
    if (name.trim().length < 2) return;
    setCreating(true);
    try {
      const res: any = await create({ data: { name: name.trim() } });
      toast.success("Team created");
      setName("");
      onOpenChange(false);
      if (res?.id) onCreated(res.id);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not create team");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new team</DialogTitle>
          <DialogDescription>
            Teams let you assign customer inquiries to sales reps and track who closes deals.
          </DialogDescription>
        </DialogHeader>
        <Input
          placeholder="Team name (e.g. Quezon Auto)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={creating || name.trim().length < 2}>
            {creating ? "Creating…" : "Create team"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateOrgEmptyState({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const create = useServerFn(createOrganization);

  const submit = async () => {
    if (name.trim().length < 2) return;
    setCreating(true);
    try {
      await create({ data: { name: name.trim() } });
      toast.success("Team created");
      onCreated();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not create team");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card className="mx-auto max-w-xl p-6 text-center">
      <Building2 className="mx-auto h-10 w-10 text-primary" />
      <h2 className="mt-3 text-xl font-bold">Create your dealer team</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Invite sales reps, assign customer inquiries, and track who's closing deals.
      </p>
      <div className="mt-5 flex gap-2">
        <Input
          placeholder="Team name (e.g. Quezon Auto)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button onClick={submit} disabled={creating || name.trim().length < 2}>
          {creating ? "Creating…" : "Create team"}
        </Button>
      </div>
    </Card>
  );
}
