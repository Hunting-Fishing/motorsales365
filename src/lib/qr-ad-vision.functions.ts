/**
 * AI-powered "Scan Here" panel detector for QR ad flyers.
 *
 * Sends the flyer to Gemini and asks for the bounding box of the white QR
 * placeholder. Used by the admin Smart auto-fit flow as a smarter alternative
 * to the pure-pixel `detectQrSlot` heuristic (which fails when the panel has
 * a colored border, isn't pure white, or competes with other white space).
 *
 * Returns normalized cx/cy/size (relative to template WIDTH, matching the
 * existing template schema) plus a confidence score. Callers should fall
 * back to the heuristic detector when `found` is false or confidence is low.
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
  // Normalized 0..1 coordinates of the panel center + side.
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
  size: number; // square QR side, normalized to template WIDTH
  confidence: number;
  reasoning: string;
};

const SYSTEM_PROMPT = `You are a precise computer-vision annotator that locates the QR code placement area in marketing flyers.

The flyer always has a dedicated rectangular WHITE panel where a QR code should be placed. The panel is usually labeled "SCAN HERE", "SCAN ME", "SCAN TO LEARN MORE", or is a clearly empty white square framed by a colored border. It may already contain a placeholder QR or be completely blank.

Return ONLY a JSON object — no prose, no markdown fences, no comments.

JSON shape (all coordinates normalized 0..1 relative to the image, origin = top-left):
{
  "found": boolean,
  "cx": number,        // center X of the white panel
  "cy": number,        // center Y of the white panel
  "width": number,     // panel width
  "height": number,    // panel height
  "confidence": number,// 0..1, how certain you are this is the QR target panel
  "reasoning": string  // <= 200 chars
}

Rules:
- The panel is the place where a SQUARE QR code should land — pick the inner WHITE area, not the colored frame around it.
- Ignore: brand logos, product photos, vehicles, decorative whitespace, text columns. They are NOT the QR target.
- If no dedicated QR panel exists, return { "found": false, "confidence": 0, "reasoning": "..." } and omit the box fields.
- Be tight: the bounding box should hug the inner white area so a QR rendered to that box fits with light padding.`;

const USER_PROMPT = `Find the white QR placement panel ("Scan Here" / "Scan Me" area) in this flyer and return the JSON object described in the system prompt.`;

/** Strip ```json fences / leading prose if the model included any. */
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
  if (!res.ok) {
    throw new Error(`Could not download flyer image (${res.status})`);
  }
  const mediaType = res.headers.get("content-type")?.split(";")[0] || "image/png";
  const buf = await res.arrayBuffer();
  return { bytes: new Uint8Array(buf), mediaType };
}

export const detectScanHereWithVision = createServerFn({ method: "POST" })
  .middleware([requireAdminRoleAudited("qrAds.smartFit")])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<VisionDetection> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      throw new Error("Smart fit is unavailable — LOVABLE_API_KEY is missing.");
    }

    const { bytes, mediaType } = await fetchImageAsBytes(data.imageUrl);

    const gateway = createOpenAICompatible({
      name: "lovable",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      headers: {
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
    });
    const model = gateway("google/gemini-2.5-flash");

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
        return {
          found: false,
          cx: 0,
          cy: 0,
          size: 0,
          confidence: 0,
          reasoning: "AI_CREDITS_EXHAUSTED",
        };
      }
      if (/429|rate.?limit/i.test(msg)) {
        return {
          found: false,
          cx: 0,
          cy: 0,
          size: 0,
          confidence: 0,
          reasoning: "AI_RATE_LIMITED",
        };
      }
      throw new Error(`Smart fit failed: ${msg.slice(0, 200)}`);
    }

    let parsed: z.infer<typeof visionResponseSchema>;
    try {
      parsed = visionResponseSchema.parse(JSON.parse(extractJson(text)));
    } catch {
      return {
        found: false,
        cx: 0,
        cy: 0,
        size: 0,
        confidence: 0,
        reasoning: "AI response was not valid JSON",
      };
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

    // Convert AI box (normalized to image dims) to template-space square side.
    // template.qr.size is expressed relative to WIDTH; the panel height in
    // template coords is panel.height * (templateH / templateW), so the
    // largest square that fits inside the panel has side =
    //   min( panel.width, panel.height * (H/W) )   (all in width-normalized)
    const aspect = data.width / data.height;
    const sideWidthNorm = Math.min(parsed.width, parsed.height / aspect);

    // Slight inset so the QR doesn't kiss the printed border of the panel.
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
