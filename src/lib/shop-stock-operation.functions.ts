import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  parseShopStockRequest,
  parseShopStockOutcome,
  parseShopStockView,
  shopStockId,
  type ShopStockRequest,
  type ShopStockOutcome,
} from "@/lib/shop-stock-operation";
type Client = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { code?: string } | null }>;
};
export async function executeShopStockRequest(
  client: Client,
  userId: string,
  value: ShopStockRequest,
  inspect: boolean,
): Promise<ShopStockOutcome> {
  const request = parseShopStockRequest(value);
  if (request.expectedAccountId !== userId) return { version: 1, status: "unavailable" };
  try {
    const response = await client.rpc("shop_stock_operation_v1", {
      _request: request,
      _inspect: inspect,
    });
    if (response.error)
      return {
        version: 1,
        status: ["PGRST202", "42883", "42501"].includes(response.error.code ?? "")
          ? "unavailable"
          : "unknown",
      };
    return parseShopStockOutcome(response.data, request);
  } catch {
    return { version: 1, status: "unknown" };
  }
}
export const submitShopStockAdjustment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(parseShopStockRequest)
  .handler(({ data, context }) =>
    executeShopStockRequest(context.supabase as unknown as Client, context.userId, data, false),
  );
export const inspectShopStockAdjustment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(parseShopStockRequest)
  .handler(({ data, context }) =>
    executeShopStockRequest(context.supabase as unknown as Client, context.userId, data, true),
  );
export const getShopStockItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: { expectedAccountId: string; itemId: string }) => ({
    expectedAccountId: shopStockId(value?.expectedAccountId),
    itemId: shopStockId(value?.itemId),
  }))
  .handler(async ({ data, context }) => {
    if (data.expectedAccountId !== context.userId) throw new Error("Shop inventory unavailable.");
    try {
      const client = context.supabase as unknown as Client;
      const response = await client.rpc("shop_stock_item_v1", {
        _account: context.userId,
        _item: data.itemId,
      });
      if (response.error)
        throw new Error("Shop inventory unavailable. Reload or contact your manager.");
      return parseShopStockView(response.data, context.userId, data.itemId);
    } catch {
      throw new Error("Shop inventory unavailable. Reload or contact your manager.");
    }
  });
