/**
 * Provider-agnostic LLM access (server-only).
 *
 * Every AI feature talks to an OpenAI-compatible Chat Completions endpoint.
 * The default is Google's Gemini OpenAI-compatible API, which serves the same
 * Gemini models these features were built and tuned against. Any other
 * OpenAI-compatible provider (OpenAI, OpenRouter, a self-hosted gateway, ...)
 * works by changing env vars only — no code change.
 *
 * Environment (set as Cloudflare Worker secrets / vars; never commit values):
 *   AI_API_KEY      required. Provider API key (e.g. Google AI Studio key).
 *   AI_BASE_URL     optional. Defaults to Gemini's OpenAI-compatible endpoint.
 *   AI_MODEL        optional. Overrides the model for every call.
 *   AI_MODEL_MAP    optional. JSON map of logical -> provider model ids,
 *                   e.g. {"gemini-3-flash-preview":"gpt-4.1-mini"}.
 */
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const DEFAULT_AI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";

/** Logical model ids used by the app (Gemini family). */
export const AI_MODELS = {
  flash: "gemini-2.5-flash",
  flashNext: "gemini-3-flash-preview",
} as const;

export type LogicalModel = (typeof AI_MODELS)[keyof typeof AI_MODELS];

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI provider is not configured (AI_API_KEY missing).");
    this.name = "AiNotConfiguredError";
  }
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.AI_API_KEY);
}

function baseUrl(): string {
  return (process.env.AI_BASE_URL || DEFAULT_AI_BASE_URL).replace(/\/+$/, "");
}

/** Resolve a logical model id to the id the configured provider expects. */
export function resolveModel(model: LogicalModel): string {
  if (process.env.AI_MODEL) return process.env.AI_MODEL;
  const rawMap = process.env.AI_MODEL_MAP;
  if (rawMap) {
    try {
      const map = JSON.parse(rawMap) as Record<string, string>;
      if (typeof map[model] === "string" && map[model]) return map[model];
    } catch {
      console.warn("[ai] AI_MODEL_MAP is not valid JSON; ignoring");
    }
  }
  return model;
}

function apiKey(): string {
  const key = process.env.AI_API_KEY;
  if (!key) throw new AiNotConfiguredError();
  return key;
}

/** Vercel AI SDK model handle for generateText / generateObject. */
export function aiModel(model: LogicalModel) {
  const provider = createOpenAICompatible({
    name: "ai",
    baseURL: baseUrl(),
    apiKey: apiKey(),
  });
  return provider(resolveModel(model));
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/**
 * Plain Chat Completions call for simple text/JSON prompts. Returns the raw
 * fetch Response so callers keep their existing status handling.
 */
export async function chatCompletion(opts: {
  model: LogicalModel;
  messages: ChatMessage[];
  responseFormat?: { type: "json_object" };
}): Promise<Response> {
  return fetch(`${baseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify({
      model: resolveModel(opts.model),
      messages: opts.messages,
      ...(opts.responseFormat ? { response_format: opts.responseFormat } : {}),
    }),
  });
}
