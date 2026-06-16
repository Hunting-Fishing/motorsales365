import { useState } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  listBusinessStaff,
  addBusinessStaffByEmail,
  updateBusinessStaff,
  removeBusinessStaff,
} from "@/lib/business-staff.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLES = [
  { value: "manager", label: "Manager" },
  { value: "dispatcher", label: "Dispatcher" },
  { value: "driver", label: "Driver" },
  { value: "mechanic", label: "Mechanic" },
  { value: "clerk", label: "Clerk / office" },
] as const;

const DUTIES_BY_ROLE: Record<string, string[]> = {
  driver: [
    "Light-duty tow",
    "Heavy-duty tow",
    "Flatbed",
    "Wrecker",
    "Recovery / winch-out",
    "Motorcycle tow",
    "Long-distance haul",
  ],
  dispatcher: ["Inbound calls", "Job assignment", "Customer follow-up"],
  mechanic: ["Truck maintenance", "Roadside repair", "Tire change"],
  clerk: ["Billing", "Invoicing", "Records"],
};

export const Route = createFileRoute("/dashboard/business/$businessId/staff")({
  component: StaffPage,
});

function StaffPage() {
  const { businessId } = useParams({ from: "/dashboard/business/$businessId/staff" });
  const { user } = useAuth();
  const qc = useQueryClient();
  const loadFn = useServerFn(listBusinessStaff);
  const addFn = useServerFn(addBusinessStaffByEmail);
  const updateFn = useServerFn(updateBusinessStaff);
  const removeFn = useServerFn(removeBusinessStaff);

  const staffQ = useQuery({
    queryKey: ["business-staff", businessId],
    enabled: !!user?.id,
    queryFn: () => loadFn({ data: { businessId } }),
  });

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]["value"]>("driver");
  const [title, setTitle] = useState("");
  const [duties, setDuties] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const dutyOptions = DUTIES_BY_ROLE[role] ?? [];

  async function handleInvite() {
    setSubmitting(true);
    try {
      const res: any = await addFn({ data: { businessId, email, role, title, duties } });
      const { handlePlanLimitResult } = await import("@/lib/plan-limit-toast");
      if (handlePlanLimitResult(res, { businessId })) return;
      toast.success("Employee added");
      setOpen(false);
      setEmail("");
      setTitle("");
      setDuties([]);
      qc.invalidateQueries({ queryKey: ["business-staff", businessId] });
    } catch (e: any) {
      toast.error(e?.message || "Failed to add employee");
    } finally {
      setSubmitting(false);

    }
  }

  async function handleRemove(staffId: string) {
    if (!confirm("Remove this employee from the business?")) return;
    try {
      await removeFn({ data: { staffId, businessId } });
      toast.success("Employee removed");
      qc.invalidateQueries({ queryKey: ["business-staff", businessId] });
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    }
  }

  async function handleToggleActive(staffId: string, active: boolean) {
    try {
      await updateFn({ data: { staffId, businessId, active } });
      qc.invalidateQueries({ queryKey: ["business-staff", businessId] });
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    }
  }

  async function handleToggleShift(staffId: string, on_shift: boolean) {
    try {
      await updateFn({ data: { staffId, businessId, on_shift } });
      qc.invalidateQueries({ queryKey: ["business-staff", businessId] });
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    }
  }

  const rows = staffQ.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" /> Employees
          </h1>
          <p className="text-sm text-muted-foreground">
            Add drivers, dispatchers, mechanics, and office staff with role-specific duties.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add employee
        </Button>
      </div>

      <Card className="divide-y">
        {staffQ.isLoading && (
          <div className="p-4 text-sm text-muted-foreground">Loading…</div>
        )}
        {!staffQ.isLoading && rows.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No employees yet. Click <strong>Add employee</strong> to invite your first driver.
          </div>
        )}
        {rows.map((r: any) => (
          <div
            key={r.id}
            className="p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between"
          >
            <div className="min-w-0">
              <div className="font-medium truncate">{r.display_name}</div>
              <div className="text-xs text-muted-foreground">
                {r.title ? `${r.title} · ` : ""}
                <Badge variant="secondary" className="ml-1">
                  {r.role}
                </Badge>
                {!r.active && (
                  <Badge variant="outline" className="ml-2">
                    inactive
                  </Badge>
                )}
              </div>
              {Array.isArray(r.duties) && r.duties.length > 0 && (
                <div className="text-xs text-muted-foreground mt-1">
                  {r.duties.join(" · ")}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              {r.role === "driver" && (
                <label className="flex items-center gap-2 text-xs">
                  <Switch
                    checked={!!r.on_shift}
                    onCheckedChange={(v) => handleToggleShift(r.id, v)}
                  />
                  On shift
                </label>
              )}
              <label className="flex items-center gap-2 text-xs">
                <Switch
                  checked={!!r.active}
                  onCheckedChange={(v) => handleToggleActive(r.id, v)}
                />
                Active
              </label>
              {r.role !== "owner" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(r.id)}
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add employee</DialogTitle>
            <DialogDescription>
              The person must already have a 365 Motor Sales account. They'll appear here
              immediately and can access the workspace next time they sign in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="driver@example.com"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={role} onValueChange={(v: any) => { setRole(v); setDuties([]); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title (optional)</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Senior driver"
              />
            </div>
            {dutyOptions.length > 0 && (
              <div>
                <Label>Duties</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {dutyOptions.map((d) => {
                    const checked = duties.includes(d);
                    return (
                      <label
                        key={d}
                        className="flex items-center gap-2 text-sm border rounded px-2 py-1 cursor-pointer hover:bg-muted/50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setDuties(
                              e.target.checked
                                ? [...duties, d]
                                : duties.filter((x) => x !== d),
                            )
                          }
                        />
                        {d}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={!email || submitting}>
              {submitting ? "Adding…" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
