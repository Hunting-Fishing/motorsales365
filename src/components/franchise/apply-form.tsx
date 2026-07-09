import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitFranchiseApplication } from "@/lib/franchise.functions";

const Schema = z.object({
  contact_name: z.string().trim().min(2, "Name is required"),
  contact_email: z.string().trim().email("Valid email required"),
  contact_phone: z.string().trim().max(40).optional(),
  business_name: z.string().trim().min(2, "Business name is required"),
  city: z.string().trim().max(80).optional(),
  province: z.string().trim().max(80).optional(),
  tier_slug: z.enum(["partner", "franchise"]),
  shop_type: z.string().trim().max(80).optional(),
  years_in_business: z.string().optional(),
  staff_count: z.string().optional(),
  monthly_parts_spend_php: z.string().optional(),
  website_url: z.string().trim().optional(),
  notes: z.string().trim().max(2000).optional(),
  agreed_terms: z.literal(true, { message: "You must accept the terms" }),
});

export function ApplyForm({ defaultTier = "partner" }: { defaultTier?: "partner" | "franchise" }) {
  const submit = useServerFn(submitFranchiseApplication);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({
    tier_slug: defaultTier,
    agreed_terms: false,
    existing_brands: [],
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    setLoading(true);
    try {
      const spend = parsed.data.monthly_parts_spend_php
        ? Math.round(Number(parsed.data.monthly_parts_spend_php) * 100)
        : null;
      await submit({
        data: {
          contact_name: parsed.data.contact_name,
          contact_email: parsed.data.contact_email,
          contact_phone: parsed.data.contact_phone || null,
          business_name: parsed.data.business_name,
          city: parsed.data.city || null,
          province: parsed.data.province || null,
          tier_slug: parsed.data.tier_slug,
          shop_type: parsed.data.shop_type || null,
          years_in_business: parsed.data.years_in_business
            ? Number(parsed.data.years_in_business)
            : null,
          staff_count: parsed.data.staff_count ? Number(parsed.data.staff_count) : null,
          monthly_parts_spend_cents: spend,
          existing_brands: [],
          website_url: parsed.data.website_url || null,
          notes: parsed.data.notes || null,
          agreed_terms: true,
        },
      });
      toast.success("Application submitted. We'll be in touch.");
      navigate({ to: "/franchise/status" });
    } catch (err: any) {
      toast.error(err?.message ?? "Could not submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="contact_name">Your name *</Label>
            <Input id="contact_name" required onChange={(e) => set("contact_name", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="contact_email">Email *</Label>
            <Input
              id="contact_email"
              type="email"
              required
              onChange={(e) => set("contact_email", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="contact_phone">Phone</Label>
            <Input id="contact_phone" onChange={(e) => set("contact_phone", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="business_name">Business / shop name *</Label>
            <Input
              id="business_name"
              required
              onChange={(e) => set("business_name", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input id="city" onChange={(e) => set("city", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="province">Province / region</Label>
            <Input id="province" onChange={(e) => set("province", e.target.value)} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Applying for</Label>
            <Select value={form.tier_slug} onValueChange={(v) => set("tier_slug", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="partner">365 Partner (keep your brand)</SelectItem>
                <SelectItem value="franchise">365 Franchise (co-branded)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="shop_type">Shop type</Label>
            <Input
              id="shop_type"
              placeholder="e.g. auto repair, parts retailer, tire shop"
              onChange={(e) => set("shop_type", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="years">Years in business</Label>
            <Input
              id="years"
              type="number"
              min={0}
              onChange={(e) => set("years_in_business", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="staff">Staff count</Label>
            <Input
              id="staff"
              type="number"
              min={0}
              onChange={(e) => set("staff_count", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="spend">Monthly parts spend (₱)</Label>
            <Input
              id="spend"
              type="number"
              min={0}
              onChange={(e) => set("monthly_parts_spend_php", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="website">Website / FB page</Label>
            <Input
              id="website"
              placeholder="https://"
              onChange={(e) => set("website_url", e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Anything else we should know?</Label>
          <Textarea id="notes" rows={4} onChange={(e) => set("notes", e.target.value)} />
        </div>

        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          <Checkbox
            checked={!!form.agreed_terms}
            onCheckedChange={(v) => set("agreed_terms", v === true)}
            className="mt-0.5"
          />
          <span>
            I have read and agree to the 365 Franchise & Partner Program terms in the{" "}
            <a href="/terms" className="text-primary underline">
              Terms
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-primary underline">
              Privacy Policy
            </a>
            .
          </span>
        </label>

        <Button type="submit" disabled={loading} size="lg">
          {loading ? "Submitting…" : "Submit application"}
        </Button>
      </form>
    </Card>
  );
}
