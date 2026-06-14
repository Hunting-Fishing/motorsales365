import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Copy, Info, RefreshCw, UserPlus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BUSINESS_KIND_OPTIONS } from "@/data/business-kinds";

type StaffRole = "admin" | "moderator" | "support" | "sales" | "advertising";
const STAFF_ROLES: StaffRole[] = ["admin", "moderator", "support", "sales", "advertising"];

function InfoTip({ children }: { children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          tabIndex={-1}
          aria-label="More info"
          className="inline-flex items-center text-muted-foreground hover:text-foreground"
        >
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs leading-relaxed">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

function LabelWithTip({ children, tip }: { children: ReactNode; tip: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label>{children}</Label>
      <InfoTip>{tip}</InfoTip>
    </div>
  );
}

function generatePassword(len = 16) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join("");
}

export function AddUserDialog({
  onCreated,
  lockStaff = false,
  enforceDomain,
  triggerLabel = "Add user",
}: {
  onCreated?: () => void;
  lockStaff?: boolean;
  enforceDomain?: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState(() => generatePassword());
  const [accountType, setAccountType] = useState<"staff" | "business">(lockStaff ? "staff" : "staff");
  const [roles, setRoles] = useState<StaffRole[]>(["support"]);
  const [sellerType, setSellerType] = useState<"private" | "business">("private");
  const [businessName, setBusinessName] = useState("");
  const [businessKind, setBusinessKind] = useState<string>("");
  const [markVerified, setMarkVerified] = useState(true);

  const reset = () => {
    setEmail("");
    setFirstName("");
    setLastName("");
    setPassword(generatePassword());
    setAccountType("staff");
    setRoles(["support"]);
    setSellerType("private");
    setBusinessName("");
    setBusinessKind("");
    setMarkVerified(true);
  };

  const toggleRole = (r: StaffRole) =>
    setRoles((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));

  const copyPw = async () => {
    try {
      await navigator.clipboard.writeText(password);
      toast.success("Password copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const submit = async () => {
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!email || !firstName.trim() || !lastName.trim() || !password) {
      toast.error("Fill all required fields");
      return;
    }
    if (enforceDomain && !email.trim().toLowerCase().endsWith(enforceDomain.toLowerCase())) {
      toast.error(`Email must end with ${enforceDomain}`);
      return;
    }
    setSubmitting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) {
        toast.error("You must be signed in");
        return;
      }

      const body: any = {
        email: email.trim().toLowerCase(),
        full_name: fullName,
        password,
        account_type: accountType,
        roles: accountType === "staff" ? roles : [],
      };
      if (enforceDomain) body.enforce_domain = enforceDomain;
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
      if (enforceDomain) {
        toast.message("Don't forget to add a Cloudflare Email Routing rule for this address so they can receive mail.", { duration: 14000 });
      }
      onCreated?.();
      setOpen(false);
      reset();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="mr-2 h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <TooltipProvider delayDuration={150}>
        <DialogHeader>
          <DialogTitle>Add a new user</DialogTitle>
          <DialogDescription>
            Creates a fully-active account. The employee can sign in immediately —
            no confirmation email is sent.
          </DialogDescription>
        </DialogHeader>

        {enforceDomain && (
          <div className="flex gap-2 rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />
            <div>
              Outbound mail from the app sends via <strong>notify.365motorsales.com</strong>.
              Inbound mail to a new <strong>{enforceDomain}</strong> address needs a Cloudflare
              routing rule — otherwise even the password-reset email can't be delivered.
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="grid gap-2">
            <LabelWithTip
              tip={
                <>
                  Used for sign-in and as the recipient address for app-generated emails
                  (password reset, notifications). For <code>@365motorsales.com</code>
                  addresses, ensure a Cloudflare Email Routing rule exists so mail
                  actually reaches a real inbox.
                </>
              }
            >
              Email *
            </LabelWithTip>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <LabelWithTip tip="Shown across the admin UI and used in email greetings.">
                First name *
              </LabelWithTip>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Billy"
              />
            </div>
            <div className="grid gap-2">
              <LabelWithTip tip="Shown across the admin UI and used in email greetings.">
                Last name *
              </LabelWithTip>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Bailey"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <LabelWithTip
              tip="One-time password. Share through a secure channel (Signal, password manager, in person). The employee should change it at first sign-in."
            >
              Temporary password *
            </LabelWithTip>
            <div className="flex gap-2">
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="font-mono"
              />
              <Button type="button" variant="outline" size="icon" onClick={copyPw} title="Copy" aria-label="Copy password">
                <Copy className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setPassword(generatePassword())}
                title="Regenerate"
                aria-label="Regenerate password"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share securely. They can change it after first sign-in.
            </p>
          </div>

          {!lockStaff && (
            <div className="grid gap-2">
              <Label>Account type</Label>
              <Select value={accountType} onValueChange={(v: any) => setAccountType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff / Employee</SelectItem>
                  <SelectItem value="business">Business / Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {enforceDomain && (
            <p className="text-xs text-muted-foreground">
              Email must end with <strong>{enforceDomain}</strong>. Add a matching rule in the{" "}
              <Link
                to="/admin/staff-365"
                search={{ tab: "routing" } as any}
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Email Routing
              </Link>{" "}
              tab and in Cloudflare before sharing.
            </p>
          )}


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
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {on ? "✓ " : "+ "}
                      {r}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Staff accounts automatically get a Staff QR Referral row created.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-2">
                <Label>Seller type</Label>
                <Select value={sellerType} onValueChange={(v: any) => setSellerType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Business name (optional)</Label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Business kind (optional)</Label>
                <Select
                  value={businessKind || "none"}
                  onValueChange={(v: any) => setBusinessKind(v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {BUSINESS_KIND_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={markVerified}
                  onChange={(e) => setMarkVerified(e.target.checked)}
                />
                Mark as verified
              </label>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Creating…" : "Create user"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
