import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sendTransactionalEmail } from "@/lib/email/send";

export type AuthErrorKind = "refresh_failed" | "bootstrap_failed" | "safety_timeout";

/**
 * Structured auth logger. Emits a single-line JSON payload prefixed with
 * `[auth]` so hanging sign-in reports can be grep'd from browser logs or
 * shipped to an aggregator later. Keep fields stable — don't rename keys
 * without updating any dashboards that consume them.
 */
type AuthLogLevel = "info" | "warn" | "error";
type AuthLogFields = {
  event: string;
  uid?: string | null;
  email?: string | null;
  route?: string;
  durationMs?: number;
  error?: string;
  [k: string]: unknown;
};
function currentRoute(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.location.pathname + window.location.search;
}
function authLog(level: AuthLogLevel, fields: AuthLogFields) {
  const payload = {
    ts: new Date().toISOString(),
    route: currentRoute(),
    ...fields,
  };
  const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.info;
  try {
    fn("[auth]", JSON.stringify(payload));
  } catch {
    fn("[auth]", payload);
  }
}
function errMsg(e: unknown): string {
  if (!e) return "unknown";
  if (e instanceof Error) return e.message;
  try {
    return typeof e === "string" ? e : JSON.stringify(e);
  } catch {
    return String(e);
  }
}

function normalizePhPhone(raw?: string): string | undefined {
  if (!raw) return undefined;
  const d = raw.replace(/[^0-9+]/g, "");
  if (d.startsWith("+")) return d;
  if (/^09\d{9}$/.test(d)) return "+63" + d.slice(1);
  if (/^9\d{9}$/.test(d)) return "+63" + d;
  if (/^63\d{10}$/.test(d)) return "+" + d;
  return undefined;
}

async function maybeApplyPendingSignup(user: User) {
  if (typeof window === "undefined") return;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem("signup.pending");
  } catch {
    return;
  }
  if (!raw) return;
  try {
    const pending = JSON.parse(raw) as {
      intent?: "buyer" | "business" | "service_provider";
      full_name?: string;
      first_name?: string;
      last_name?: string;
      phone?: string;
      business_name?: string;
      business_address?: string;
      business_kind?: string;
      region?: string;
      province?: string;
      city?: string;
      is_business?: boolean;
    };
    const update: Record<string, unknown> = {};
    if (pending.intent) update.signup_intent = pending.intent;
    if (pending.city) update.signup_city = pending.city;
    if (pending.region) update.signup_region = pending.region;
    if (pending.province) update.signup_province = pending.province;
    if (pending.full_name) update.full_name = pending.full_name;
    if (pending.first_name) update.first_name = pending.first_name;
    if (pending.last_name) update.last_name = pending.last_name;
    if (pending.phone) {
      update.phone = pending.phone;
      const e164 = normalizePhPhone(pending.phone);
      if (e164) update.phone_e164 = e164;
    }
    if (pending.is_business) {
      update.seller_type = "dealer";
      if (pending.business_name) update.business_name = pending.business_name;
      if (pending.business_address) update.business_address = pending.business_address;
      if (pending.business_kind) update.business_kind = pending.business_kind;
      if (pending.region) update.business_region = pending.region;
      if (pending.province) update.business_province = pending.province;
      if (pending.city) update.business_city = pending.city;
    }
    if (Object.keys(update).length > 0) {
      await supabase
        .from("profiles")
        .update(update as never)
        .eq("id", user.id);
    }
    window.localStorage.removeItem("signup.pending");
  } catch (err) {
    console.warn("[signup.pending] failed", err);
  }
}

async function maybeSendWelcomeEmail(user: User) {
  if (!user.email || !user.email_confirmed_at) return;
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, welcome_email_sent_at")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile || profile.welcome_email_sent_at) return;
    const result = await sendTransactionalEmail({
      templateName: "signup-welcome",
      recipientEmail: user.email,
      idempotencyKey: `welcome-${user.id}`,
      templateData: {
        name:
          (profile.full_name as string | null)?.split(" ")[0] ||
          (user.user_metadata?.full_name as string | undefined)?.split(" ")[0],
      },
    });
    if (result?.ok !== false) {
      await supabase
        .from("profiles")
        .update({ welcome_email_sent_at: new Date().toISOString() })
        .eq("id", user.id);
    }
  } catch (err) {
    console.warn("[welcome-email] failed", err);
  }
}

export type AppRole =
  | "admin"
  | "sales"
  | "sales_junior"
  | "sales_senior"
  | "sales_manager"
  | "moderator"
  | "support"
  | "advertising"
  | "user";
export type SellerType = "private" | "dealer" | "repair_shop" | "insurance";
export type SalesTier = null | "junior" | "senior" | "manager";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profileName: string | null;
  isAdmin: boolean;
  isSales: boolean;
  isModerator: boolean;
  isSupport: boolean;
  isAdvertising: boolean;
  isStaff: boolean;
  salesTier: SalesTier;
  canManageAds: boolean;
  canCreatePromotions: boolean;
  canIssueDiscounts: boolean;
  realRoles: AppRole[];
  effectiveRoles: AppRole[];
  realIsAdmin: boolean;
  simulatedRoles: AppRole[] | null;
  setSimulatedRoles: (roles: AppRole[] | null) => void;
  realSellerType: SellerType;
  effectiveSellerType: SellerType;
  simulatedSellerType: SellerType | null;
  setSimulatedSellerType: (next: SellerType | null) => void;
  /** True if the effective (persona-aware) roles include `role`. */
  hasRole: (role: AppRole) => boolean;
  /** True if the effective (persona-aware) roles include any of `roles`. */
  hasAnyRole: (roles: readonly AppRole[]) => boolean;
  /**
   * Clear any persona simulation and return to the real admin identity.
   * Returns a verification object confirming the effective roles/seller-type
   * now match the real user's — callers can surface this to prove scope reset.
   */
  resetPersona: () => {
    ok: boolean;
    effectiveRoles: AppRole[];
    realRoles: AppRole[];
    effectiveSellerType: SellerType;
    realSellerType: SellerType;
  };
  refreshSession: (session?: Session | null) => Promise<Session | null>;
  signOut: () => Promise<void>;
  /** Non-null when the last auth bootstrap/refresh failed and the user needs to re-auth. */
  authError: AuthErrorKind | null;
  /** Clears local session state and sends the user back to /auth to sign in again. */
  retryAuth: () => Promise<void>;

}


const SIM_KEY = "sandbox.roles";
const SIM_SELLER_KEY = "sandbox.sellerType";
const VALID_SELLER_TYPES: SellerType[] = ["private", "dealer", "repair_shop", "insurance"];

function loadSim(): AppRole[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SIM_KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return null;
    return arr.filter((r) => typeof r === "string") as AppRole[];
  } catch {
    return null;
  }
}

function loadSimSellerType(): SellerType | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SIM_SELLER_KEY);
    if (!raw) return null;
    return VALID_SELLER_TYPES.includes(raw as SellerType) ? (raw as SellerType) : null;
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [authError, setAuthError] = useState<AuthErrorKind | null>(null);
  const authErrorToastRef = useRef<string | number | null>(null);

  const [realSellerType, setRealSellerType] = useState<SellerType>("private");
  // Initialize as null to match SSR output, then hydrate from localStorage
  // after mount so the persona survives refreshes without a hydration mismatch.
  const [simulatedRoles, setSimulatedRolesState] = useState<AppRole[] | null>(null);
  const [simulatedSellerType, setSimulatedSellerTypeState] = useState<SellerType | null>(null);

  useEffect(() => {
    const r = loadSim();
    if (r && r.length > 0) setSimulatedRolesState(r);
    const s = loadSimSellerType();
    if (s) setSimulatedSellerTypeState(s);
  }, []);

  const lastUidRef = useRef<string | null>(null);
  const welcomeCheckedRef = useRef(new Set<string>());

  // Track in-flight retry timers per uid so a new session (or sign-out) can
  // cancel a pending retry cleanly and we don't leak overlapping loops.
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryUidRef = useRef<string | null>(null);

  const cancelPendingRetry = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    retryUidRef.current = null;
  }, []);

  const loadRoles = useCallback(
    async (uid: string, attempt = 0): Promise<void> => {
      // A newer session for a different uid supersedes any pending retry.
      if (retryUidRef.current && retryUidRef.current !== uid) cancelPendingRetry();
      setRolesLoading(true);
      const started = Date.now();
      // Backoff schedule: 1s, 2s, 4s (max 3 retries after initial attempt).
      const MAX_ATTEMPTS = 3;
      const scheduleRetry = (reason: string) => {
        if (attempt >= MAX_ATTEMPTS) {
          authLog("error", {
            event: "loadRoles.retry_exhausted",
            uid,
            attempt,
            reason,
          });
          setRolesLoading(false);
          return;
        }
        const delay = Math.min(1000 * 2 ** attempt, 8000);
        authLog("warn", {
          event: "loadRoles.retry_scheduled",
          uid,
          attempt: attempt + 1,
          delayMs: delay,
          reason,
        });
        cancelPendingRetry();
        retryUidRef.current = uid;
        retryTimerRef.current = setTimeout(() => {
          retryTimerRef.current = null;
          // Skip if the session changed while we were waiting.
          if (lastUidRef.current !== uid) return;
          void loadRoles(uid, attempt + 1);
        }, delay);
      };

      try {
        const timeout = new Promise<"timeout">((resolve) =>
          setTimeout(() => resolve("timeout"), 8000),
        );
        const query = Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", uid),
          supabase.from("profiles").select("seller_type, full_name").eq("id", uid).maybeSingle(),
        ]);
        const result = await Promise.race([query, timeout]);
        if (result === "timeout") {
          authLog("warn", {
            event: "loadRoles.timeout",
            uid,
            attempt,
            durationMs: Date.now() - started,
          });
          scheduleRetry("timeout");
          return;
        }
        const [{ data: roleRows, error: rolesErr }, { data: profileRow, error: profErr }] = result;
        if (rolesErr || profErr) {
          authLog("warn", {
            event: "loadRoles.partial_error",
            uid,
            attempt,
            durationMs: Date.now() - started,
            rolesError: rolesErr?.message,
            profileError: profErr?.message,
          });
          // Retry only when we got no roles back at all — a partial success
          // (roles loaded, profile 500) is still usable and shouldn't loop.
          if (rolesErr && !roleRows) {
            scheduleRetry(rolesErr.message || "roles_error");
            return;
          }
        }
        const roleList = (roleRows ?? []).map((r: any) => r.role);
        setRoles(roleList);
        const st = (profileRow as any)?.seller_type;
        setRealSellerType(VALID_SELLER_TYPES.includes(st) ? (st as SellerType) : "private");
        setProfileName((profileRow as any)?.full_name ?? null);
        cancelPendingRetry();
        authLog("info", {
          event: "loadRoles.ok",
          uid,
          attempt,
          durationMs: Date.now() - started,
          roleCount: roleList.length,
        });
        setRolesLoading(false);
      } catch (err) {
        authLog("error", {
          event: "loadRoles.failed",
          uid,
          attempt,
          durationMs: Date.now() - started,
          error: errMsg(err),
        });
        scheduleRetry(errMsg(err));
      }
    },
    [cancelPendingRetry],
  );



  const handleSession = useCallback(
    (newSession: Session | null) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      const uid = newSession?.user?.id ?? null;
      if (uid && uid !== lastUidRef.current) {
        lastUidRef.current = uid;
        const u = newSession!.user;
        // Mark roles as loading synchronously so role-gated routes (e.g.
        // /admin) don't briefly see roles=[] and bounce the user to
        // /dashboard before the async role load completes.
        setRolesLoading(true);
        setTimeout(() => {
          loadRoles(uid);
          if (!welcomeCheckedRef.current.has(uid)) {
            welcomeCheckedRef.current.add(uid);
            maybeApplyPendingSignup(u).finally(() => maybeSendWelcomeEmail(u));
          }
        }, 0);
      } else if (!uid) {
        lastUidRef.current = null;
        cancelPendingRetry();
        setRoles([]);
        setRealSellerType("private");
        setProfileName(null);
        setRolesLoading(false);
      }
    },
    [loadRoles, cancelPendingRetry],
  );

  // Clear any pending retry when the provider unmounts.
  useEffect(() => () => cancelPendingRetry(), [cancelPendingRetry]);

  // The header "Signing you in…" pill is gated on authLoading only.
  // Roles arriving late shouldn't keep the pill spinning; role-gated
  // routes check rolesLoading separately.
  const loading = authLoading;


  const refreshSession = useCallback(
    async (providedSession?: Session | null) => {
      const nextSession =
        providedSession !== undefined
          ? providedSession
          : (await supabase.auth.getSession()).data.session;
      handleSession(nextSession ?? null);
      setAuthLoading(false);
      return nextSession ?? null;
    },
    [handleSession],
  );

  useEffect(() => {
    let cancelled = false;
    const bootStarted = Date.now();
    authLog("info", { event: "bootstrap.start" });

    // Safety timeout: if bootstrap never resolves (network stall, wedged
    // supabase client), release the UI after 8s. Any real session will
    // still populate via onAuthStateChange.
    const safetyTimer = setTimeout(() => {
      if (cancelled) return;
      setAuthLoading((prev) => {
        if (prev) {
          authLog("error", {
            event: "bootstrap.safety_timeout",
            durationMs: Date.now() - bootStarted,
          });
          setAuthError("safety_timeout");
        }
        return false;
      });
    }, 8000);

    // Listener FIRST — also clears loading so we render as soon as
    // Supabase emits INITIAL_SESSION from the persisted storage token.
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (cancelled) return;
      authLog("info", {
        event: "authStateChange",
        supabaseEvent: event,
        uid: newSession?.user?.id ?? null,
        email: newSession?.user?.email ?? null,
        hasSession: !!newSession,
      });
      // Refresh failed / signed out / no session on init → hard reset.
      if (event === "SIGNED_OUT" || !newSession) {
        if (event === "TOKEN_REFRESHED" && !newSession) {
          authLog("error", { event: "token_refresh.failed" });
          setAuthError("refresh_failed");
        }
        handleSession(null);
        setAuthLoading(false);
        setRolesLoading(false);
        return;
      }
      // Successful (re-)authentication clears any prior error.
      setAuthError(null);
      handleSession(newSession);
      setAuthLoading(false);
    });

    // Re-validate the persisted session with the Auth server (getUser) rather
    // than trusting the localStorage token blindly. If getUser errors (stale
    // refresh token, revoked session), wipe the local session so the UI
    // renders as signed-out instead of hanging on the bad token.
    (async () => {
      try {
        const { data: userData, error } = await supabase.auth.getUser();
        if (cancelled) return;
        if (error || !userData.user) {
          authLog("warn", {
            event: "bootstrap.getUser_failed",
            durationMs: Date.now() - bootStarted,
            error: error ? errMsg(error) : "no_user",
            errorStatus: (error as any)?.status,
          });
          // Only flag as an error worth surfacing if we actually had a
          // persisted session token that failed to validate. First-time
          // visitors with no token shouldn't see a re-auth toast.
          const hadPersistedToken =
            typeof window !== "undefined" &&
            Object.keys(window.localStorage ?? {}).some((k) => k.startsWith("sb-"));
          if (hadPersistedToken) setAuthError("refresh_failed");
          try {
            await supabase.auth.signOut({ scope: "local" });
          } catch (e) {
            authLog("warn", { event: "bootstrap.local_signout_failed", error: errMsg(e) });
          }
          handleSession(null);
        } else {
          const { data: sessData } = await supabase.auth.getSession();
          if (cancelled) return;
          authLog("info", {
            event: "bootstrap.ok",
            uid: userData.user.id,
            email: userData.user.email,
            durationMs: Date.now() - bootStarted,
            hasSession: !!sessData.session,
          });
          handleSession(sessData.session ?? null);
        }
      } catch (err) {
        if (cancelled) return;
        authLog("error", {
          event: "bootstrap.exception",
          durationMs: Date.now() - bootStarted,
          error: errMsg(err),
        });
        setAuthError("bootstrap_failed");
        try {
          await supabase.auth.signOut({ scope: "local" });
        } catch (e) {
          authLog("warn", { event: "bootstrap.local_signout_failed", error: errMsg(e) });
        }
        handleSession(null);

      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
      sub.subscription.unsubscribe();
    };
  }, [handleSession]);


  const signOut = async () => {
    await supabase.auth.signOut();
    handleSession(null);
    setAuthLoading(false);
    setAuthError(null);
  };

  const retryAuth = useCallback(async () => {
    authLog("info", { event: "retryAuth.start" });
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch (e) {
      authLog("warn", { event: "retryAuth.local_signout_failed", error: errMsg(e) });
    }
    handleSession(null);
    setAuthError(null);
    setAuthLoading(false);
    if (typeof window !== "undefined") {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.assign(`/auth?next=${next}`);
    }
  }, [handleSession]);

  // Surface a persistent toast with a "Try again" action whenever we detect
  // a broken session. Dedupes so we never stack multiple error toasts.
  useEffect(() => {
    if (!authError) {
      if (authErrorToastRef.current !== null) {
        toast.dismiss(authErrorToastRef.current);
        authErrorToastRef.current = null;
      }
      return;
    }
    if (authErrorToastRef.current !== null) return;
    const message =
      authError === "refresh_failed"
        ? "Your session expired"
        : authError === "safety_timeout"
        ? "Sign-in is taking too long"
        : "We couldn't verify your session";
    authErrorToastRef.current = toast.error(message, {
      description: "Please sign in again to continue.",
      duration: Infinity,
      action: {
        label: "Try again",
        onClick: () => {
          void retryAuth();
        },
      },
    });
  }, [authError, retryAuth]);

  const realRoles = roles as AppRole[];
  const realIsAdmin = realRoles.includes("admin");
  const effectiveRoles: AppRole[] = realIsAdmin && simulatedRoles ? simulatedRoles : realRoles;

  const setSimulatedRoles = (next: AppRole[] | null) => {
    setSimulatedRolesState(next);
    try {
      if (next && next.length > 0) window.localStorage.setItem(SIM_KEY, JSON.stringify(next));
      else window.localStorage.removeItem(SIM_KEY);
    } catch {
      // localStorage may be unavailable (private mode); simulation persists in memory only.
    }
  };

  const isAdmin = effectiveRoles.includes("admin");
  const isSales =
    effectiveRoles.includes("sales") ||
    effectiveRoles.includes("sales_junior") ||
    effectiveRoles.includes("sales_senior") ||
    effectiveRoles.includes("sales_manager");
  const isModerator = effectiveRoles.includes("moderator");
  const isSupport = effectiveRoles.includes("support");
  const isAdvertising = effectiveRoles.includes("advertising");
  const isStaff = isAdmin || isSales || isModerator || isSupport || isAdvertising;

  // Sales tier: manager > senior > junior. Legacy 'sales' role = senior.
  const salesTier: SalesTier = effectiveRoles.includes("sales_manager")
    ? "manager"
    : effectiveRoles.includes("sales_senior") || effectiveRoles.includes("sales")
      ? "senior"
      : effectiveRoles.includes("sales_junior")
        ? "junior"
        : null;
  const tierLvl =
    salesTier === "manager" ? 3 : salesTier === "senior" ? 2 : salesTier === "junior" ? 1 : 0;
  const canManageAds = isAdmin || isAdvertising || tierLvl >= 2;
  const canCreatePromotions = isAdmin || tierLvl >= 2;
  const canIssueDiscounts = isAdmin || tierLvl >= 3;

  // Seller-type simulation is allowed for any staff role.
  const realIsStaff = realRoles.some((r) =>
    [
      "admin",
      "sales",
      "sales_junior",
      "sales_senior",
      "sales_manager",
      "moderator",
      "support",
      "advertising",
    ].includes(r),
  );
  const effectiveSellerType: SellerType =
    realIsStaff && simulatedSellerType ? simulatedSellerType : realSellerType;

  const setSimulatedSellerType = (next: SellerType | null) => {
    setSimulatedSellerTypeState(next);
    try {
      if (next) window.localStorage.setItem(SIM_SELLER_KEY, next);
      else window.localStorage.removeItem(SIM_SELLER_KEY);
    } catch {
      // localStorage may be unavailable; seller-type simulation persists in memory only.
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        profileName,
        isAdmin,
        isSales,
        isModerator,
        isSupport,
        isAdvertising,
        isStaff,
        salesTier,
        canManageAds,
        canCreatePromotions,
        canIssueDiscounts,
        realRoles,
        effectiveRoles,
        realIsAdmin,
        simulatedRoles,
        setSimulatedRoles,
        realSellerType,
        effectiveSellerType,
        simulatedSellerType,
        setSimulatedSellerType,
        hasRole: (role) => effectiveRoles.includes(role),
        hasAnyRole: (rs) => rs.some((r) => effectiveRoles.includes(r)),
        resetPersona: () => {
          setSimulatedRoles(null);
          setSimulatedSellerType(null);
          return {
            ok:
              JSON.stringify([...effectiveRoles].sort()) ===
                JSON.stringify([...realRoles].sort()) &&
              effectiveSellerType === realSellerType,
            effectiveRoles: realRoles,
            realRoles,
            effectiveSellerType: realSellerType,
            realSellerType,
          };
        },
        refreshSession,
        signOut,
        authError,
        retryAuth,

      }}

    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- Provider + hook colocation (React idiom)
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
