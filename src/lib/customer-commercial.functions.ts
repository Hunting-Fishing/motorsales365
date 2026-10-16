import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { captureNativeRequestCaller } from "./native-request-caller.server";
import {
  customerCommercialInput,
  customerCommercialProjections,
  parseCustomerCommercialIdentity,
  parseCustomerCommercialList,
  type CustomerCommercialResult,
} from "./customer-commercial";

const failure = "Could not load this customer's commercial snapshot. Refresh and try again.";
const accountChanged =
  "Account changed. Refresh before loading this customer's commercial history.";
type Response = { data: unknown; error: unknown };
type NativeReadBuilder = PromiseLike<Response> & {
  select(projection: string): NativeReadBuilder;
  eq(column: "id" | "customer_id", value: string): NativeReadBuilder;
  order(
    column: "created_at" | "id",
    options: { ascending: false; nullsFirst?: false },
  ): NativeReadBuilder;
  limit(count: 26): NativeReadBuilder;
  abortSignal(signal: AbortSignal): NativeReadBuilder;
  maybeSingle(): NativeReadBuilder;
};
type NativeReadClient = {
  schema(name: "shop_manager"): {
    from(table: "customers" | "invoices" | "quotes"): NativeReadBuilder;
  };
};

export const getCustomerCommercialSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = customerCommercialInput.safeParse(input);
    if (!parsed.success) throw new Error("Invalid customer commercial snapshot request.");
    return parsed.data;
  })
  .handler(async ({ data, context }): Promise<CustomerCommercialResult> => {
    function assertActor() {
      if (context?.userId !== data.expectedAccountId) throw new Error(accountChanged);
    }
    // The browser may attach its current token after the query key was captured.
    // Compare the validated middleware actor before handler request/schema access.
    assertActor();
    try {
      const caller = captureNativeRequestCaller(context, data.expectedAccountId);
      const request = getRequest();
      const signal = request.signal;
      const assertCaller = await caller.verify(request);
      function assertReady() {
        assertActor();
        assertCaller();
      }
      assertReady();
      // Generated types describe public only. Bind this narrow adapter to the
      // middleware's caller client, never an admin/browser singleton or RPC.
      const native = (context.supabase as unknown as NativeReadClient).schema("shop_manager");
      assertReady();
      const primaryQuery = native
        .from("customers")
        .select("id")
        .eq("id", data.customerId)
        .abortSignal(signal)
        .maybeSingle();
      assertReady();
      const primary = await primaryQuery;
      assertReady();
      if (primary.error) throw new Error(failure);
      if (!parseCustomerCommercialIdentity(primary.data, data.customerId)) {
        return data.kind === "invoices"
          ? { kind: "invoices", available: false, rows: [], hasMore: false }
          : { kind: "quotes", available: false, rows: [], hasMore: false };
      }
      assertReady();
      const listQuery = native
        .from(data.kind)
        .select(customerCommercialProjections[data.kind])
        .eq("customer_id", data.customerId)
        .order("created_at", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false })
        .limit(26)
        .abortSignal(signal);
      assertReady();
      const list = await listQuery;
      assertReady();
      if (list.error) throw new Error(failure);
      return parseCustomerCommercialList(data.kind, list.data, data.customerId);
    } catch {
      // Backend, malformed payload, account-change and abort details stay private.
      // No broader fallback, automatic retry, or error-to-empty conversion.
      throw new Error(failure);
    }
  });

// The two reads are separate snapshots, not atomic parent visibility/revocation.
// RLS must independently authorize each request. AbortSignal forwarding concerns
// the HTTP/client request and does not establish PostgreSQL query cancellation.
