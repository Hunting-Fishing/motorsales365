import { useState } from "react";
import { toast } from "sonner";
import { Copy, RefreshCw, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type StaffRole = "admin" | "moderator" | "support" | "sales" | "advertising";
const STAFF_ROLES: StaffRole[] = ["admin", "moderator", "support", "sales", "advertising"];

function generatePassword(len = 16) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join("");
}

export function AddUserDialog({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState(() => generatePassword());
  const [accountType, setAccountType] = useState<"staff" | "business">("staff");
  const [roles, setRoles] = useState<StaffRole[]>(["support"]);
  const [sellerType, setSellerType] = useState<"private" | "dealer" | "repair_shop" | "insurance">("private");
  const [businessName, setBusinessName] = useState("");
  const [businessKind, setBusinessKind] = useState<"dealer" | "repair_shop" | "insurance" | "">("");
  const [markVerified, setMarkVerified] = useState(true);

  const reset = () => {
    setEmail(""); setFullName(""); setPassword(generatePassword());
    setAccountType("staff"); setRoles(["support"]);
    setSellerType("private"); setBusinessName(""); setBusinessKind(""); setMarkVerified(true);
  };

  const toggleRole = (r: StaffRole) =>
    setRoles((cur) => cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]);

  const copyPw = async () => {
    try { await navigator.clipboard.writeText(password); toast.success("Password copied"); }
    catch { toast.error("Could not copy"); }
  };

  const submit = async () => {
    if (!email || !fullName || !password) { toast.error("Fill all required fields"); return; }
    setSubmitting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) { toast.error("You must be signed in"); return; }

      const body: any = {
        email: email.trim().toLowerCase(),
        full_name: fullName.trim(),
        password,
        account_type: accountType,
        roles: accountType === "staff" ? roles : [],
      };
      if (accountType === "business") {
        body.seller_type = sellerType;
        if (businessName.trim()) body.business_name = businessName.trim();
        if (businessKind) body.business_kind = businessKind;
        body.mark_verified = markVerified;
      }

      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? `Failed (${res.status})`);
        return;
      }
      toast.success(`User created. Temp password: ${password}`, { duration: 12000 });
      onCreated?.();
      setOpen(false);
      reset();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm"><UserPlus className="mr-2 h-4 w-4" />Add user</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a new user</DialogTitle>
          <DialogDescription>
            Creates a fully-active account in the database with the chosen roles. They can sign in immediately with the temporary password.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-2">
            <Label>Email *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
          </div>
          <div className="grid gap-2">
            <Label>Full name *</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
          </div>
          <div className="grid gap-2">
            <Label>Temporary password *</Label>
            <div className="flex gap-2">
              <Input value={password} onChange={(e) => setPassword(e.target.value)} className="font-mono" />
              <Button type="button" variant="outline" size="icon" onClick={copyPw} title="Copy"><Copy className="h-4 w-4" /></Button>
              <Button type="button" variant="outline" size="icon" onClick={() => setPassword(generatePassword())} title="Regenerate"><RefreshCw className="h-4 w-4" /></Button>
            </div>
            <p className="text-xs text-muted-foreground">Share securely. They can change it after first sign-in.</p>
          </div>

          <div className="grid gap-2">
            <Label>Account type</Label>
            <Select value={accountType} onValueChange={(v: any) => setAccountType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff / Employee</SelectItem>
                <SelectItem value="business">Business / Customer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {accountType === "staff" ? (
            <div className="grid gap-2">
              <Label>Roles (in addition to base user)</Label>
              <div className="flex flex-wrap gap-1.5">
                {STAFF_ROLES.map((r) => {
                  const on = roles.includes(r);
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => toggleRole(r)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {on ? "✓ " : "+ "}{r}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">Staff accounts automatically get a Staff QR Referral row created.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-2">
                <Label>Seller type</Label>
                <Select value={sellerType} onValueChange={(v: any) => setSellerType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="dealer">Dealer</SelectItem>
                    <SelectItem value="repair_shop">Repair shop</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Business name (optional)</Label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Business kind (optional)</Label>
                <Select value={businessKind || "none"} onValueChange={(v: any) => setBusinessKind(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="dealer">Dealer</SelectItem>
                    <SelectItem value="repair_shop">Repair shop</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={markVerified} onChange={(e) => setMarkVerified(e.target.checked)} />
                Mark as verified
              </label>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? "Creating…" : "Create user"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
