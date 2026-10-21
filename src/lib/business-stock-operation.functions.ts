import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  parseStockRequest,
  parseStockOutcome,
  type StockRequest,
  type StockOutcome,
} from "@/lib/business-stock-operation";

type StockClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { code?: string } | null }>;
};
/** The caller's authenticated client is mandatory. There is no service-key fallback. */
export async function executeStockRequest(
  client: StockClient,
  userId: string,
  request: StockRequest,
  inspect: boolean,
): Promise<StockOutcome> {
  const checked = parseStockRequest(request);
  if (checked.expectedAccountId !== userId) return { version: 1, status: "unavailable" };
  try {
    const reply = await client.rpc("business_stock_operation_v1", {
      _request: checked,
      _inspect: inspect,
    });
    if (reply.error) {
      // Missing deployment or denied access cannot authorize a replacement operation.
      if (["PGRST202", "42883", "42501"].includes(reply.error.code ?? ""))
        return { version: 1, status: "unavailable" };
      return { version: 1, status: "unknown" };
    }
    return parseStockOutcome(reply.data, checked);
  } catch {
    return { version: 1, status: "unknown" };
  }
}
export const submitBusinessStockAdjustment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(parseStockRequest)
  .handler(({ data, context }) =>
    executeStockRequest(context.supabase as unknown as StockClient, context.userId, data, false),
  );
export const inspectBusinessStockAdjustment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(parseStockRequest)
  .handler(({ data, context }) =>
    executeStockRequest(context.supabase as unknown as StockClient, context.userId, data, true),
  );
