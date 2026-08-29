import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n";
import { callStandaloneAi } from "@/lib/ai-provider.server";

const codes = SUPPORTED_LANGUAGES.map((l) => l.code) as [string, ...string[]];

/** On-demand translation using the configured standalone AI provider. */
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
    const langName =
      SUPPORTED_LANGUAGES.find((l) => l.code === data.target)?.label ?? data.target;

    try {
      const out = await callStandaloneAi({
        model: process.env.AI_MODEL_TRANSLATE,
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

      if (!out) {
        return { text: data.text, translated: false, error: "AI provider unavailable" };
      }
      return { text: out, translated: true };
    } catch (error) {
      console.error("Translation provider failed", error);
      return { text: data.text, translated: false, error: "Translation failed" };
    }
  });
