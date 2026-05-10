import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { sendTransactionalEmail } from "@/lib/email/send";

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

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        const u = newSession.user;
        setTimeout(async () => {
          const { data } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", u.id)
            .eq("role", "admin")
            .maybeSingle();
          setIsAdmin(!!data);
          maybeSendWelcomeEmail(u);
        }, 0);
      } else {
        setIsAdmin(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
      if (data.session?.user) {
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.session.user.id)
          .eq("role", "admin")
          .maybeSingle()
          .then(({ data: roleData }) => setIsAdmin(!!roleData));
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
