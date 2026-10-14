import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  customerRemindersInput,
  customerRemindersProjection,
  parseCustomerRemindersParent,
  parseCustomerRemindersList,
  type CustomerRemindersResult,
} from "./customer-reminders";

const failure = "Could not load this customer's reminders snapshot. Refresh and try again.";
const accountChanged = "Account changed. Refresh before loading this customer's reminders.";
type Response = { data: unknown; error: unknown };
type NativeReadBuilder = PromiseLike<Response> & {
  select(projection: string): NativeReadBuilder;
  eq(column: "id" | "customer_id" | "shop_id", value: string): NativeReadBuilder;
  order(
    column: "due_date" | "id",
    options: { ascending: true; nullsFirst?: false },
  ): NativeReadBuilder;
  limit(count: 101): NativeReadBuilder;
  abortSignal(signal: AbortSignal): NativeReadBuilder;
  maybeSingle(): NativeReadBuilder;
};
type NativeReadClient = {
  schema(name: "shop_manager"): {
    from(table: "customers" | "customer_reminders"): NativeReadBuilder;
  };
};

export const getCustomerRemindersSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = customerRemindersInput.safeParse(input);
    if (!parsed.success) throw new Error("Invalid customer reminders snapshot request.");
    return parsed.data;
  })
  .handler(async ({ data, context }): Promise<CustomerRemindersResult> => {
    function assertActor() {
      if (context?.userId !== data.expectedAccountId) throw new Error(accountChanged);
    }
    // Bind the query-key actor to the validated middleware actor before handler
    // request access or schema binding; the browser may have changed accounts.
    assertActor();
    try {
      const signal = getRequest().signal;
      function assertReady() {
        assertActor();
        if (signal.aborted) throw new Error(failure);
      }
      assertReady();
      // Generated types cover public only. This bounded adapter retains the
      // middleware caller client, never an admin/browser singleton or RPC.
      const native = (context.supabase as unknown as NativeReadClient).schema("shop_manager");
      assertReady();
      const primaryQuery = native
        .from("customers")
        .select("id,shop_id")
        .eq("id", data.customerId)
        .abortSignal(signal)
        .maybeSingle();
      assertReady();
      const primary = await primaryQuery;
      assertReady();
      if (primary.error) throw new Error(failure);
      const parent = parseCustomerRemindersParent(primary.data, data.customerId);
      if (parent === null) return { available: false, rows: [], hasMore: false };
      assertReady();
      const listQuery = native
        .from("customer_reminders")
        .select(customerRemindersProjection)
        .eq("customer_id", data.customerId)
        .eq("shop_id", parent.shop_id)
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("id", { ascending: true })
        .limit(101)
        .abortSignal(signal);
      assertReady();
      const list = await listQuery;
      assertReady();
      if (list.error) throw new Error(failure);
      return parseCustomerRemindersList(list.data, data.customerId, parent.shop_id);
    } catch {
      // Do not expose diagnostics, use a broader fallback, retry automatically,
      // or treat malformed bindings, cancellation and actor loss as an empty list.
      throw new Error(failure);
    }
  });

// Dual filters improve this application read's integrity, not the underlying
// shop-only RLS/customer binding. Separate reads are not atomic parent visibility
// or revocation: a future invoker join and trusted native authority remain release
// gates. AbortSignal concerns HTTP/client requests, not guaranteed DB cancellation.
