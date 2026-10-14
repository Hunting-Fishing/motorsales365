-- Explicit deny policies document intentional isolation of internal state.
-- These tables are not exposed to the Data API and have no client table grants.
-- Authorized SECURITY DEFINER implementations continue to enforce auth.uid().
CREATE POLICY link_requests_deny_direct ON vehicle_receipts_private.link_requests
FOR ALL TO anon,authenticated USING (false) WITH CHECK (false);
CREATE POLICY scan_budgets_deny_direct ON vehicle_receipts_private.scan_budgets
FOR ALL TO anon,authenticated USING (false) WITH CHECK (false);
