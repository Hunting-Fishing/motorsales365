import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { captureNativeRequestCaller } from "./native-request-caller.server";
import {
  customerCommunicationsInput,
  customerCommunicationsProjection,
  parseCustomerCommunicationsIdentity,
  parseCustomerCommunicationsList,
  type CustomerCommunicationsResult,
} from "./customer-communications";

const failure = "Could not load this customer's communications snapshot. Refresh and try again.";
const accountChanged = "Account changed. Refresh before loading this customer's communications.";
type Response = { data: unknown; error: unknown };
type NativeReadBuilder = PromiseLike<Response> & {
  select(projection: string): NativeReadBuilder;
  eq(column: "id" | "customer_id", value: string): NativeReadBuilder;
  order(
    column: "date" | "id",
    options: { ascending: false; nullsFirst?: false },
  ): NativeReadBuilder;
  limit(count: 201): NativeReadBuilder;
  abortSignal(signal: AbortSignal): NativeReadBuilder;
  maybeSingle(): NativeReadBuilder;
};
type NativeReadClient = {
  schema(name: "shop_manager"): {
    from(table: "customers" | "customer_communications"): NativeReadBuilder;
  };
};

export const getCustomerCommunicationsSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = customerCommunicationsInput.safeParse(input);
    if (!parsed.success) throw new Error("Invalid customer communications snapshot request.");
    return parsed.data;
  })
  .handler(async ({ data, context }): Promise<CustomerCommunicationsResult> => {
    function assertActor() {
      if (context?.userId !== data.expectedAccountId) throw new Error(accountChanged);
    }
    // The current browser token may differ from the actor captured in a query
    // key. Check the validated middleware actor before handler request/schema access.
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
      // Generated types cover public only. Use a narrow adapter over the same
      // middleware caller client, never an admin/browser singleton or RPC.
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
      if (!parseCustomerCommunicationsIdentity(primary.data, data.customerId)) {
        return { available: false, rows: [], hasMore: false };
      }
      assertReady();
      const listQuery = native
        .from("customer_communications")
        .select(customerCommunicationsProjection)
        .eq("customer_id", data.customerId)
        .order("date", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false })
        .limit(201)
        .abortSignal(signal);
      assertReady();
      const list = await listQuery;
      assertReady();
      if (list.error) throw new Error(failure);
      return parseCustomerCommunicationsList(list.data, data.customerId);
    } catch {
      // Do not serialize raw errors, retry through a broader reader, or turn
      // failed validation, cancellation or lost actor context into an empty log.
      throw new Error(failure);
    }
  });

// Separate reads do not establish atomic parent visibility/revocation. RLS must
// authorize each request. AbortSignal forwarding concerns the HTTP/client request,
// not a guarantee of PostgreSQL cancellation. This reader performs no writes.
