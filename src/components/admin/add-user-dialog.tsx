import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Copy, Info, RefreshCw, UserPlus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  AddressSection,
  BusinessKindSelect,
  Field,
  RoleChips,
  STAFF_ROLES,
  compactInput,
  type StaffRole,
} from "@/components/admin/user-form-tabs";

const TABS = ["identity", "address", "business", "roles", "ads"] as const;
type TabKey = (typeof TABS)[number];

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
      <TooltipContent className="max-w-xs text-xs leading-relaxed">{children}</TooltipContent>
    </Tooltip>
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
  const [tab, setTab] = useState<TabKey>("identity");
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [emailUser, setEmailUser] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [fullName, setFullName] = useState("");
  const [fullNameTouched, setFullNameTouched] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState(() => generatePassword());
  const [accountType, setAccountType] = useState<"staff" | "business">("staff");
  const [roles, setRoles] = useState<StaffRole[]>(["support"]);
  const [sellerType, setSellerType] = useState<"private" | "business">("private");
  const [businessName, setBusinessName] = useState("");
  const [businessKind, setBusinessKind] = useState<string>("");
  const [markVerified, setMarkVerified] = useState(true);
  const [address, setAddress] = useState({
    street_address: "",
    signup_city: "",
    signup_province: "",
    signup_region: "",
    postal_code: "",
  });
  const [bizAddress, setBizAddress] = useState({
    business_address: "",
    business_city: "",
    business_province: "",
    business_region: "",
    business_postal_code: "",
  });

  const computedFullName = `${firstName.trim()} ${lastName.trim()}`.trim();
  const effectiveFullName = fullNameTouched && fullName.trim() ? fullName.trim() : computedFullName;

  const reset = () => {
    setTab("identity");
    setEmail("");
    setFirstName("");
    setLastName("");
    setFullName("");
    setFullNameTouched(false);
    setPhone("");
    setPassword(generatePassword());
    setAccountType("staff");
    setRoles(["support"]);
    setSellerType("private");
    setBusinessName("");
    setBusinessKind("");
    setMarkVerified(true);
    setAddress({
      street_address: "",
      signup_city: "",
      signup_province: "",
      signup_region: "",
      postal_code: "",
    });
    setBizAddress({
      business_address: "",
      business_city: "",
      business_province: "",
      business_region: "",
      business_postal_code: "",
    });
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
    if (!email || !firstName.trim() || !lastName.trim() || !password) {
      toast.error("Fill email, first/last name and password");
      setTab("identity");
      return;
    }
    if (enforceDomain && !email.trim().toLowerCase().endsWith(enforceDomain.toLowerCase())) {
      toast.error(`Email must end with ${enforceDomain}`);
      setTab("identity");
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
        full_name: effectiveFullName || `${firstName.trim()} ${lastName.trim()}`.trim(),
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
        password,
        account_type: accountType,
        roles: accountType === "staff" ? roles : [],
        ...Object.fromEntries(
          Object.entries(address).filter(([, v]) => (v as string).trim() !== ""),
        ),
      };
      if (enforceDomain) body.enforce_domain = enforceDomain;
      if (accountType === "business") {
        body.seller_type = sellerType;
        if (businessName.trim()) body.business_name = businessName.trim();
        if (businessKind) body.business_kind = businessKind;
        body.mark_verified = markVerified;
        Object.entries(bizAddress).forEach(([k, v]) => {
          if ((v as string).trim()) body[k] = (v as string).trim();
        });
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
        toast.message(
          "Don't forget to add a Cloudflare Email Routing rule for this address so they can receive mail.",
          { duration: 14000 },
        );
      }
      onCreated?.();
      setOpen(false);
      reset();
    } finally {
      setSubmitting(false);
    }
  };

  const tabIndex = TABS.indexOf(tab);
  const isLast = tabIndex === TABS.length - 1;
  const next = () => setTab(TABS[Math.min(TABS.length - 1, tabIndex + 1)]);
  const back = () => setTab(TABS[Math.max(0, tabIndex - 1)]);

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
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <TooltipProvider delayDuration={150}>
          <DialogHeader>
            <DialogTitle>Add a new user</DialogTitle>
            <DialogDescription>
              Creates a fully-active account. Fill each tab, then click Create.
            </DialogDescription>
          </DialogHeader>

          {enforceDomain && (
            <div className="flex gap-2 rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />
              <div>
                Outbound mail sends via <strong>notify.365motorsales.com</strong>. Inbound mail to a
                new <strong>{enforceDomain}</strong> address needs a Cloudflare routing rule.
              </div>
            </div>
          )}

          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="mt-2">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="identity">Identity</TabsTrigger>
              <TabsTrigger value="address">Address</TabsTrigger>
              <TabsTrigger value="business">Business</TabsTrigger>
              <TabsTrigger value="roles">Roles</TabsTrigger>
              <TabsTrigger value="ads" disabled>
                Ads
              </TabsTrigger>
            </TabsList>

            <TabsContent value="identity" className="mt-3 space-y-3">
              <Field label="Email *">
                <Input
                  className={compactInput()}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="First name *">
                  <Input
                    className={compactInput()}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Billy"
                  />
                </Field>
                <Field label="Last name *">
                  <Input
                    className={compactInput()}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Bailey"
                  />
                </Field>
                <Field label="Full name (display)">
                  <Input
                    className={compactInput()}
                    value={fullNameTouched ? fullName : computedFullName}
                    onChange={(e) => {
                      setFullNameTouched(true);
                      setFullName(e.target.value);
                    }}
                    placeholder="Auto from first + last"
                  />
                </Field>
                <Field label="Phone">
                  <Input
                    className={compactInput()}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+639XXXXXXXXX"
                  />
                </Field>
              </div>

              <Field label="Temporary password *">
                <div className="flex gap-2">
                  <Input
                    className={compactInput("font-mono")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copyPw}
                    aria-label="Copy password"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setPassword(generatePassword())}
                    aria-label="Regenerate password"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </Field>
              <p className="text-xs text-muted-foreground">
                Share securely. They can change it after first sign-in.
                {enforceDomain && (
                  <>
                    {" "}Email must end with <strong>{enforceDomain}</strong>. Add a matching rule in{" "}
                    <Link
                      to="/admin/staff-365"
                      search={{ tab: "routing" } as any}
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      Email Routing
                    </Link>
                    .
                  </>
                )}
              </p>
            </TabsContent>

            <TabsContent value="address" className="mt-3">
              <AddressSection
                value={address}
                onChange={(p) => setAddress((s) => ({ ...s, ...p }))}
              />
            </TabsContent>

            <TabsContent value="business" className="mt-3 space-y-3">
              {!lockStaff && (
                <Field label="Account type">
                  <Select value={accountType} onValueChange={(v: any) => setAccountType(v)}>
                    <SelectTrigger className={compactInput()}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff / Employee</SelectItem>
                      <SelectItem value="business">Business / Customer</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
              {accountType === "business" ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Seller type">
                      <Select value={sellerType} onValueChange={(v: any) => setSellerType(v)}>
                        <SelectTrigger className={compactInput()}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="private">Private</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Business kind">
                      <BusinessKindSelect value={businessKind} onChange={setBusinessKind} />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="Business name">
                        <Input
                          className={compactInput()}
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                        />
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="Business address">
                        <Input
                          className={compactInput()}
                          value={bizAddress.business_address}
                          onChange={(e) =>
                            setBizAddress((s) => ({ ...s, business_address: e.target.value }))
                          }
                        />
                      </Field>
                    </div>
                    <Field label="Business city">
                      <Input
                        className={compactInput()}
                        value={bizAddress.business_city}
                        onChange={(e) =>
                          setBizAddress((s) => ({ ...s, business_city: e.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Business province">
                      <Input
                        className={compactInput()}
                        value={bizAddress.business_province}
                        onChange={(e) =>
                          setBizAddress((s) => ({ ...s, business_province: e.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Business region">
                      <Input
                        className={compactInput()}
                        value={bizAddress.business_region}
                        onChange={(e) =>
                          setBizAddress((s) => ({ ...s, business_region: e.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Business postal code">
                      <Input
                        className={compactInput()}
                        value={bizAddress.business_postal_code}
                        onChange={(e) =>
                          setBizAddress((s) => ({ ...s, business_postal_code: e.target.value }))
                        }
                      />
                    </Field>
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
              ) : (
                <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                  Staff accounts don't need business details. Switch Account type to Business if
                  this user owns a shop.
                </p>
              )}
            </TabsContent>

            <TabsContent value="roles" className="mt-3 space-y-3">
              <Field label="Roles (in addition to base user) ">
                <div className="flex items-start gap-2">
                  <RoleChips roles={roles} onToggle={toggleRole} />
                  <InfoTip>
                    <ul className="ml-3 list-disc space-y-0.5">
                      <li><strong>admin</strong> — full access.</li>
                      <li><strong>moderator</strong> — listings &amp; users.</li>
                      <li><strong>support</strong> — support tickets.</li>
                      <li><strong>sales</strong> — sales pipeline.</li>
                      <li><strong>advertising</strong> — ad inquiries.</li>
                    </ul>
                  </InfoTip>
                </div>
              </Field>
              <p className="text-xs text-muted-foreground">
                Staff accounts automatically get a Staff QR Referral row created.
              </p>
            </TabsContent>

            <TabsContent value="ads" className="mt-3">
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Advertisement templates (QR posters, QR ad cards) become available after the
                user is created. Open Edit on the new user to assign template presets.
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-2 flex items-center justify-between gap-2 sm:justify-between">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              {tabIndex > 0 && (
                <Button variant="outline" onClick={back} disabled={submitting}>
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {!isLast && (
                <Button variant="outline" onClick={next} disabled={submitting}>
                  Next
                </Button>
              )}
              <Button onClick={submit} disabled={submitting}>
                {submitting ? "Creating…" : "Create user"}
              </Button>
            </div>
          </DialogFooter>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
