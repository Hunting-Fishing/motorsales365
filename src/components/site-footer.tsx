import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export function SiteFooter() {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user) { setReferralCode(null); return; }
    (async () => {
      const { data } = await (supabase as any)
        .from("staff_referrals")
        .select("referral_code, active")
        .eq("staff_user_id", user.id)
        .eq("active", true)
        .maybeSingle();
      if (!cancelled) setReferralCode(data?.referral_code ?? null);
    })();
    return () => { cancelled = true; };
  }, [user]);

  return (
    <footer className="mt-16 border-t border-border bg-secondary/40">
      <div className="container mx-auto grid gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <Link to="/" className="flex items-center gap-2" aria-label="365 MotorSales Philippines home">
            <BrandLogo size={48} />
            <div className="flex flex-col leading-none">
              <span className="font-display text-lg font-bold">365 MotorSales</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Philippines</span>
            </div>
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">
            The standard for buying and selling vehicles across the Philippines.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Browse</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/browse/$category" params={{ category: "car" }} className="hover:text-foreground">Cars</Link></li>
            <li><Link to="/browse/$category" params={{ category: "motorcycle" }} className="hover:text-foreground">Motorcycles</Link></li>
            <li><Link to="/browse/$category" params={{ category: "boat" }} className="hover:text-foreground">Boats</Link></li>
            <li><Link to="/browse/$category" params={{ category: "airplane" }} className="hover:text-foreground">Airplanes</Link></li>
            <li><Link to="/browse/$category" params={{ category: "equipment" }} className="hover:text-foreground">Equipment</Link></li>
            <li><Link to="/browse/$category" params={{ category: "towing" }} className="hover:text-foreground">Towing & Trucking</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Tow & deliver</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/tow" className="hover:text-foreground">Request a tow</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Sell</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/sell" className="hover:text-foreground">Post a listing</Link></li>
            <li><Link to="/pricing" className="hover:text-foreground">Pricing & plans</Link></li>
            <li><Link to="/payments" className="hover:text-foreground">Payment methods</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Company</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/about" className="hover:text-foreground">About</Link></li>
            <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
            <li><Link to="/advertise" className="hover:text-foreground">Advertise / buy ad space</Link></li>
            {referralCode && (
              <li>
                <Link to="/my-qr" className="hover:text-foreground">
                  My QR Code
                </Link>
              </li>
            )}
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Legal</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/terms" className="hover:text-foreground">Terms of Service</Link></li>
            <li><Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
            <li><Link to="/guidelines" className="hover:text-foreground">Community Guidelines</Link></li>
            <li><Link to="/refund-policy" className="hover:text-foreground">Refund Policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} 365 MotorSales Philippines. All prices in ₱ PHP.</p>
        <p className="mt-1">Registered in the Philippines · Metro Manila · DPA-compliant.</p>
      </div>
    </footer>
  );
}
