/**
 * AI-powered category classifier for QR Ads ads.
 * Looks at the rendered flyer / uploaded ad and picks one (category, subcategory)
 * from the taxonomy in `src/lib/qr-ads/categories.ts`.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { requireAdminRoleAudited } from "@/integrations/supabase/admin-middleware";
import {
  classifierTaxonomyPrompt,
  isValidCategory,
  isValidSubcategory,
  categoryFromSub,
  type CategoryKey,
  type SubcategoryKey,
} from "@/lib/qr-ads/categories";

const inputSchema = z.object({
  imageUrl: z.string().url(),
});

export type ClassifyResult = {
  category: CategoryKey | null;
  subcategory: SubcategoryKey | null;
  confidence: number;
  reasoning?: string;
};

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return raw.trim();
  return raw.slice(start, end + 1).trim();
}

async function fetchImageAsBytes(url: string): Promise<{ bytes: Uint8Array; mediaType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not download flyer image (${res.status})`);
  const mediaType = res.headers.get("content-type")?.split(";")[0] || "image/png";
  const buf = await res.arrayBuffer();
  return { bytes: new Uint8Array(buf), mediaType };
}

function buildSystemPrompt(): string {
  return `You classify Philippine automotive marketing flyers into a fixed taxonomy.

Allowed (category, subcategory) keys:
${classifierTaxonomyPrompt()}

Rules:
- Pick the SINGLE best subcategory based on the SHOP / BUSINESS TYPE shown.
- A flyer that advertises a tow service -> service-repair / tow-roadside.
- A flyer for "Upholstery & Seat Cover Shop" -> service-repair / upholstery-interior.
- A flyer for "Vehicle Inspection" -> service-repair / inspection-testing.
- A flyer for "Carwash", "Detailing", "Auto Spa" -> service-repair / detailing-carwash.
- A flyer for parts, accessories, oil, lubricants -> sales-service / parts-accessories (or fuel-lubricants for fuel/oil).
- A flyer selling cars / SUVs / used vehicles -> sales-service / vehicles-for-sale.
- A flyer for insurance or financing -> insurance-finance / (insurance|financing).
- A generic 365 Motor Sales branded social/print ad with no shop type -> advertising-365 / (social-posts | stories-reels | print-wearables).
- If truly unclear, return other / other with low confidence.

Return ONLY a JSON object — no prose, no markdown fences:
{ "category": "<key>", "subcategory": "<key>", "confidence": 0..1, "reasoning": "<= 200 chars" }`;
}

async function classifyOne(imageUrl: string): Promise<ClassifyResult> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Auto-categorize unavailable — LOVABLE_API_KEY missing.");

  const { bytes, mediaType } = await fetchImageAsBytes(imageUrl);
  const gateway = createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const model = gateway("google/gemini-2.5-flash");

  let text: string;
  try {
    const result = await generateText({
      model,
      system: buildSystemPrompt(),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Classify this flyer." },
            { type: "image", image: bytes, mediaType },
          ],
        },
      ],
    });
    text = result.text;
  } catch (err: any) {
    const msg = String(err?.message ?? err);
    if (/402|payment.?required|credit/i.test(msg)) throw new Error("AI credits exhausted.");
    if (/429|rate.?limit/i.test(msg)) throw new Error("AI rate-limited. Try again shortly.");
    throw new Error(`Auto-categorize failed: ${msg.slice(0, 200)}`);
  }

  let parsed: any;
  try {
    parsed = JSON.parse(extractJson(text));
  } catch {
    return { category: null, subcategory: null, confidence: 0, reasoning: "Invalid AI JSON" };
  }
  const sub = isValidSubcategory(parsed?.subcategory) ? (parsed.subcategory as SubcategoryKey) : null;
  let cat: CategoryKey | null = isValidCategory(parsed?.category) ? (parsed.category as CategoryKey) : null;
  if (sub && (!cat || categoryFromSub(sub) !== cat)) cat = categoryFromSub(sub);
  const conf = typeof parsed?.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5;
  return { category: cat, subcategory: sub, confidence: conf, reasoning: String(parsed?.reasoning ?? "").slice(0, 240) };
}

export const classifyQrAdTemplate = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("qrAds.classify")])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<ClassifyResult> => classifyOne(data.imageUrl));
