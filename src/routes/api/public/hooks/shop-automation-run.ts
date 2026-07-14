// Cron-driven Shop Manager automation engine.
//
// Iterates every `service_automation_rules` row with is_active=true across
// every shop, resolves each shop's vehicles via its customers, computes
// upcoming reminders from vehicle last-service dates, and inserts new
// `service_reminders` rows for anything falling within its configured lead
// window. Existing pending/scheduled reminders for the same
// (vehicle_id, type) pair are skipped so runs stay idempotent.
//
// Auth: verifyInternalCronToken via `x-cron-token`, job_name "shop_automation_run".
// Schedule via pg_cron POST every 15–60 minutes.
import { createFileRoute } from "@tanstack/react-router";
import { verifyInternalCronToken } from "@/integrations/supabase/internal-secrets.server";

export const Route = createFileRoute("/api/public/hooks/shop-automation-run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authed = await verifyInternalCronToken({
          jobName: "shop_automation_run",
          tokenHeader: request.headers.get("x-cron-token"),
        });
        if (!authed) return new Response("Unauthorized", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const sm = (supabaseAdmin as any).schema("shop_manager");

        const { data: rules, error: rulesErr } = await sm
          .from("service_automation_rules")
          .select("id, shop_id, rule_name, service_type, automation_config")
          .eq("is_active", true)
          .limit(2000);
        if (rulesErr) {
          console.error("[shop-automation] rules query failed:", rulesErr);
          return new Response(
            JSON.stringify({ ok: false, error: rulesErr.message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
        if (!rules?.length) return Response.json({ ok: true, rules: 0, created: 0 });

        // Group rules by shop.
        const byShop = new Map<string, any[]>();
        for (const r of rules) {
          const k = String(r.shop_id ?? "");
          if (!k) continue;
          (byShop.get(k) ?? byShop.set(k, []).get(k)!).push(r);
        }

        const today = new Date();
        let createdTotal = 0;
        let shopsProcessed = 0;
        const errors: string[] = [];
        const runLogs: any[] = [];

        for (const [shopId, shopRules] of byShop) {
          shopsProcessed++;
          const { data: custs } = await sm
            .from("customers")
            .select("id")
            .eq("shop_id", shopId)
            .limit(20000);
          const customerIds = (custs ?? []).map((c: any) => c.id);
          const customersScanned = customerIds.length;
          if (customerIds.length === 0) {
            for (const rule of shopRules) {
              runLogs.push({
                shop_id: shopId,
                rule_id: rule.id,
                customers_scanned: 0,
                vehicles_scanned: 0,
                reminders_created: 0,
                skipped_duplicate: 0,
              });
            }
            continue;
          }

          const { data: vehicles } = await sm
            .from("vehicles")
            .select("id, customer_id, make, model, year, last_service_date")
            .in("customer_id", customerIds)
            .not("last_service_date", "is", null)
            .limit(20000);
          const vehiclesScanned = vehicles?.length ?? 0;
          if (!vehicles?.length) {
            for (const rule of shopRules) {
              runLogs.push({
                shop_id: shopId,
                rule_id: rule.id,
                customers_scanned: customersScanned,
                vehicles_scanned: 0,
                reminders_created: 0,
                skipped_duplicate: 0,
              });
            }
            continue;
          }

          const vehicleIds = vehicles.map((v: any) => v.id);
          const { data: existing } = await sm
            .from("service_reminders")
            .select("vehicle_id, type, status")
            .in("vehicle_id", vehicleIds)
            .in("status", ["pending", "scheduled"]);

          const seen = new Set(
            (existing ?? []).map((r: any) => `${r.vehicle_id}::${r.type}`),
          );

          for (const rule of shopRules) {
            const cfg = rule.automation_config ?? {};
            const intervalDays = Number(cfg.interval_days) || 0;
            const leadMs = (Number(cfg.lead_days) || 0) * 86_400_000;
            const ruleToCreate: any[] = [];
            let ruleSkipped = 0;

            if (!intervalDays) {
              runLogs.push({
                shop_id: shopId,
                rule_id: rule.id,
                customers_scanned: customersScanned,
                vehicles_scanned: vehiclesScanned,
                reminders_created: 0,
                skipped_duplicate: 0,
                error: "missing interval_days in automation_config",
              });
              continue;
            }

            for (const v of vehicles) {
              const key = `${v.id}::${rule.service_type}`;
              if (seen.has(key)) {
                ruleSkipped++;
                continue;
              }
              const last = new Date(v.last_service_date);
              const due = new Date(last);
              due.setDate(due.getDate() + intervalDays);
              if (due.getTime() - today.getTime() > leadMs) continue;
              ruleToCreate.push({
                vehicle_id: v.id,
                customer_id: v.customer_id,
                type: rule.service_type,
                title: `${rule.rule_name} — ${v.year ?? ""} ${v.make ?? ""} ${v.model ?? ""}`
                  .replace(/\s+/g, " ")
                  .trim(),
                due_date: due.toISOString().slice(0, 10),
                status: "pending",
                priority: "medium",
                source: "automation",
                source_rule_id: rule.id,
              });
              seen.add(key);
            }

            let ruleErr: string | null = null;
            if (ruleToCreate.length > 0) {
              const { error } = await sm.from("service_reminders").insert(ruleToCreate);
              if (error) {
                ruleErr = error.message;
                errors.push(`shop ${shopId} rule ${rule.id}: ${error.message}`);
              } else {
                createdTotal += ruleToCreate.length;
              }
            }

            runLogs.push({
              shop_id: shopId,
              rule_id: rule.id,
              customers_scanned: customersScanned,
              vehicles_scanned: vehiclesScanned,
              reminders_created: ruleErr ? 0 : ruleToCreate.length,
              skipped_duplicate: ruleSkipped,
              error: ruleErr,
            });
          }
        }

        if (runLogs.length > 0) {
          const { error: logErr } = await sm.from("automation_run_logs").insert(runLogs);
          if (logErr) console.error("[shop-automation] log insert failed:", logErr);
        }

        return Response.json({
          ok: true,
          shops: shopsProcessed,
          rules: rules.length,
          created: createdTotal,
          errors: errors.length ? errors : undefined,
        });

      },
    },
  },
});
