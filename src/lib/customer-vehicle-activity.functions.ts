import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { activityInput, parseActivityResult } from "./customer-vehicle-activity";

const names = {
  receipts: "crm_customer_vehicle_receipts",
  installations: "crm_customer_vehicle_installations",
  work_orders: "crm_customer_vehicle_work_orders",
} as const;
const failure = "Could not load vehicle activity. Refresh and try again.";

export const getCustomerVehicleActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const result = activityInput.safeParse(input);
    if (!result.success) throw new Error("Invalid vehicle activity request.");
    return result.data;
  })
  .handler(async ({ data, context }) => {
    // Global attachSupabaseAuth supplies the current browser token. If that token
    // changed after query-key capture, never put the new subject's result in an
    // old account's cache. The caller cannot choose the authenticated actor.
    if (context?.userId !== data.expectedAccountId) {
      throw new Error("Account changed. Refresh before loading vehicle activity.");
    }
    try {
      // Generated public types don't yet include these unapplied candidate RPCs.
      // Narrow local adapter only: keep the caller client, never an admin fallback.
      const client = context.supabase as unknown as {
        rpc: (
          name: (typeof names)[keyof typeof names],
          args: {
            _customer_id: string;
            _shop_vehicle_id: string;
          },
        ) => PromiseLike<{ data: unknown; error: unknown }>;
      };
      const { data: payload, error } = await client.rpc(names[data.kind], {
        _customer_id: data.customerId,
        _shop_vehicle_id: data.shopVehicleId,
      });
      if (error) throw new Error(failure);
      return parseActivityResult(data.kind, payload);
    } catch {
      // Backend messages and invalid payloads may contain private fields. No raw
      // error detail, retry, alternate reader or privileged client is exposed.
      throw new Error(failure);
    }
  });
