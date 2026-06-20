import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { InstallAppButton } from "@/components/install-app-button";

export function SiteFooter() {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setReferralCode(null);
      return;
    }
    (async () => {
      const { data } = await (supabase as any)
        .from("staff_referrals")
        .select("referral_code, active")
        .eq("staff_user_id", user.id)
        .eq("active", true)
        .maybeSingle();
      if (!cancelled) setReferralCode(data?.referral_code ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const sections = [
    {
      title: "Browse",
      links: [
        { to: "/browse/$category", params: { category: "car" }, label: "Cars" },
        { to: "/browse/$category", params: { category: "motorcycle" }, label: "Motorcycles" },
        { to: "/browse/$category", params: { category: "boat" }, label: "Boats" },
        { to: "/browse/$category", params: { category: "airplane" }, label: "Airplanes" },
        { to: "/browse/$category", params: { category: "equipment" }, label: "Equipment" },
        { to: "/tow", label: "Towing & Transport Services" },
      ],
    },
    {
      title: "Tow & deliver",
      links: [{ to: "/tow", label: "Request a tow" }],
    },
    {
      title: "Export",
      links: [
        { to: "/export", label: "365 Export Connect" },
        { to: "/export/trust", label: "Trust & verification" },
      ],
    },
    {
      title: "Sell",
      links: [
        { to: "/start-selling", label: "How selling works" },
        { to: "/sell", label: "Post a listing" },
        { to: "/help/posting-etiquette", label: "Posting etiquette & guidelines" },
        { to: "/wanted", label: "Wanted board (buyer requests)" },
        { to: "/pricing", label: "Pricing & plans" },
        { to: "/payments", label: "Payment methods" },
        { to: "/shop", label: "Shop" },
      ],
    },
    {
      title: "Company",
      links: [
        { to: "/about", label: "About" },
        { to: "/company", label: "Company verification" },
        { to: "/verified", label: "365 Verified explained" },
        { to: "/contact", label: "Contact" },
        { to: "/support", label: "Help & Support" },
        { to: "/report", label: "Report a scam" },
        { to: "/advertise", label: "Advertise / buy ad space" },
        { to: "/resources/qr-landing", label: "QR landing preview" },
        ...(referralCode ? [{ to: "/my-qr", label: "My QR Code" }] : []),
      ],
    },
    {
      title: "Legal",
      links: [
        { to: "/terms", label: "Terms & Conditions" },
        { to: "/privacy", label: "Privacy Policy" },
        { to: "/guidelines", label: "Community Guidelines" },
        { to: "/refund-policy", label: "Refund Policy" },
      ],
    },
  ];

  return (
    <footer className="mt-16 border-t border-border bg-secondary/40">
      {/* Brand block */}
      <div className="container mx-auto px-4 pt-10 pb-2">
        <Link
          to="/"
          className="flex items-center gap-2"
          aria-label="365 MotorSales Philippines home"
        >
          <BrandLogo size={48} />
          <div className="flex flex-col leading-none">
            <span className="font-display text-lg font-bold">365 MotorSales</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Philippines
            </span>
          </div>
        </Link>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">
          The standard for buying and selling vehicles across the Philippines.
        </p>
      </div>

      {/* Mobile: accordion */}
      <div className="container mx-auto px-4 py-4 md:hidden">
        <Accordion type="multiple" className="w-full">
          {sections.map((s) => (
            <AccordionItem value={s.title} key={s.title}>
              <AccordionTrigger className="text-sm font-semibold">{s.title}</AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {s.links.map((l: any) => (
                    <li key={l.label}>
                      <Link
                        to={l.to}
                        params={l.params}
                        className="block rounded px-1 py-2 hover:text-foreground"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Desktop: columns */}
      <div className="container mx-auto hidden grid-cols-2 gap-8 px-4 py-8 md:grid md:grid-cols-5">
        {sections.map((s) => (
          <div key={s.title}>
            <h4 className="mb-3 text-sm font-semibold">{s.title}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {s.links.map((l: any) => (
                <li key={l.label}>
                  <Link to={l.to} params={l.params} className="hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground">
        <div className="mb-3 flex flex-col items-center gap-2">
          <p className="font-medium text-foreground">Get the 365 MotorSales app</p>
          <InstallAppButton />
        </div>
        <p>© {new Date().getFullYear()} 365 MotorSales Philippines. All prices in ₱ PHP.</p>
        <p className="mt-1">Registered in the Philippines · Metro Manila · DPA-compliant.</p>
        <p className="mt-1">
          As an affiliate, 365 MotorSales earns from qualifying purchases made through outbound Shop
          links.
        </p>
      </div>
    </footer>
  );
}
