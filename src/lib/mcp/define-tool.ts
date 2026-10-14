import { z } from "zod";

/**
 * Minimal, dependency-free MCP tool definition helpers.
 *
 * Tools declare a zod "raw shape" for their input; the server validates
 * arguments with it and publishes the equivalent JSON Schema via tools/list.
 */

export type ToolContent = { type: "text"; text: string };

export type ToolResult = {
  content: ToolContent[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

export interface ToolContext {
  /** True when the request carried a verified bearer token. */
  isAuthenticated(): boolean;
  /** Raw bearer token (forward to Supabase so RLS runs as the caller). */
  getToken(): string | undefined;
  /** `sub` claim of the verified token. */
  getUserId(): string | undefined;
}

export type ToolAnnotations = {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
};

export interface ToolDefinition<S extends z.ZodRawShape = z.ZodRawShape> {
  name: string;
  title?: string;
  description: string;
  inputSchema: S;
  annotations?: ToolAnnotations;
  handler: (
    input: z.infer<z.ZodObject<S>>,
    ctx: ToolContext,
  ) => ToolResult | Promise<ToolResult>;
}

export function defineTool<S extends z.ZodRawShape>(def: ToolDefinition<S>): ToolDefinition<S> {
  return def;
}
