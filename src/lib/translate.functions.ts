import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n";
import { AI_MODELS, chatCompletion, isAiConfigured } from "@/lib/ai/provider.server";

const codes = SUPPORTED_LANGUAGES.map((l) => l.code) as [string, ...string[]];

/**
 * On-demand translation of user-generated content (listing descriptions,
 * messages) via the configured OpenAI-compatible AI provider
 * (see src/lib/ai/provider.server.ts).
 */
export const translateText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { text: string; target: string }) =>
    z
      .object({
        text: z.string().min(1).max(8000),
        target: z.enum(codes),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    if (!isAiConfigured()) {
      return { text: data.text, translated: false, error: "AI provider unavailable" };
    }
    const langName =
      SUPPORTED_LANGUAGES.find((l) => l.code === data.target)?.label ?? data.target;

    const resp = await chatCompletion({
      model: AI_MODELS.flash,
      messages: [
        {
          role: "system",
          content:
            "You are a translator. Translate the user's text to the requested target language. Preserve line breaks, numbers, prices, model names, and proper nouns. Return ONLY the translated text — no quotes, no preamble.",
        },
        {
          role: "user",
          content: `Target language: ${langName}\n\nText:\n${data.text}`,
        },
      ],
    });

    if (!resp.ok) {
      return {
        text: data.text,
        translated: false,
        error: `Translation failed (${resp.status})`,
      };
    }
    const json = (await resp.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const out = json.choices?.[0]?.message?.content?.trim();
    if (!out) return { text: data.text, translated: false, error: "Empty response" };
    return { text: out, translated: true };
  });
