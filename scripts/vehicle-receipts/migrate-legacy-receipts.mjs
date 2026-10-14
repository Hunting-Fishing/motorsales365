/** Run after applying the receipt migration. Defaults to a read-only inventory.
 * APPLY=1 copies each legacy service receipt, verifies the private copy, updates
 * its DB reference, then removes the public original. No credentials are logged.
 */
import { createClient } from "@supabase/supabase-js";
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)
  throw new Error(
    "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your private shell environment.",
  );
const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const apply = process.env.APPLY === "1";
let lastId = null,
  migrated = 0,
  skipped = 0;
for (;;) {
  let query = client
    .from("vehicle_service_records")
    .select("id,vehicle_id,receipt_url,receipt_path,vehicles!inner(owner_user_id)")
    .not("receipt_url", "is", null)
    .order("id")
    .limit(200);
  if (lastId) query = query.gt("id", lastId);
  const page = await query;
  if (page.error) throw page.error;
  if (!page.data.length) break;
  // Do not clear legacy references until the original is deleted; retries can
  // finish cleanup after a partial failure without losing the source path.
  for (const row of page.data) {
    let url;
    try {
      url = new URL(row.receipt_url);
    } catch {
      skipped++;
      continue;
    }
    const prefix = "/storage/v1/object/public/vehicle-media/";
    if (url.origin !== new URL(SUPABASE_URL).origin || !url.pathname.startsWith(prefix)) {
      skipped++;
      continue;
    }
    const source = decodeURIComponent(url.pathname.slice(prefix.length));
    const owner = row.vehicles.owner_user_id;
    if (!source.startsWith(`${owner}/receipts/${row.vehicle_id}/`)) {
      skipped++;
      continue;
    }
    if (!apply) {
      console.log(`Would migrate service receipt ${row.id}`);
      continue;
    }
    const path =
      row.receipt_path || `${owner}/${row.vehicle_id}/legacy-${row.id}.${source.split(".").pop()}`;
    let dest = await client.storage.from("vehicle-service-receipts").download(path);
    if (dest.error) {
      const copy = await client.storage
        .from("vehicle-media")
        .copy(source, path, { destinationBucket: "vehicle-service-receipts" });
      if (copy.error) throw new Error(`Private copy failed for service record ${row.id}`);
      dest = await client.storage.from("vehicle-service-receipts").download(path);
    }
    if (dest.error || !dest.data?.size)
      throw new Error(`Private receipt verification failed for ${row.id}`);
    const updated = await client
      .from("vehicle_service_records")
      .update({ receipt_path: path })
      .eq("id", row.id);
    if (updated.error) throw updated.error;
    const removed = await client.storage.from("vehicle-media").remove([source]);
    if (removed.error)
      throw new Error(`Public original cleanup failed for ${row.id}; retry to finish.`);
    const cleared = await client
      .from("vehicle_service_records")
      .update({ receipt_url: null })
      .eq("id", row.id);
    if (cleared.error) throw cleared.error;
    migrated++;
  }
  if (page.data.length < 200) break;
  lastId = page.data.at(-1).id;
}
console.log(
  JSON.stringify({ mode: apply ? "apply" : "dry-run", migrated, unsupported_receipts: skipped }),
);
if (skipped) process.exitCode = 2;
