/**
 * AI-powered "Scan Here" panel detector for QR ad flyers.
 *
 * Uses the configured standalone OpenAI-compatible vision provider. There is
 * intentionally no Lovable fallback.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { requireAdminRoleAudited } from "@/integrations/supabase/admin-middleware";

const inputSchema = z.object({
  imageUrl: z.string().url(),
  width: z.number().positive(),
  height: z.number().positive(),
});

const visionResponseSchema = z.object({
  found: z.boolean(),
  cx: z.number().min(0).max(1).optional(),
  cy: z.number().min(0).max(1).optional(),
  width: z.number().min(0).max(1).optional(),
  height: z.number().min(0).max(1).optional(),
  confidence: z.number().min(0).max(1).optional(),
  reasoning: z.string().max(400).optional(),
});

export type VisionDetection = {
  found: boolean;
  cx: number;
  cy: number;
  size: number;
  confidence: number;
  reasoning: string;
};

const SYSTEM_PROMPT = `You are a precise computer-vision annotator that locates the QR code placement area in marketing flyers.

The flyer always has a dedicated rectangular WHITE panel where a QR code should be placed. The panel is usually labeled "SCAN HERE", "SCAN ME", "SCAN TO LEARN MORE", or is a clearly empty white square framed by a colored border. It may already contain a placeholder QR or be completely blank.

Return ONLY a JSON object — no prose, no markdown fences, no comments.

JSON shape (all coordinates normalized 0..1 relative to the image, origin = top-left):
{
  "found": boolean,
  "cx": number,
  "cy": number,
  "width": number,
  "height": number,
  "confidence": number,
  "reasoning": string
}

Rules:
- The panel is the place where a SQUARE QR code should land — pick the inner WHITE area, not the colored frame around it.
- Ignore: brand logos, product photos, vehicles, decorative whitespace, text columns. They are NOT the QR target.
- If no dedicated QR panel exists, return { "found": false, "confidence": 0, "reasoning": "..." } and omit the box fields.
- Be tight: the bounding box should hug the inner white area so a QR rendered to that box fits with light padding.`;

const USER_PROMPT = `Find the white QR placement panel ("Scan Here" / "Scan Me" area) in this flyer and return the JSON object described in the system prompt.`;

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

export const detectScanHereWithVision = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("qrAds.smartFit")])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<VisionDetection> => {
    const key = process.env.AI_API_KEY?.trim();
    const baseURL = process.env.AI_API_BASE_URL?.trim().replace(/\/+$/, "");
    const modelName = process.env.AI_MODEL_VISION?.trim() || process.env.AI_MODEL?.trim();
    if (!key || !baseURL || !modelName) {
      return {
        found: false,
        cx: 0,
        cy: 0,
        size: 0,
        confidence: 0,
        reasoning: "AI_PROVIDER_NOT_CONFIGURED",
      };
    }

    const { bytes, mediaType } = await fetchImageAsBytes(data.imageUrl);

    const gateway = createOpenAICompatible({
      name: "standalone",
      baseURL,
      headers: { Authorization: `Bearer ${key}` },
    });
    const model = gateway(modelName);

    let text: string;
    try {
      const result = await generateText({
        model,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: USER_PROMPT },
              { type: "image", image: bytes, mediaType },
            ],
          },
        ],
      });
      text = result.text;
    } catch (err: any) {
      const msg = String(err?.message ?? err);
      if (/402|payment.?required|credit/i.test(msg)) {
        return { found: false, cx: 0, cy: 0, size: 0, confidence: 0, reasoning: "AI_PROVIDER_BILLING" };
      }
      if (/429|rate.?limit/i.test(msg)) {
        return { found: false, cx: 0, cy: 0, size: 0, confidence: 0, reasoning: "AI_RATE_LIMITED" };
      }
      throw new Error(`Smart fit failed: ${msg.slice(0, 200)}`);
    }

    let parsed: z.infer<typeof visionResponseSchema>;
    try {
      parsed = visionResponseSchema.parse(JSON.parse(extractJson(text)));
    } catch {
      return { found: false, cx: 0, cy: 0, size: 0, confidence: 0, reasoning: "AI response was not valid JSON" };
    }

    if (!parsed.found || parsed.cx == null || parsed.cy == null || parsed.width == null || parsed.height == null) {
      return {
        found: false,
        cx: 0,
        cy: 0,
        size: 0,
        confidence: parsed.confidence ?? 0,
        reasoning: parsed.reasoning ?? "No panel detected",
      };
    }

    const aspect = data.width / data.height;
    const sideWidthNorm = Math.min(parsed.width, parsed.height / aspect);
    const INSET = 0.92;
    const size = Math.max(0.05, Math.min(0.8, sideWidthNorm * INSET));

    return {
      found: true,
      cx: parsed.cx,
      cy: parsed.cy,
      size,
      confidence: parsed.confidence ?? 0.75,
      reasoning: parsed.reasoning ?? "",
    };
  });
