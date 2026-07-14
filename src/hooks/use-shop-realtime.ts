import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to realtime changes on shop_manager tables and invalidates
 * the matching TanStack Query keys so UI reflects live updates.
 */
export function useShopRealtime(tables: string[] = ["work_orders", "invoices", "expenses", "inventory_items", "customer_communications", "technician_schedules", "customer_reminders", "customer_segments", "customer_segment_assignments", "service_reminders", "customer_loyalty", "discount_codes", "shift_templates", "shift_swap_requests", "stock_alerts"]) {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase.channel("shop-manager-live");
    for (const t of tables) {
      channel.on(
        "postgres_changes" as any,
        { event: "*", schema: "shop_manager", table: t },
        () => {
          qc.invalidateQueries({ queryKey: ["shop-manager", t] });
          qc.invalidateQueries({ queryKey: ["shop-manager", "dashboard"] });
        },
      );
    }
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc, tables.join(",")]);
}
