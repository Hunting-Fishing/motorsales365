import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Loader2, CheckCircle2, Copy, ArrowLeft } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { LocationPicker } from "@/components/location-picker";
import { useAuth } from "@/hooks/use-auth";
import {
  scrapeFbListing,
  startFbVerification,
  checkFbVerification,
  finalizeFbImport,
} from "@/lib/facebook-import.functions";

export const Route = createFileRoute("/sell/import")({
  head: () => ({
    meta: [
      { title: "Import from Facebook Marketplace — 365 MotorSales" },
      { name: "description", content: "Import your Facebook Marketplace listing to 365 MotorSales. Verify your FB profile to prove the listing is yours." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ImportPage,
});

const CATEGORIES = [
  { slug: "car", name: "Car" },
  { slug: "motorcycle", name: "Motorcycle" },
  { slug: "boat", name: "Boat" },
  { slug: "equipment", name: "Heavy Equipment" },
  { slug: "parts", name: "Parts & Accessories" },
  { slug: "other", name: "Other" },
];

type Step = "url" | "verify" | "preview" | "done";

function parsePriceToPhp(s: string): number {
  if (!s) return 0;
  const digits = s.replace(/[^\d.]/g, "");
  const n = Number(digits);
  return isFinite(n) ? Math.round(n) : 0;
}

function ImportPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const scrape = useServerFn(scrapeFbListing);
  const startVerify = useServerFn(startFbVerification);
  const checkVerify = useServerFn(checkFbVerification);
  const finalize = useServerFn(finalizeFbImport);

  const [step, setStep] = useState<Step>("url");
  const [busy, setBusy] = useState(false);

  // step 1
  const [url, setUrl] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<{
    title: string;
    description: string;
    priceText: string;
    images: string[];
    sellerProfileUrl: string;
    locationText: string;
  } | null>(null);

  // step 2
  const [verificationCode, setVerificationCode] = useState<string | null>(null);

  // step 3 (preview)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("car");
  const [condition, setCondition] = useState("Used");
  const [region, setRegion] = useState<string | null>(null);
  const [province, setProvince] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [barangay, setBarangay] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  const onScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await scrape({ data: { url } });
      setJobId(res.jobId);
      setExtracted(res.extracted);
      setTitle(res.extracted.title);
      setDescription(res.extracted.description);
      setPrice(String(parsePriceToPhp(res.extracted.priceText)));
      setSelectedPhotos(new Set(res.extracted.images));
      if (res.conflictingOwner) {
        toast.error("This Facebook profile is already linked to another 365 MotorSales account.");
        return;
      }
      if (!res.extracted.sellerProfileUrl) {
        toast.error("Could not find the seller's profile link on that page. Try a different listing URL.");
        return;
      }
      if (res.alreadyVerified) {
        setStep("preview");
        toast.success("Facebook profile already verified — skipping ownership check.");
      } else {
        setStep("verify");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to import");
    } finally {
      setBusy(false);
    }
  };

  const onStartVerify = async () => {
    if (!extracted?.sellerProfileUrl) return;
    setBusy(true);
    try {
      const res = await startVerify({ data: { sellerProfileUrl: extracted.sellerProfileUrl } });
      setVerificationCode(res.code);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start verification");
    } finally {
      setBusy(false);
    }
  };

  const onCheckVerify = async () => {
    if (!extracted?.sellerProfileUrl) return;
    setBusy(true);
    try {
      const res = await checkVerify({ data: { sellerProfileUrl: extracted.sellerProfileUrl } });
      if (res.verified) {
        toast.success(res.message);
        setStep("preview");
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification check failed");
    } finally {
      setBusy(false);
    }
  };

  const onFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extracted) return;
    setBusy(true);
    try {
      const res = await finalize({
        data: {
          jobId,
          sourceUrl: url,
          sellerProfileUrl: extracted.sellerProfileUrl,
          listing: {
            title,
            description,
            price_php: Number(price) || 0,
            category_slug: category,
            condition,
            region, province, city, barangay,
            contact_phone: phone || null,
          },
          photoUrls: Array.from(selectedPhotos),
        },
      });
      toast.success(`Draft listing created (${res.photosImported} photos imported).`);
      navigate({ to: "/listing/$id/edit", params: { id: res.listingId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create listing");
    } finally {
      setBusy(false);
    }
  };

  if (authLoading) {
    return <SiteLayout><div className="p-12 text-center">Loading…</div></SiteLayout>;
  }

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/sell"><ArrowLeft className="mr-2 h-4 w-4" />Back to manual posting</Link>
        </Button>
        <h1 className="font-display text-3xl font-bold">Import from Facebook Marketplace</h1>
        <p className="text-muted-foreground">
          Paste a Facebook Marketplace listing URL. We'll extract the details and verify it's yours.
        </p>

        {step === "url" && (
          <form onSubmit={onScrape} className="mt-8 space-y-4 rounded-xl border border-border bg-card p-6">
            <div>
              <Label htmlFor="fb-url">Facebook Marketplace URL</Label>
              <Input
                id="fb-url"
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.facebook.com/marketplace/item/..."
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Open your FB Marketplace post, copy the URL from your browser, and paste it here.
              </p>
            </div>
            <Button type="submit" disabled={busy || !url} className="w-full">
              {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing…</> : "Import listing"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Limit: 10 imports per day. Only your own listings — we verify Facebook profile ownership.
            </p>
          </form>
        )}

        {step === "verify" && extracted && (
          <div className="mt-8 space-y-4 rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Verify this is your Facebook profile</h2>
            <p className="text-sm text-muted-foreground">
              To stop scammers from re-posting other people's listings, prove you own this FB profile:
            </p>
            <div className="rounded-md border border-border bg-secondary/30 p-3 text-sm">
              <div className="text-xs text-muted-foreground">Seller profile detected:</div>
              <a href={extracted.sellerProfileUrl} target="_blank" rel="noreferrer"
                className="font-mono break-all text-primary hover:underline">
                {extracted.sellerProfileUrl} <ExternalLink className="inline h-3 w-3" />
              </a>
            </div>

            {!verificationCode ? (
              <Button onClick={onStartVerify} disabled={busy} className="w-full">
                {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating code…</> : "Generate verification code"}
              </Button>
            ) : (
              <>
                <ol className="list-decimal space-y-2 pl-5 text-sm">
                  <li>Copy this verification code:
                    <div className="mt-2 flex items-center gap-2 rounded-md border border-border bg-background p-2">
                      <code className="flex-1 font-mono text-base font-bold">{verificationCode}</code>
                      <Button type="button" size="sm" variant="outline"
                        onClick={() => { navigator.clipboard.writeText(verificationCode); toast.success("Copied"); }}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </li>
                  <li>Go to your <a href={extracted.sellerProfileUrl} target="_blank" rel="noreferrer" className="text-primary underline">Facebook profile</a>, click <strong>Edit Bio</strong> (or Edit Intro), and paste the code anywhere in the bio. Make sure visibility is set to <strong>Public</strong>.</li>
                  <li>Save your FB profile, then click below.</li>
                </ol>
                <Button onClick={onCheckVerify} disabled={busy} className="w-full">
                  {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Checking…</> : "I added the code — verify now"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  After verifying you can remove the code from your bio. We won't ask again for 90 days.
                </p>
              </>
            )}
          </div>
        )}

        {step === "preview" && extracted && (
          <form onSubmit={onFinalize} className="mt-8 space-y-6">
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm">
              <CheckCircle2 className="mr-2 inline h-4 w-4 text-emerald-600" />
              Verified as the Facebook seller. Review the imported details below.
            </div>

            <section className="space-y-4 rounded-xl border border-border bg-card p-6">
              <h2 className="font-display text-lg font-semibold">Basics</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Condition</Label>
                  <Select value={condition} onValueChange={setCondition}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Brand new">Brand new</SelectItem>
                      <SelectItem value="Used">Used</SelectItem>
                      <SelectItem value="For parts">For parts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label>Title</Label>
                  <Input required value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div>
                  <Label>Price (₱)</Label>
                  <Input type="number" min="0" required value={price} onChange={(e) => setPrice(e.target.value)} />
                </div>
                <div>
                  <Label>Contact phone (optional)</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+63 9XX XXX XXXX" />
                </div>
                <div className="sm:col-span-2">
                  <Label>Description</Label>
                  <Textarea rows={6} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-xl border border-border bg-card p-6">
              <h2 className="font-display text-lg font-semibold">Location</h2>
              {extracted.locationText && (
                <p className="text-xs text-muted-foreground">Detected from FB: "{extracted.locationText}" — please confirm below.</p>
              )}
              <LocationPicker
                value={{ region, province, city, barangay }}
                onChange={(v) => {
                  setRegion(v.region ?? null);
                  setProvince(v.province ?? null);
                  setCity(v.city ?? null);
                  setBarangay(v.barangay ?? null);
                }}
              />
            </section>

            <section className="space-y-4 rounded-xl border border-border bg-card p-6">
              <h2 className="font-display text-lg font-semibold">Photos ({selectedPhotos.size}/{extracted.images.length})</h2>
              <p className="text-xs text-muted-foreground">Untick any photos you don't want. We'll download and re-host the selected ones.</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {extracted.images.map((src) => {
                  const checked = selectedPhotos.has(src);
                  return (
                    <button
                      type="button"
                      key={src}
                      onClick={() => {
                        const next = new Set(selectedPhotos);
                        if (checked) next.delete(src); else next.add(src);
                        setSelectedPhotos(next);
                      }}
                      className={`relative aspect-square overflow-hidden rounded-md border-2 ${checked ? "border-primary" : "border-transparent opacity-50"}`}
                    >
                      <img src={src} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      {checked && (
                        <div className="absolute right-1 top-1 rounded-full bg-primary p-1 text-primary-foreground">
                          <CheckCircle2 className="h-3 w-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {extracted.images.length === 0 && (
                <p className="text-sm text-muted-foreground">No photos were extracted. You can add some on the edit screen after the draft is created.</p>
              )}
            </section>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setStep("url")}>Start over</Button>
              <Button type="submit" disabled={busy} size="lg">
                {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating draft…</> : "Create draft listing"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </SiteLayout>
  );
}
