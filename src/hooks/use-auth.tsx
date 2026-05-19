import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { sendTransactionalEmail } from "@/lib/email/send";

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
  try { raw = window.localStorage.getItem("signup.pending"); } catch { return; }
  if (!raw) return;
  try {
    const pending = JSON.parse(raw) as {
      intent?: "buyer" | "private_seller" | "business" | "service_provider";
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
      await supabase.from("profiles").update(update as never).eq("id", user.id);
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

export type AppRole = "admin" | "sales" | "moderator" | "support" | "advertising" | "user";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isSales: boolean;
  isModerator: boolean;
  isSupport: boolean;
  isAdvertising: boolean;
  isStaff: boolean;
  realRoles: AppRole[];
  effectiveRoles: AppRole[];
  realIsAdmin: boolean;
  simulatedRoles: AppRole[] | null;
  setSimulatedRoles: (roles: AppRole[] | null) => void;
  refreshSession: (session?: Session | null) => Promise<Session | null>;
  signOut: () => Promise<void>;
}

const SIM_KEY = "sandbox.roles";
function loadSim(): AppRole[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SIM_KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return null;
    return arr.filter((r) => typeof r === "string") as AppRole[];
  } catch { return null; }
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [simulatedRoles, setSimulatedRolesState] = useState<AppRole[] | null>(() => loadSim());
  const lastUidRef = useRef<string | null>(null);
  const welcomeCheckedRef = useRef(new Set<string>());

  const loadRoles = useCallback(async (uid: string) => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);
      setRoles((data ?? []).map((r: any) => r.role));
  }, []);

  const handleSession = useCallback((newSession: Session | null) => {
    setSession(newSession);
    setUser(newSession?.user ?? null);
    const uid = newSession?.user?.id ?? null;
    if (uid && uid !== lastUidRef.current) {
      lastUidRef.current = uid;
      const u = newSession!.user;
      setTimeout(() => {
        loadRoles(uid);
        if (!welcomeCheckedRef.current.has(uid)) {
          welcomeCheckedRef.current.add(uid);
          maybeApplyPendingSignup(u).finally(() => maybeSendWelcomeEmail(u));
        }
      }, 0);
    } else if (!uid) {
      lastUidRef.current = null;
      setRoles([]);
    }
  }, [loadRoles]);

  const refreshSession = useCallback(async (providedSession?: Session | null) => {
    const nextSession = providedSession !== undefined
      ? providedSession
      : (await supabase.auth.getSession()).data.session;
    handleSession(nextSession ?? null);
    setLoading(false);
    return nextSession ?? null;
  }, [handleSession]);

  useEffect(() => {

    // Listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      handleSession(newSession);
    });

    refreshSession();

    return () => sub.subscription.unsubscribe();
  }, [handleSession, refreshSession]);

  const signOut = async () => {
    await supabase.auth.signOut();
    handleSession(null);
    setLoading(false);
  };

  const realRoles = roles as AppRole[];
  const realIsAdmin = realRoles.includes("admin");
  const effectiveRoles: AppRole[] = realIsAdmin && simulatedRoles ? simulatedRoles : realRoles;

  const setSimulatedRoles = (next: AppRole[] | null) => {
    setSimulatedRolesState(next);
    try {
      if (next && next.length > 0) window.localStorage.setItem(SIM_KEY, JSON.stringify(next));
      else window.localStorage.removeItem(SIM_KEY);
    } catch {}
  };

  const isAdmin = effectiveRoles.includes("admin");
  const isSales = effectiveRoles.includes("sales");
  const isModerator = effectiveRoles.includes("moderator");
  const isSupport = effectiveRoles.includes("support");
  const isAdvertising = effectiveRoles.includes("advertising");
  const isStaff = isAdmin || isSales || isModerator || isSupport || isAdvertising;

  return (
    <AuthContext.Provider
      value={{ user, session, loading, isAdmin, isSales, isModerator, isSupport, isAdvertising, isStaff, realRoles, effectiveRoles, realIsAdmin, simulatedRoles, setSimulatedRoles, refreshSession, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
