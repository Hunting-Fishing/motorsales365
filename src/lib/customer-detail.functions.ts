import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  customerDetailInput,
  customerDetailProjections,
  parseCustomerDetailCustomer,
  parseCustomerDetailIdentity,
  parseCustomerDetailList,
  type CustomerDetailResult,
} from "./customer-detail";

const failure = "Could not load this customer snapshot. Refresh and try again.";
const accountChanged = "Account changed. Refresh before loading this customer.";
type Response = { data: unknown; error: unknown };
type NativeReadBuilder = PromiseLike<Response> & {
  select(projection: string): NativeReadBuilder;
  eq(column: "id" | "customer_id", value: string): NativeReadBuilder;
  order(
    column: "created_at" | "id",
    options: { ascending: false; nullsFirst?: false },
  ): NativeReadBuilder;
  limit(count: 101): NativeReadBuilder;
  abortSignal(signal: AbortSignal): NativeReadBuilder;
  maybeSingle(): NativeReadBuilder;
};
type NativeReadClient = {
  schema(name: "shop_manager"): {
    from(table: "customers" | "vehicles" | "work_orders"): NativeReadBuilder;
  };
};

export const getCustomerDetailSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = customerDetailInput.safeParse(input);
    if (!parsed.success) throw new Error("Invalid customer snapshot request.");
    return parsed.data;
  })
  .handler(async ({ data, context }): Promise<CustomerDetailResult> => {
    function assertActor() {
      if (context?.userId !== data.expectedAccountId) throw new Error(accountChanged);
    }
    // The global auth attacher may obtain a different token after cache-key
    // capture. Fail before even reading the request or binding a schema.
    assertActor();
    try {
      const signal = getRequest().signal;
      function assertReady() {
        assertActor();
        if (signal.aborted) throw new Error(failure);
      }
      assertReady();
      // Generated types cover public only. This bounded adapter retains the
      // middleware's request-scoped caller client, never a browser/admin client.
      const native = (context.supabase as unknown as NativeReadClient).schema("shop_manager");
      assertReady();
      const primaryQuery = native
        .from("customers")
        .select(data.kind === "customer" ? customerDetailProjections.customer : "id")
        .eq("id", data.customerId)
        .abortSignal(signal)
        .maybeSingle();
      assertReady();
      const primary = await primaryQuery;
      assertReady(); // Including after an awaited identity/visibility check.
      if (primary.error) throw new Error(failure);
      if (data.kind === "customer") {
        return {
          kind: data.kind,
          customer: parseCustomerDetailCustomer(primary.data, data.customerId),
        };
      }
      if (!parseCustomerDetailIdentity(primary.data, data.customerId)) {
        return data.kind === "vehicles"
          ? { kind: "vehicles", available: false, rows: [], hasMore: false }
          : { kind: "work_orders", available: false, rows: [], hasMore: false };
      }
      assertReady();
      const listQuery = native
        .from(data.kind)
        .select(customerDetailProjections[data.kind])
        .eq("customer_id", data.customerId)
        .order("created_at", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false })
        .limit(101)
        .abortSignal(signal);
      assertReady();
      const list = await listQuery;
      assertReady();
      if (list.error) throw new Error(failure);
      return parseCustomerDetailList(data.kind, list.data, data.customerId);
    } catch {
      // Includes backend, validation and cancellation errors. Never serialize
      // raw diagnostics, retry using a broader reader, or infer an empty list.
      throw new Error(failure);
    }
  });

// Request AbortSignal forwarding concerns the HTTP/client request only. It does
// not establish PostgreSQL cancellation, live RLS parity or same-statement
// customer/list visibility: the latter remains independently enforced by RLS.
