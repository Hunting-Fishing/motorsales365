import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TemplateCard } from "@/components/share-kit/template-card";
import { TEMPLATES } from "@/lib/share-kit/templates";
import { siteOrigin } from "@/lib/site-config";

type Props = {
  userId: string;
  fullName: string;
  email?: string | null;
};

type StaffRow = {
  referral_code: string;
  full_name: string;
  active: boolean;
};

export function UserAdvertisementsTab({ userId, fullName, email }: Props) {
  const [staff, setStaff] = useState<StaffRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const filters: string[] = [`staff_user_id.eq.${userId}`];
      if (email) filters.push(`email.eq.${email.toLowerCase()}`);
      const { data } = await (supabase as any)
        .from("staff_referrals")
        .select("referral_code, full_name, active")
        .or(filters.join(","))
        .maybeSingle();
      if (!cancelled) {
        setStaff((data as StaffRow | null) ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, email]);

  if (loading) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Loading personalized ads…
      </p>
    );
  }

  if (!staff) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        No staff referral row found for this user. Staff QR templates only appear once the user has
        a <code>staff_referrals</code> entry (auto-created for staff accounts).
      </div>
    );
  }

  const origin = siteOrigin();
  const context = {
    name: staff.full_name || fullName,
    firstName: (staff.full_name || fullName).split(" ")[0] || staff.full_name,
    code: staff.referral_code,
    link: `${origin}/r/${staff.referral_code}`,
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Code <span className="font-mono text-foreground">{staff.referral_code}</span> ·{" "}
          {staff.active ? "active" : "inactive"}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {TEMPLATES.map((t) => (
          <TemplateCard key={t.id} template={t} context={context} />
        ))}
      </div>
    </div>
  );
}
