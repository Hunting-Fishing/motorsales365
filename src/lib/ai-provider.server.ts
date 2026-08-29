// Standalone AI provider adapter.
//
// This intentionally has NO Lovable fallback. Configure an OpenAI-compatible
// endpoint through AI_API_BASE_URL + AI_API_KEY. Individual features may set
// their own model env var; AI_MODEL is the shared fallback.

export type AiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiChatOptions = {
  messages: AiMessage[];
  model?: string;
  responseFormat?: { type: "json_object" };
  temperature?: number;
  maxTokens?: number;
};

type AiChatResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
};

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function standaloneAiConfigured(): boolean {
  return Boolean(
    process.env.AI_API_BASE_URL?.trim() &&
      process.env.AI_API_KEY?.trim() &&
      process.env.AI_MODEL?.trim(),
  );
}

export async function callStandaloneAi(options: AiChatOptions): Promise<string | null> {
  const baseUrl = process.env.AI_API_BASE_URL?.trim();
  const apiKey = process.env.AI_API_KEY?.trim();
  const model = options.model?.trim() || process.env.AI_MODEL?.trim();

  // Missing provider configuration disables the feature cleanly. Never fall
  // back to Lovable Cloud or another implicit provider.
  if (!baseUrl || !apiKey || !model) return null;

  const body: Record<string, unknown> = {
    model,
    messages: options.messages,
  };
  if (options.responseFormat) body.response_format = options.responseFormat;
  if (typeof options.temperature === "number") body.temperature = options.temperature;
  if (typeof options.maxTokens === "number") body.max_tokens = options.maxTokens;

  const response = await fetch(`${trimTrailingSlash(baseUrl)}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`AI provider request failed (${response.status})`);
  }

  const json = (await response.json()) as AiChatResponse;
  return json.choices?.[0]?.message?.content?.trim() || null;
}
