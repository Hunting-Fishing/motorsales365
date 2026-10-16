import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { captureNativeRequestCaller } from "./native-request-caller.server";
import {
  SHOP_EXPENSE_READ_FAILURE,
  SHOP_EXPENSE_READ_PAGE_SIZE,
  shopExpenseReadProjections,
  shopExpenseScopeRequestSchema,
  shopExpenseReadRequestSchema,
  parseShopExpenseScope,
  parseShopExpenseObservedShop,
  parseShopExpenseSDKResponse,
  parseShopExpensePageResponse,
} from "./shop-expenses-read-contract";

type Read = PromiseLike<unknown> & {
  select(projection: string, options?: { count: "exact" }): Read;
  eq(column: string, value: string | boolean): Read;
  order(column: string, options: { ascending: boolean; nullsFirst?: false }): Read;
  range(from: number, to: number): Read;
  abortSignal(signal: AbortSignal): Read;
  retry(enabled: false): Read;
};
type Native = {
  from(table: "expenses" | "expense_categories" | "vehicles"): Read;
  rpc(name: "get_current_user_shop_id"): Read;
};
type CallerClient = { schema(name: "shop_manager"): Native };
const sameShop = (left: string | null, right: string | null) =>
  left === null || right === null ? left === right : left.toLowerCase() === right.toLowerCase();

export const getShopExpenseScope = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => {
    const result = shopExpenseScopeRequestSchema.safeParse(value);
    if (!result.success) throw new Error("Invalid shop scope request.");
    return result.data;
  })
  .handler(async ({ data, context }) => {
    const expectedAccountId = data.expectedAccountId;
    if (context?.userId !== expectedAccountId)
      throw new Error("Account changed. Refresh before loading shop expenses.");
    try {
      const caller = captureNativeRequestCaller(context, expectedAccountId);
      const request = getRequest(),
        assertCurrent = await caller.verify(request);
      assertCurrent();
      const native = (context.supabase as unknown as CallerClient).schema("shop_manager");
      assertCurrent();
      async function observe() {
        assertCurrent();
        const query = native
          .rpc("get_current_user_shop_id")
          .abortSignal(request.signal)
          .retry(false);
        assertCurrent();
        const response = await query;
        assertCurrent();
        const shopId = parseShopExpenseObservedShop(response);
        assertCurrent();
        return shopId;
      }
      const shopId = await observe(),
        after = await observe();
      if (!sameShop(shopId, after)) throw new Error(SHOP_EXPENSE_READ_FAILURE);
      const result = parseShopExpenseScope({ available: shopId !== null, shopId });
      assertCurrent();
      return result;
    } catch {
      throw new Error(SHOP_EXPENSE_READ_FAILURE);
    }
  });

export const getShopExpenseReadPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => {
    const result = shopExpenseReadRequestSchema.safeParse(value);
    if (!result.success) throw new Error("Invalid shop page request.");
    return result.data;
  })
  .handler(async ({ data, context }) => {
    const intent = Object.freeze({
      expectedAccountId: data.expectedAccountId,
      expectedShopId: data.expectedShopId,
      kind: data.kind,
      page: data.page,
    });
    if (context?.userId !== intent.expectedAccountId)
      throw new Error("Account changed. Refresh before loading shop expenses.");
    try {
      const caller = captureNativeRequestCaller(context, intent.expectedAccountId);
      const request = getRequest(),
        assertCurrent = await caller.verify(request);
      assertCurrent();
      const native = (context.supabase as unknown as CallerClient).schema("shop_manager");
      assertCurrent();
      async function observe() {
        assertCurrent();
        const query = native
          .rpc("get_current_user_shop_id")
          .abortSignal(request.signal)
          .retry(false);
        assertCurrent();
        const response = await query;
        assertCurrent();
        const shopId = parseShopExpenseObservedShop(response);
        assertCurrent();
        if (!sameShop(shopId, intent.expectedShopId)) throw new Error(SHOP_EXPENSE_READ_FAILURE);
      }
      await observe();
      assertCurrent();
      let query = native
        .from(intent.kind === "categories" ? "expense_categories" : intent.kind)
        .select(shopExpenseReadProjections[intent.kind], { count: "exact" });
      if (intent.kind === "expenses")
        query = query
          .eq("shop_id", intent.expectedShopId)
          .order("expense_date", { ascending: false })
          .order("id", { ascending: false });
      else if (intent.kind === "categories")
        query = query
          .eq("shop_id", intent.expectedShopId)
          .eq("is_active", true)
          .order("name", { ascending: true })
          .order("id", { ascending: true });
      else query = query.order("make", { ascending: true }).order("id", { ascending: true });
      query = query
        .range(
          intent.page * SHOP_EXPENSE_READ_PAGE_SIZE,
          intent.page * SHOP_EXPENSE_READ_PAGE_SIZE + SHOP_EXPENSE_READ_PAGE_SIZE - 1,
        )
        .abortSignal(request.signal)
        .retry(false);
      assertCurrent();
      const response = await query;
      assertCurrent();
      parseShopExpenseSDKResponse(response, true);
      assertCurrent();
      const result = parseShopExpensePageResponse(response, intent);
      assertCurrent();
      await observe();
      assertCurrent();
      return result;
    } catch {
      throw new Error(SHOP_EXPENSE_READ_FAILURE);
    }
  });

// The existing ID-only resolver is observed, not repaired or trusted as fresh
// membership. Same-client getUser is not strict session revocation/human proof.
// Separate scope/read/recheck statements do not provide atomic shop snapshots.
