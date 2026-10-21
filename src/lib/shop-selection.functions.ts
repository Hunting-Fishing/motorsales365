import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  parseShopSelectionRequest,
  parseShopSelectionOutcome,
  parseShopSelectionView,
  selectionId,
  type ShopSelectionRequest,
  type ShopSelectionOutcome,
} from "@/lib/shop-selection";
type Client = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { code?: string } | null }>;
};
export async function executeShopSelection(
  client: Client,
  account: string,
  value: ShopSelectionRequest,
  inspect: boolean,
): Promise<ShopSelectionOutcome> {
  const request = parseShopSelectionRequest(value);
  if (account !== request.expectedAccountId) return { version: 1, status: "unavailable" };
  try {
    const { data, error } = await client.rpc("shop_selection_change_v1", {
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
    return parseShopSelectionOutcome(data, request);
  } catch {
    return { version: 1, status: "unknown" };
  }
}
export const listSelectableShops = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: { expectedAccountId: string }) => ({
    expectedAccountId: selectionId(v?.expectedAccountId),
  }))
  .handler(async ({ data, context }) => {
    if (context.userId !== data.expectedAccountId) throw Error("Shop selection unavailable.");
    try {
      const response = await (context.supabase as unknown as Client).rpc("shop_selection_list_v1", {
        _account: context.userId,
      });
      if (response.error) throw Error("Shop selection unavailable.");
      return parseShopSelectionView(response.data, context.userId);
    } catch {
      throw Error("Shop selection unavailable. Reload or contact your manager.");
    }
  });
export const changeSelectedShop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(parseShopSelectionRequest)
  .handler(({ data, context }) =>
    executeShopSelection(context.supabase as unknown as Client, context.userId, data, false),
  );
export const inspectShopSelection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(parseShopSelectionRequest)
  .handler(({ data, context }) =>
    executeShopSelection(context.supabase as unknown as Client, context.userId, data, true),
  );
