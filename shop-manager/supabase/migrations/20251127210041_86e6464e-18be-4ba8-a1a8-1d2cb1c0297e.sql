-- Fix Security Definer Views by adding security_invoker = true
-- This ensures views respect RLS policies of the calling user, not the view creator

-- 1. Fix customer_referrals_view
DROP VIEW IF EXISTS public.customer_referrals_view;
CREATE VIEW public.customer_referrals_view 
WITH (security_invoker = true)
AS
SELECT cr.id,
    cr.referrer_id,
    c1.first_name AS referrer_first_name,
    c1.last_name AS referrer_last_name,
    c1.email AS referrer_email,
    cr.referred_id,
    c2.first_name AS referred_first_name,
    c2.last_name AS referred_last_name,
    c2.email AS referred_email,
    cr.referral_date,
    cr.status,
    cr.converted_at,
    cr.notes,
    cr.created_at,
    cr.updated_at
FROM ((customer_referrals cr
    JOIN customers c1 ON ((cr.referrer_id = c1.id)))
    JOIN customers c2 ON ((cr.referred_id = c2.id)));

-- 2. Fix expiring_certificates
DROP VIEW IF EXISTS public.expiring_certificates;
CREATE VIEW public.expiring_certificates 
WITH (security_invoker = true)
AS
SELECT sc.id,
    sc.staff_id,
    p.first_name,
    p.last_name,
    p.email,
    sct.name AS certificate_name,
    sc.certificate_number,
    sc.expiry_date,
    sc.status,
    (sc.expiry_date - CURRENT_DATE) AS days_until_expiry
FROM ((staff_certificates sc
    JOIN profiles p ON ((p.id = sc.staff_id)))
    JOIN staff_certificate_types sct ON ((sct.id = sc.certificate_type_id)))
WHERE ((sc.expiry_date IS NOT NULL) AND ((sc.expiry_date >= CURRENT_DATE) AND (sc.expiry_date <= (CURRENT_DATE + '90 days'::interval))) AND (sc.status = 'active'::text))
ORDER BY sc.expiry_date;

-- 3. Fix inventory_stock_view
DROP VIEW IF EXISTS public.inventory_stock_view;
CREATE VIEW public.inventory_stock_view 
WITH (security_invoker = true)
AS
SELECT inventory_items.id,
    inventory_items.name,
    inventory_items.sku,
    inventory_items.category,
    inventory_items.supplier,
    inventory_items.quantity,
    inventory_items.reorder_point,
    inventory_items.unit_price,
    inventory_items.location,
    inventory_items.status,
    inventory_items.description,
    inventory_items.created_at,
    inventory_items.updated_at,
    inventory_items.shop_id,
    inventory_items.quantity AS quantity_in_stock
FROM inventory_items;

-- 4. Fix product_details
DROP VIEW IF EXISTS public.product_details;
CREATE VIEW public.product_details 
WITH (security_invoker = true)
AS
SELECT p.id,
    p.title,
    p.description,
    p.image_url,
    p.price,
    p.affiliate_link,
    p.tracking_params,
    p.category_id,
    p.product_type,
    p.is_featured,
    p.is_bestseller,
    p.is_approved,
    p.suggested_by,
    p.suggestion_reason,
    p.created_at,
    p.updated_at,
    p.stock_quantity,
    p.sku,
    p.weight,
    p.dimensions,
    p.is_available,
    p.average_rating,
    p.review_count,
    p.sale_price,
    p.sale_start_date,
    p.sale_end_date,
    p.inventory_item_id,
    p.low_stock_threshold,
    p.track_inventory,
    p.name
FROM products p
WHERE (p.is_approved = true);

-- 5. Fix schedule_coverage_summary
DROP VIEW IF EXISTS public.schedule_coverage_summary;
CREATE VIEW public.schedule_coverage_summary 
WITH (security_invoker = true)
AS
SELECT wsa.shop_id,
    wsa.day_of_week,
    date_trunc('hour'::text, (wsa.shift_start)::interval) AS hour_block,
    count(DISTINCT wsa.employee_id) AS employee_count,
    array_agg(DISTINCT wsa.employee_id) AS employee_ids,
    array_agg(DISTINCT ((p.first_name || ' '::text) || p.last_name)) AS employee_names
FROM (work_schedule_assignments wsa
    LEFT JOIN profiles p ON ((p.id = wsa.employee_id)))
WHERE ((wsa.effective_from <= CURRENT_DATE) AND ((wsa.effective_until IS NULL) OR (wsa.effective_until >= CURRENT_DATE)))
GROUP BY wsa.shop_id, wsa.day_of_week, (date_trunc('hour'::text, (wsa.shift_start)::interval));

-- 6. Fix timesheet_summary
DROP VIEW IF EXISTS public.timesheet_summary;
CREATE VIEW public.timesheet_summary 
WITH (security_invoker = true)
AS
SELECT te.employee_id,
    p.first_name,
    p.last_name,
    p.email,
    te.work_date,
    (date_trunc('week'::text, (te.work_date)::timestamp with time zone))::date AS week_start,
    count(*) AS entry_count,
    sum(te.total_hours) AS total_hours,
    sum(
        CASE
            WHEN te.is_overtime THEN te.total_hours
            ELSE (0)::numeric
        END) AS overtime_hours,
    sum(
        CASE
            WHEN te.is_billable THEN te.total_hours
            ELSE (0)::numeric
        END) AS billable_hours,
    count(
        CASE
            WHEN (te.status = 'approved'::text) THEN 1
            ELSE NULL::integer
        END) AS approved_count,
    count(
        CASE
            WHEN (te.status = 'submitted'::text) THEN 1
            ELSE NULL::integer
        END) AS pending_count,
    count(
        CASE
            WHEN (te.status = 'draft'::text) THEN 1
            ELSE NULL::integer
        END) AS draft_count
FROM (timesheet_entries te
    JOIN profiles p ON ((p.id = te.employee_id)))
GROUP BY te.employee_id, p.first_name, p.last_name, p.email, te.work_date;