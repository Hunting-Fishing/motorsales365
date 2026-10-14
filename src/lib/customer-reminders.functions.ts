import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  customerRemindersInput,
  parseCustomerRemindersSnapshot,
  type CustomerRemindersResult,
} from "./customer-reminders";

const failure = "Could not load this customer's reminders snapshot. Refresh and try again.";
const accountChanged = "Account changed. Refresh before loading this customer's reminders.";
type Response = { data: unknown; error: unknown };
type ReminderReadBuilder = PromiseLike<Response> & {
  abortSignal(signal: AbortSignal): ReminderReadBuilder;
  retry(enabled: false): ReminderReadBuilder;
};
type ReminderReadClient = {
  rpc(name: "crm_customer_reminders", args: { _customer_id: string }): ReminderReadBuilder;
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
    // request access or client binding; the browser may have changed accounts.
    assertActor();
    try {
      const signal = getRequest().signal;
      function assertReady() {
        assertActor();
        if (signal.aborted) throw new Error(failure);
      }
      assertReady();
      // Generated types omit this unapplied API. Retain the fixed-bearer caller
      // client through a narrow adapter, never direct tables or a broader reader.
      const client = context.supabase as unknown as ReminderReadClient;
      assertReady();
      const rpcQuery = client.rpc("crm_customer_reminders", { _customer_id: data.customerId });
      assertReady();
      const signalQuery = rpcQuery.abortSignal(signal);
      assertReady();
      const query = signalQuery.retry(false);
      assertReady();
      const response = await query;
      assertReady();
      if (response.error) throw new Error(failure);
      return parseCustomerRemindersSnapshot(response.data, data.customerId);
    } catch {
      // Do not expose diagnostics, use a broader fallback, retry automatically,
      // or treat malformed bindings, cancellation and actor loss as an empty list.
      throw new Error(failure);
    }
  });

// The unapplied invoker API joins parent/rows in one database statement. That is
// not retroactive/continuous revocation, fresh session/offboarding verification,
// or trusted native authority. No live API/RLS acceptance or deployment is inferred;
// AbortSignal concerns HTTP/client requests, not guaranteed PostgreSQL cancellation.
