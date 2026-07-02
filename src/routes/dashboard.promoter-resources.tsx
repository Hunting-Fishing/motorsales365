import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Copy,
  Eye,
  Lightbulb,
  MapPin,
  Megaphone,
  MessageSquare,
  Printer,
  QrCode,
  Share2,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { siteOrigin } from "@/lib/site-config";

export const Route = createFileRoute("/dashboard/promoter-resources")({
  head: () => ({
    meta: [
      { title: "Promoter Resources — 365 Motor Sales" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PromoterResources,
});

type AdExample = {
  channel: string;
  title: string;
  body: (link: string, code: string) => string;
};

const AD_EXAMPLES: AdExample[] = [
  {
    channel: "Facebook post",
    title: "Short Facebook / Marketplace post",
    body: (link) => `Tired of bumping the same listing 14 times on FB? 🙄

365 Motor Sales is the marketplace built for Philippine vehicles, parts and motor businesses. Real filters. Verified sellers. Boosts from ₱99 for 7 days.

Scan or tap → ${link}
#365MotorSales #BuyAndSellPH

Disclosure: I may earn a commission if you sign up through my 365 Motor Sales link. #365MotorSalesPartner`,
  },
  {
    channel: "Long FB / community post",
    title: "Detailed Facebook / community group post",
    body: (link) => `Hey everyone — quick heads up for buyers, sellers and motor shops here in the Philippines.

I've been using 365 Motor Sales and it's honestly a better fit than Facebook Marketplace for vehicles:
• Search by make / model / year / transmission / location (no more scrolling memes)
• Verified sellers and businesses with badges
• Direct in-app messaging
• Boosts at ₱99–₱199 for a full 7 days (vs ₱500–₱2,000 on FB for similar reach)

If you're buying, selling, or running a shop, take a look:
${link}

Free to join, free to list — boosts are optional.

Disclosure: I may earn a commission if you sign up through my 365 Motor Sales link. #365MotorSalesPartner`,
  },
  {
    channel: "SMS / Viber",
    title: "SMS or Viber blast",
    body: (link) => `Looking to buy/sell a vehicle or parts? Try 365 Motor Sales — PH's motor marketplace with verified sellers. Free to list. ${link}

Disclosure: I may earn a commission if you sign up through my 365 Motor Sales link. #365MotorSalesPartner`,
  },
  {
    channel: "Email signature",
    title: "Email signature blurb",
    body: (link) =>
      `--
Find your next ride on 365 Motor Sales — the Philippine motor marketplace.
${link}

Disclosure: I may earn a commission if you sign up through my 365 Motor Sales link. #365MotorSalesPartner`,
  },
  {
    channel: "Business card back",
    title: "Business card / flyer caption",
    body: (link, code) => `Scan to browse vehicles, parts and motor shops near you.
Code: ${code}
${link}

Disclosure: I may earn a commission if you sign up through my 365 Motor Sales link. #365MotorSalesPartner`,
  },
  {
    channel: "WhatsApp / Messenger",
    title: "1-to-1 WhatsApp / Messenger",
    body: (link) => `Hey 👋 — if you're shopping for a car / bike / parts here in PH, check 365 Motor Sales. Verified sellers and proper filters, not a Facebook feed. ${link}

Disclosure: I may earn a commission if you sign up through my 365 Motor Sales link. #365MotorSalesPartner`,
  },
];


const PLACEMENT_TIPS = [
  {
    Icon: MapPin,
    title: "Helmet & vehicle sticker",
    body: "Back of your helmet, rear quarter panel, fuel tank, tow truck door — anywhere people stuck in traffic can scan with their phone camera.",
  },
  {
    Icon: Printer,
    title: "Shop window & counter",
    body: "A4 poster at the counter, smaller version at eye level on the door. Print from the Poster page in your QR Ads.",
  },
  {
    Icon: MessageSquare,
    title: "Business card back",
    body: "Print the QR on the reverse of every card you hand out. Add 'Scan to browse PH motor marketplace'.",
  },
  {
    Icon: Lightbulb,
    title: "Receipts & invoices",
    body: "Add the QR + your code to the footer of receipts, repair invoices, or quotation PDFs.",
  },
  {
    Icon: Share2,
    title: "Social media bio",
    body: "Pin your referral link in Facebook page intro, Instagram bio, and TikTok link tree.",
  },
  {
    Icon: Users,
    title: "Local groups & events",
    body: "Hand out at car meets, motorcycle rides, parts swap meets. Test scan distance — keep the QR at least 5cm wide for phone cameras.",
  },
];

const WALKTHROUGH = [
  {
    step: "1",
    title: "Scan",
    body: "Visitor opens their phone camera and taps the link. They land on your personal referral page — your name shows as 'brought you to 365 Motor Sales'.",
  },
  {
    step: "2",
    title: "Pitch",
    body: "They see the hero, feature chips and the side-by-side comparison vs Facebook & Google. Your active promo offers (if any) show at the top.",
  },
  {
    step: "3",
    title: "Convert",
    body: "Three paths: create a free account, drop a lead in the contact form, or browse listings. Every option still keeps your referral credit for 90 days.",
  },
  {
    step: "4",
    title: "You get the credit",
    body: "First scan from each device counts once toward your stats. Leads land in the admin dashboard for follow-up.",
  },
];

function PromoterResources() {
  const [code, setCode] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        if (!cancelled) setLoaded(true);
        return;
      }
      const sb = supabase as any;
      const { data } = await sb
        .from("staff_referrals")
        .select("referral_code")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (!cancelled) {
        setCode(data?.referral_code ?? null);
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const link = useMemo(
    () => (code ? `${siteOrigin()}/r/${code}` : `${siteOrigin()}/r/YOUR-CODE`),
    [code],
  );
  const displayCode = code ?? "YOUR-CODE";

  return (
    <div className="space-y-6">
      {/* Premium hero */}
      <header className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-primary/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between">
          <div className="min-w-0 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/80">
              Promote &amp; earn
            </span>
            <h1 className="font-display mt-3 text-2xl font-bold sm:text-4xl">Promoter resources</h1>
            <p className="mt-2 text-sm text-white/70 sm:text-base">
              Copy-ready ad templates, QR placement ideas, and a walkthrough of what a new visitor
              sees when they scan your code.
            </p>
          </div>
          <div className="col-span-2 flex flex-wrap gap-2 sm:col-auto">
            <Link to="/dashboard/referral">
              <Button
                size="sm"
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <QrCode className="mr-1.5 h-4 w-4" /> My QR &amp; stats
              </Button>
            </Link>
            <Link to="/resources/qr-landing">
              <Button size="sm" className="shadow-lg shadow-primary/30">
                <Eye className="mr-1.5 h-4 w-4" /> Preview scanner view
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {loaded && !code && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
          You don&apos;t have a personal referral code yet. The examples below use a{" "}
          <code className="rounded bg-muted px-1">YOUR-CODE</code> placeholder — ask an admin to
          create your code so your link tracks scans and signups.
        </div>
      )}

      {/* Compliance strip — mobile-safe grid, stacks button below */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-50 to-amber-100/40 p-4 shadow-sm dark:from-amber-950/30 dark:to-amber-950/10 dark:border-amber-500/20 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="min-w-0 text-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
            Disclosure required on every post
          </p>
          <p className="mt-1 text-amber-950/90 dark:text-amber-100/90">
            Templates below already include the required snippet. Keep it in when you paste — it's
            an FTC / PH DTI rule and part of the{" "}
            <Link to="/partner-program/terms" className="font-semibold underline underline-offset-2">
              Partner Terms
            </Link>
            .
          </p>
        </div>
        <div className="col-span-2 sm:col-auto">
          <Button
            size="sm"
            variant="outline"
            className="w-full border-amber-500/40 bg-white/60 hover:bg-white sm:w-auto dark:bg-amber-950/30 dark:hover:bg-amber-950/50"
            onClick={() => {
              navigator.clipboard
                .writeText(
                  "Disclosure: I may earn a commission if you sign up through my 365 Motor Sales link. #365MotorSalesPartner",
                )
                .then(() => toast.success("Snippet copied"));
            }}
          >
            <Copy className="mr-1.5 h-4 w-4" /> Copy snippet
          </Button>
        </div>
      </div>




      <Tabs defaultValue="ads" className="w-full">
        <TabsList>
          <TabsTrigger value="ads">
            <Megaphone className="mr-1.5 h-4 w-4" /> Ad examples
          </TabsTrigger>
          <TabsTrigger value="placement">
            <MapPin className="mr-1.5 h-4 w-4" /> QR placement tips
          </TabsTrigger>
          <TabsTrigger value="walkthrough">
            <Sparkles className="mr-1.5 h-4 w-4" /> Scanner walkthrough
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ads" className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Copy any block, paste into Facebook, Messenger, SMS, Viber or email. Your link is
            already filled in.
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            {AD_EXAMPLES.map((ex) => (
              <AdCard key={ex.title} example={ex} link={link} code={displayCode} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="placement" className="mt-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PLACEMENT_TIPS.map(({ Icon, title, body }) => (
              <div key={title} className="group rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-sm font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold">Quality rules of thumb</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Print at least 4–5cm wide for reliable phone scans.</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Keep a clear quiet zone (margin) around the QR — no overlapping graphics.</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Dark QR on light background prints best. Avoid low-contrast pairs.</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Test scan after printing — from 30cm and from 1m.</li>
            </ul>
          </div>
        </TabsContent>


        <TabsContent value="walkthrough" className="mt-6 space-y-5">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {WALKTHROUGH.map((s) => (
              <div key={s.step} className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-sm font-bold text-primary">
                  {s.step}
                </span>
                <h3 className="mt-3 text-sm font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 to-primary/5 p-5 sm:flex sm:flex-wrap sm:justify-between">
            <div className="min-w-0">
              <h3 className="font-display text-lg font-bold">See it for yourself</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Open the same page a new scanner sees — tracking and lead submissions are disabled
                in preview.
              </p>
            </div>
            <Link to="/resources/qr-landing" className="col-span-2 shrink-0 sm:col-auto">
              <Button className="w-full sm:w-auto">
                Open scanner preview <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AdCard({ example, link, code }: { example: AdExample; link: string; code: string }) {
  const text = example.body(link, code);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy");
    }
  };
  return (
    <div className="group rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{example.channel}</p>
          <h3 className="mt-1 truncate text-sm font-semibold">{example.title}</h3>
        </div>
        <Button size="sm" variant="outline" className="shrink-0" onClick={onCopy}>
          <Copy className="mr-1.5 h-4 w-4" /> Copy
        </Button>
      </div>
      <Textarea
        value={text}
        readOnly
        rows={Math.min(12, Math.max(4, text.split("\n").length + 1))}
        className="mt-3 rounded-xl border-border/60 bg-muted/30 font-mono text-xs"
        onFocus={(e) => e.currentTarget.select()}
      />
    </div>
  );
}

