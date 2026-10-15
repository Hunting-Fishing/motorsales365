import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Copy, Info, RefreshCw, ShieldCheck, UserPlus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STAFF_EMAIL_DOMAIN, isStaffEmail } from "@/lib/staff-domain";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { BUSINESS_KIND_VALUES } from "@/data/business-kinds";

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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
type Props = {
  onCreated?: () => void;
  lockStaff?: boolean;
  enforceDomain?: string;
  triggerLabel?: string;
};
type Flight = {
  epoch: object;
  controller: AbortController;
  issued: boolean;
  acknowledged: boolean;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const unknownOutcome =
  "Creation may be partial or its outcome unknown. Inspect account records outside this dialog. Creation controls remain locked for this mounted account session; closing or reopening does not clear this lock.";
const preparationFailure =
  "Could not prepare account creation. Check your sign-in before trying again.";
const acknowledgment =
  "Creation request acknowledged. Role assignments, profile fields and audit were not confirmed.";
const invalidDetails = "Check account details and field limits before submitting.";
// Deliberately duplicated current API input limits, not an authority gate.
// Keep this bounded caller validation aligned with /api/admin/create-user;
// the unchanged server remains responsible for validation and authorization.
const CreationBody = z
  .object({
    email: z.string().email().max(255),
    full_name: z.string().trim().min(1).max(120),
    first_name: z.string().trim().max(80).optional(),
    last_name: z.string().trim().max(80).optional(),
    phone: z.string().trim().max(40).optional(),
    personal_email: z.string().trim().email().max(255).optional().or(z.literal("")),
    password: z.string().min(8).max(72),
    account_type: z.enum(["staff", "business"]),
    roles: z.array(z.enum(["admin", "moderator", "support", "sales", "advertising"])),
    street_address: z.string().trim().max(200).optional(),
    signup_city: z.string().trim().max(120).optional(),
    signup_province: z.string().trim().max(120).optional(),
    signup_region: z.string().trim().max(120).optional(),
    postal_code: z.string().trim().max(20).optional(),
    seller_type: z.enum(["private", "dealer", "repair_shop", "insurance"]).optional(),
    business_name: z.string().trim().max(160).optional(),
    business_kind: z.enum(BUSINESS_KIND_VALUES).optional(),
    business_address: z.string().trim().max(300).optional(),
    business_city: z.string().trim().max(120).optional(),
    business_province: z.string().trim().max(120).optional(),
    business_region: z.string().trim().max(120).optional(),
    business_postal_code: z.string().trim().max(20).optional(),
    mark_verified: z.boolean().optional(),
    enforce_domain: z.string().trim().max(120).optional(),
  })
  .strict();

function isAcknowledgment(value: unknown, email: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (Object.keys(value).sort().join(",") !== "email,ok,userId") return false;
  const id: unknown = Reflect.get(value, "userId");
  return (
    Reflect.get(value, "ok") === true &&
    typeof id === "string" &&
    uuid.test(id) &&
    Reflect.get(value, "email") === email
  );
}

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

export function AddUserDialog(props: Props) {
  const { user, loading } = useAuth();
  if (!user?.id || !uuid.test(user.id)) {
    return (
      <Button size="sm" disabled>
        {props.triggerLabel ?? "Add user"}
      </Button>
    );
  }
  // Account transitions, including A -> B -> A, create a new private scope.
  // Client identity fences do not replace the API's existing authority checks.
  return <AccountDialog key={user.id} {...props} accountId={user.id} active={!loading} />;
}

function AccountDialog(props: Props & { accountId: string; active: boolean }) {
  const lock = useRef({ locked: false });
  const alive = useRef(false);
  const [unknown, setUnknown] = useState(false);
  useLayoutEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const lockAttempt = () => {
    lock.current.locked = true;
    if (alive.current) setUnknown(true);
  };
  // Temporary loading discards the private form but retains this account's
  // non-PII uncertainty lock. It cannot revive or retry the abandoned request.
  if (!props.active)
    return (
      <Button size="sm" disabled>
        {props.triggerLabel ?? "Add user"}
      </Button>
    );
  return (
    <AccountForm
      key={JSON.stringify([props.lockStaff ?? false, props.enforceDomain ?? null])}
      {...props}
      lock={lock.current}
      unknown={unknown}
      lockAttempt={lockAttempt}
    />
  );
}

function AccountForm({
  onCreated,
  lockStaff = false,
  enforceDomain,
  triggerLabel = "Add user",
  accountId,
  lock,
  unknown,
  lockAttempt,
}: Props & {
  accountId: string;
  lock: { locked: boolean };
  unknown: boolean;
  lockAttempt: () => void;
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
  const lifecycle = useRef({ alive: false, epoch: {}, open: false });
  const flight = useRef<Flight | null>(null);
  const current = (request: Flight) =>
    lifecycle.current.alive &&
    lifecycle.current.open &&
    lifecycle.current.epoch === request.epoch &&
    flight.current === request &&
    !request.controller.signal.aborted;
  useLayoutEffect(() => {
    const scope = lifecycle.current;
    scope.alive = true;
    scope.epoch = {};
    return () => {
      scope.alive = false;
      scope.epoch = {};
      const request = flight.current;
      if (request?.issued && !request.acknowledged) lockAttempt();
      request?.controller.abort();
      flight.current = null;
    };
    // The keyed form owns one account/configuration scope. Its initial lock
    // callback writes the account's stable ref, including StrictMode cleanup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const computedFullName = `${firstName.trim()} ${lastName.trim()}`.trim();
  const effectiveFullName = fullNameTouched && fullName.trim() ? fullName.trim() : computedFullName;

  // Resolve the effective email so we can detect the reserved 365 staff domain
  // in real time (covers both the suffix-locked form and a free-text email).
  const previewEmail = enforceDomain
    ? `${emailUser.trim().toLowerCase()}${enforceDomain.toLowerCase()}`
    : email.trim().toLowerCase();
  const isStaffDomain =
    (!!enforceDomain && enforceDomain.toLowerCase() === STAFF_EMAIL_DOMAIN) ||
    isStaffEmail(previewEmail);

  // Whenever the email resolves to the 365 staff domain, force the account
  // type to "staff" — private/business is never a valid choice for @365.
  useEffect(() => {
    if (isStaffDomain && accountType !== "staff") {
      setAccountType("staff");
    }
  }, [isStaffDomain, accountType]);

  const reset = () => {
    setTab("identity");
    setEmail("");
    setEmailUser("");
    setPersonalEmail("");
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
  const changeOpen = (nextOpen: boolean) => {
    if (!lifecycle.current.alive) return;
    lifecycle.current.epoch = {};
    lifecycle.current.open = nextOpen;
    const request = flight.current;
    if (request?.issued && !request.acknowledged) lockAttempt();
    request?.controller.abort();
    flight.current = null;
    setSubmitting(false);
    setOpen(nextOpen);
    // Clear displayed private fields on close/reopen. An already-dispatched
    // transport can still retain its captured request; this is not erasure.
    reset();
  };

  const toggleRole = (r: StaffRole) =>
    setRoles((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));

  const copyPw = async () => {
    if (!lifecycle.current.alive || !lifecycle.current.open || flight.current || lock.locked)
      return;
    const epoch = lifecycle.current.epoch;
    const text = password;
    try {
      await navigator.clipboard.writeText(text);
      if (lifecycle.current.alive && lifecycle.current.open && lifecycle.current.epoch === epoch)
        toast.message("Password copied.");
    } catch {
      if (lifecycle.current.alive && lifecycle.current.open && lifecycle.current.epoch === epoch)
        toast.error("Could not copy password.");
    }
  };

  const submit = async () => {
    if (!lifecycle.current.alive || !lifecycle.current.open || flight.current || lock.locked)
      return;
    // Compose the auth email. When a domain is enforced, the admin only types
    // the local part (the part before "@"); we append the suffix here.
    const composedEmail = enforceDomain
      ? `${emailUser.trim().toLowerCase()}${enforceDomain.toLowerCase()}`
      : email.trim().toLowerCase();
    const localOk = enforceDomain
      ? /^[a-z0-9][a-z0-9._-]*$/.test(emailUser.trim().toLowerCase())
      : true;

    if (!composedEmail || !firstName.trim() || !lastName.trim() || !password) {
      toast.error("Fill email, first/last name and password");
      setTab("identity");
      return;
    }
    if (enforceDomain && !localOk) {
      toast.error("Username can only contain letters, numbers, dot, underscore, hyphen");
      setTab("identity");
      return;
    }
    if (personalEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalEmail.trim())) {
      toast.error("Personal email looks invalid");
      setTab("identity");
      return;
    }
    if (password.length < 8 || password.length > 72) {
      toast.error("Password must contain 8 to 72 characters.");
      setTab("identity");
      return;
    }
    if (accountType === "business" && sellerType !== "private") {
      // The unchanged API does not accept this historical UI value. Do not
      // silently reinterpret it as dealer/repair_shop or issue a known-invalid
      // creation request that would enter the post-dispatch uncertainty lock.
      toast.error(
        "This seller type is not supported by account creation. Select Private before submitting.",
      );
      setTab("business");
      return;
    }

    // Guard against accidentally creating an empty profile: if the admin left
    // phone AND the entire personal address blank (and — for business — the
    // business address too), confirm before creating so we don't end up with
    // a user we then have to backfill by hand.
    const personalAddressEmpty = Object.values(address).every((v) => (v as string).trim() === "");
    const businessAddressEmpty =
      accountType !== "business" ||
      Object.values(bizAddress).every((v) => (v as string).trim() === "");
    if (!phone.trim() && personalAddressEmpty && businessAddressEmpty) {
      const ok = window.confirm(
        "You haven't entered a phone number or address for this user. Create the account anyway?",
      );
      if (!ok) {
        setTab("identity");
        return;
      }
    }

    const body: any = {
      email: composedEmail,
      full_name: effectiveFullName || `${firstName.trim()} ${lastName.trim()}`.trim(),
      first_name: firstName.trim() || undefined,
      last_name: lastName.trim() || undefined,
      phone: phone.trim() || undefined,
      personal_email: personalEmail.trim().toLowerCase() || undefined,
      password,
      account_type: accountType,
      roles: accountType === "staff" ? roles : [],
      ...Object.fromEntries(Object.entries(address).filter(([, v]) => (v as string).trim() !== "")),
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
    // Capture every requested value before the first await. This is still a
    // multi-step server operation, not an atomic account/role/profile change.
    const validated = CreationBody.safeParse(body);
    if (!validated.success) {
      toast.error(invalidDetails);
      setTab("identity");
      return;
    }
    const serialized = JSON.stringify(validated.data);
    const request: Flight = {
      epoch: lifecycle.current.epoch,
      controller: new AbortController(),
      issued: false,
      acknowledged: false,
    };
    flight.current = request; // Synchronous one-flight guard, before state flush.
    setSubmitting(true);
    try {
      if (!current(request)) return;
      const { data: sess, error } = await supabase.auth.getSession();
      if (!current(request)) return;
      const token = sess.session?.access_token;
      if (error || !token || sess.session?.user.id !== accountId) {
        toast.error(preparationFailure);
        return;
      }
      if (!current(request)) return;
      request.issued = true;
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: serialized,
        signal: request.controller.signal,
      });
      if (!current(request)) return;
      const data: unknown = await res.json();
      if (!current(request)) return;
      // Both existing 207 envelopes represent partial creation. Even 200 only
      // acknowledges this API contract; it has no affected-row/audit receipt.
      if (res.status !== 200 || !res.ok || !isAcknowledgment(data, composedEmail)) {
        lockAttempt();
        return;
      }
      request.acknowledged = true;
      toast.message(acknowledgment);
      try {
        const callback: unknown = onCreated?.();
        // Existing consumers can return an asynchronous refresh despite the
        // void callback type. Consume its rejection without delaying closure.
        // This does not fence the consumer's own independent load operation.
        void Promise.resolve(callback).catch(() => undefined);
      } catch {
        // A consumer refresh exception cannot turn a known acknowledgment into
        // permission to resubmit the already-issued creation request.
      } finally {
        if (current(request)) changeOpen(false);
      }
    } catch {
      if (current(request)) {
        if (request.issued) lockAttempt();
        else toast.error(preparationFailure);
      }
    } finally {
      if (current(request)) {
        flight.current = null;
        setSubmitting(false);
      }
    }
  };

  const tabIndex = TABS.indexOf(tab);
  const isLast = tabIndex === TABS.length - 1;
  const next = () => setTab(TABS[Math.min(TABS.length - 1, tabIndex + 1)]);
  const back = () => setTab(TABS[Math.max(0, tabIndex - 1)]);

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
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
              Submit an account-creation request. An acknowledgment does not verify role
              assignments, profile fields or audit records.
            </DialogDescription>
          </DialogHeader>

          <p className="text-xs text-muted-foreground">
            Closing after dispatch does not prove cancellation. Inspect records before beginning
            another creation request.
          </p>

          {unknown && (
            <p role="alert" className="rounded-md border border-amber-400 p-3 text-sm">
              {unknownOutcome}
            </p>
          )}

          {enforceDomain && (
            <div className="flex gap-2 rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />
              <div>
                Outbound mail sends via <strong>notify.365motorsales.com</strong>. Inbound mail to a
                new <strong>{enforceDomain}</strong> address needs a Cloudflare routing rule.
              </div>
            </div>
          )}

          <fieldset disabled={submitting || unknown} className="min-w-0 border-0 p-0">
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
                {enforceDomain ? (
                  <Field label={`Work email * ${enforceDomain}`}>
                    <div className="flex items-stretch overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
                      <Input
                        aria-label="Work email local part"
                        className="h-9 flex-1 rounded-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                        value={emailUser}
                        onChange={(e) =>
                          setEmailUser(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))
                        }
                        placeholder="firstname.lastname"
                        autoComplete="off"
                      />
                      <span className="flex select-none items-center bg-muted px-3 text-sm text-muted-foreground">
                        {enforceDomain}
                      </span>
                    </div>
                  </Field>
                ) : (
                  <Field label="Email *">
                    <Input
                      aria-label="Email"
                      className={compactInput()}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@example.com"
                    />
                  </Field>
                )}
                <Field label="Personal email">
                  <Input
                    aria-label="Personal email"
                    className={compactInput()}
                    type="email"
                    value={personalEmail}
                    onChange={(e) => setPersonalEmail(e.target.value)}
                    placeholder="optional — personal contact email"
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="First name *">
                    <Input
                      aria-label="First name"
                      className={compactInput()}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Billy"
                    />
                  </Field>
                  <Field label="Last name *">
                    <Input
                      aria-label="Last name"
                      className={compactInput()}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Bailey"
                    />
                  </Field>
                  <Field label="Full name (display)">
                    <Input
                      aria-label="Full name"
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
                      aria-label="Phone"
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
                      aria-label="Temporary password"
                      autoComplete="new-password"
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
                      {" "}
                      Email must end with <strong>{enforceDomain}</strong>. Add a matching rule in{" "}
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
                {isStaffDomain && (
                  <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
                    <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    <div>
                      <strong>{STAFF_EMAIL_DOMAIN}</strong> is reserved for 365 employees. Account
                      type is locked to <strong>Staff / Employee</strong> — Private seller and
                      Business are disabled for this email.
                    </div>
                  </div>
                )}
                {!lockStaff && (
                  <Field label="Account type">
                    <Select
                      value={accountType}
                      onValueChange={(v: any) => {
                        if (isStaffDomain) return; // enforced by domain
                        setAccountType(v);
                      }}
                      disabled={isStaffDomain}
                    >
                      <SelectTrigger className={compactInput()}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Staff / Employee</SelectItem>
                        <SelectItem value="business" disabled={isStaffDomain}>
                          Business / Customer{isStaffDomain ? " — locked for @365" : ""}
                        </SelectItem>
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
                            <SelectItem value="business">
                              Business (not supported by this creation workflow)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Business kind">
                        <BusinessKindSelect value={businessKind} onChange={setBusinessKind} />
                      </Field>
                      <div className="sm:col-span-2">
                        <Field label="Business name">
                          <Input
                            aria-label="Business name"
                            className={compactInput()}
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                          />
                        </Field>
                      </div>
                      <div className="sm:col-span-2">
                        <Field label="Business address">
                          <Input
                            aria-label="Business address"
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
                          aria-label="Business city"
                          className={compactInput()}
                          value={bizAddress.business_city}
                          onChange={(e) =>
                            setBizAddress((s) => ({ ...s, business_city: e.target.value }))
                          }
                        />
                      </Field>
                      <Field label="Business province">
                        <Input
                          aria-label="Business province"
                          className={compactInput()}
                          value={bizAddress.business_province}
                          onChange={(e) =>
                            setBizAddress((s) => ({ ...s, business_province: e.target.value }))
                          }
                        />
                      </Field>
                      <Field label="Business region">
                        <Input
                          aria-label="Business region"
                          className={compactInput()}
                          value={bizAddress.business_region}
                          onChange={(e) =>
                            setBizAddress((s) => ({ ...s, business_region: e.target.value }))
                          }
                        />
                      </Field>
                      <Field label="Business postal code">
                        <Input
                          aria-label="Business postal code"
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
                    <RoleChips
                      roles={roles}
                      onToggle={toggleRole}
                      disabled={submitting || unknown}
                    />
                    <InfoTip>
                      <ul className="ml-3 list-disc space-y-0.5">
                        <li>
                          <strong>admin</strong> — full access.
                        </li>
                        <li>
                          <strong>moderator</strong> — listings &amp; users.
                        </li>
                        <li>
                          <strong>support</strong> — support tickets.
                        </li>
                        <li>
                          <strong>sales</strong> — sales pipeline.
                        </li>
                        <li>
                          <strong>advertising</strong> — ad inquiries.
                        </li>
                      </ul>
                    </InfoTip>
                  </div>
                </Field>
                <p className="text-xs text-muted-foreground">
                  Requested roles and any staff referral setup need separate inspection.
                </p>
              </TabsContent>

              <TabsContent value="ads" className="mt-3">
                <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Advertisement templates (QR posters, QR ad cards) become available after the user
                  is created. Open Edit on the new user to assign template presets.
                </div>
              </TabsContent>
            </Tabs>
          </fieldset>

          <DialogFooter className="mt-2 flex items-center justify-between gap-2 sm:justify-between">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => changeOpen(false)}>
                Close
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
              <Button onClick={submit} disabled={submitting || unknown}>
                {submitting ? "Creating…" : "Create user"}
              </Button>
            </div>
          </DialogFooter>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
