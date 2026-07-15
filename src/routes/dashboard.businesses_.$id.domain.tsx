import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Copy, Check, ExternalLink, Loader2, Globe } from "lucide-react";

import {
  getBusinessCustomDomain,
  saveBusinessCustomDomain,
  verifyBusinessCustomDomain,
} from "@/lib/business-domain.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/dashboard/businesses_/$id/domain")({
  head: () => ({
    meta: [
      { title: "Custom domain — Business settings" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BusinessDomainPage,
});

function BusinessDomainPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const getFn = useServerFn(getBusinessCustomDomain);
  const saveFn = useServerFn(saveBusinessCustomDomain);
  const verifyFn = useServerFn(verifyBusinessCustomDomain);

  const [draftDomain, setDraftDomain] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["business-domain", id],
    queryFn: () => getFn({ data: { businessId: id } }),
  });
  const biz = data?.business ?? null;
  const domainVal = draftDomain ?? biz?.custom_domain ?? "";
  const status = biz?.custom_domain_status ?? "none";

  const save = useMutation({
    mutationFn: (domain: string | null) => saveFn({ data: { businessId: id, domain } }),
    onSuccess: () => {
      toast.success("Domain saved — add the DNS records below, then click Verify.");
      setDraftDomain(null);
      qc.invalidateQueries({ queryKey: ["business-domain", id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save"),
  });

  const verify = useMutation({
    mutationFn: () => verifyFn({ data: { businessId: id } }),
    onSuccess: (r: any) => {
      if (r?.ok) toast.success("Domain verified 🎉 — it will now route to your microsite.");
      else toast.error(r?.error ?? "Verification failed. DNS can take a while to propagate.");
      qc.invalidateQueries({ queryKey: ["business-domain", id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Verification failed"),
  });

  const copy = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const canSave = draftDomain !== null && draftDomain.trim() !== (biz?.custom_domain ?? "");

  const verifyHost = data?.verifyHost ?? null;
  const token = biz?.custom_domain_verify_token ?? "";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/dashboard/businesses_/$id/edit" params={{ id }} className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to business
        </Link>
        {biz?.slug ? (
          <Link to="/businesses/$slug" params={{ slug: biz.slug }} className="text-sm inline-flex items-center gap-1 text-primary">
            View microsite <ExternalLink className="w-4 h-4" />
          </Link>
        ) : null}
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold flex items-center gap-2"><Globe className="w-6 h-6" /> Custom domain</h1>
        <p className="text-sm text-muted-foreground">
          Connect your own domain (like <span className="font-mono">laoagtires.com</span>) so it opens your microsite.
          Your SEO-friendly slug <span className="font-mono">/businesses/{biz?.slug ?? "your-slug"}</span> stays the canonical URL.
        </p>
      </div>

      <Card className="p-5 space-y-4">
        <div>
          <Label>Your domain</Label>
          <div className="flex gap-2 mt-1">
            <Input
              placeholder="laoagtires.com"
              value={domainVal}
              disabled={isLoading || save.isPending}
              onChange={(e) => setDraftDomain(e.target.value)}
            />
            <Button
              disabled={!canSave || save.isPending}
              onClick={() => save.mutate((draftDomain ?? "").trim() || null)}
            >
              {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
            {biz?.custom_domain ? (
              <Button
                variant="outline"
                disabled={save.isPending}
                onClick={() => save.mutate(null)}
              >
                Disconnect
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Enter the bare domain — no <span className="font-mono">https://</span>, no <span className="font-mono">www.</span>
          </p>
        </div>

        {biz?.custom_domain ? (
          <div className="flex items-center gap-2 pt-2 border-t">
            <span className="text-sm">Status</span>
            {status === "verified" ? (
              <Badge className="bg-emerald-600">Verified{biz.custom_domain_verified_at ? ` · ${new Date(biz.custom_domain_verified_at).toLocaleDateString()}` : ""}</Badge>
            ) : status === "pending" ? (
              <Badge variant="secondary">Pending verification</Badge>
            ) : (
              <Badge variant="outline">Not connected</Badge>
            )}
          </div>
        ) : null}
      </Card>

      {biz?.custom_domain && status !== "verified" ? (
        <Card className="p-5 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Step 1 · Prove ownership</h2>
            <p className="text-sm text-muted-foreground">
              Add this TXT record at your DNS provider. Once it's live, click Verify below.
            </p>
          </div>

          <DnsRow label="Type" value="TXT" onCopy={copy} copied={copied === "type"} copyKey="type" />
          <DnsRow label="Host / Name" value={verifyHost ?? ""} onCopy={copy} copied={copied === "host"} copyKey="host" />
          <DnsRow label="Value" value={token} onCopy={copy} copied={copied === "value"} copyKey="value" />

          <div className="flex items-center gap-3 pt-2 border-t">
            <Button onClick={() => verify.mutate()} disabled={verify.isPending}>
              {verify.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Verify now
            </Button>
            <p className="text-xs text-muted-foreground">DNS changes can take up to a few hours to propagate.</p>
          </div>
        </Card>
      ) : null}

      {biz?.custom_domain ? (
        <Card className="p-5 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Step 2 · Point the domain at us</h2>
            <p className="text-sm text-muted-foreground">
              Add these A records so <span className="font-mono">{biz.custom_domain}</span> and <span className="font-mono">www.{biz.custom_domain}</span> both resolve to 365 Motorsales.
            </p>
          </div>
          <DnsRow label="A · root" value="185.158.133.1" hint="Host: @" onCopy={copy} copied={copied === "aRoot"} copyKey="aRoot" />
          <DnsRow label="A · www" value="185.158.133.1" hint="Host: www" onCopy={copy} copied={copied === "aWww"} copyKey="aWww" />
          <p className="text-xs text-muted-foreground">
            When your domain first resolves here, we'll auto-open your microsite. Your SEO canonical stays{" "}
            <span className="font-mono">365motorsales.com/businesses/{biz.slug}</span> so existing search rankings are preserved.
          </p>
        </Card>
      ) : null}
    </div>
  );
}

function DnsRow({
  label,
  value,
  hint,
  onCopy,
  copied,
  copyKey,
}: {
  label: string;
  value: string;
  hint?: string;
  onCopy: (k: string, v: string) => void;
  copied: boolean;
  copyKey: string;
}) {
  return (
    <div className="grid grid-cols-[110px,1fr,auto] items-center gap-2">
      <div>
        <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
        {hint ? <div className="text-[10px] text-muted-foreground">{hint}</div> : null}
      </div>
      <code className="text-sm bg-muted rounded px-2 py-1 overflow-x-auto whitespace-nowrap">{value || "—"}</code>
      <Button size="sm" variant="ghost" onClick={() => onCopy(copyKey, value)} disabled={!value}>
        {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
      </Button>
    </div>
  );
}
