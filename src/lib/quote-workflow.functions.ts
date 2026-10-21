import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  parseQuoteRequest,
  parseQuoteOutcome,
  parseQuoteView,
  quoteId,
  type QuoteRequest,
  type QuoteOutcome,
} from "@/lib/quote-workflow";
type Client = {
  rpc(
    name: string,
    args: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: { code?: string } | null }>;
};
export async function executeQuoteWorkflow(
  client: Client,
  account: string,
  value: QuoteRequest,
  inspect: boolean,
): Promise<QuoteOutcome> {
  const request = parseQuoteRequest(value);
  if (account !== request.expectedAccountId) return { version: 1, status: "unavailable" };
  try {
    const { data, error } = await client.rpc("quote_workflow_change_v1", {
      _request: request,
      _inspect: inspect,
    });
    if (error)
      return {
        version: 1,
        status: ["42501", "42883", "PGRST202"].includes(error.code ?? "")
          ? "unavailable"
          : "unknown",
      };
    return parseQuoteOutcome(data, request);
  } catch {
    return { version: 1, status: "unknown" };
  }
}
export const readQuoteWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: { expectedAccountId: string; quoteId: string }) => ({
    expectedAccountId: quoteId(v?.expectedAccountId),
    quoteId: quoteId(v?.quoteId),
  }))
  .handler(async ({ data, context }) => {
    if (context.userId !== data.expectedAccountId) throw Error("Quote unavailable.");
    try {
      const response = await (context.supabase as unknown as Client).rpc("quote_workflow_read_v1", {
        _account: context.userId,
        _quote: data.quoteId,
      });
      if (response.error) throw Error("Quote unavailable.");
      return parseQuoteView(response.data, context.userId, data.quoteId);
    } catch {
      throw Error("Quote workflow unavailable. Reload or contact your manager.");
    }
  });
export const changeQuoteWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(parseQuoteRequest)
  .handler(({ data, context }) =>
    executeQuoteWorkflow(context.supabase as unknown as Client, context.userId, data, false),
  );
export const inspectQuoteWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(parseQuoteRequest)
  .handler(({ data, context }) =>
    executeQuoteWorkflow(context.supabase as unknown as Client, context.userId, data, true),
  );
