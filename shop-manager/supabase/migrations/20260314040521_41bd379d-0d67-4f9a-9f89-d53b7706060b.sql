-- Add comprehensive cost, ROI, and tracking columns to export_products
ALTER TABLE public.export_products
  ADD COLUMN purchase_cost_per_unit numeric DEFAULT 0,
  ADD COLUMN shipping_cost_per_unit numeric DEFAULT 0,
  ADD COLUMN customs_duty_rate numeric DEFAULT 0,
  ADD COLUMN customs_duty_per_unit numeric DEFAULT 0,
  ADD COLUMN insurance_cost_per_unit numeric DEFAULT 0,
  ADD COLUMN handling_fee_per_unit numeric DEFAULT 0,
  ADD COLUMN packaging_cost_per_unit numeric DEFAULT 0,
  ADD COLUMN inspection_cost_per_unit numeric DEFAULT 0,
  ADD COLUMN landed_cost_per_unit numeric GENERATED ALWAYS AS (
    COALESCE(purchase_cost_per_unit, 0) +
    COALESCE(shipping_cost_per_unit, 0) +
    COALESCE(customs_duty_per_unit, 0) +
    COALESCE(insurance_cost_per_unit, 0) +
    COALESCE(handling_fee_per_unit, 0) +
    COALESCE(packaging_cost_per_unit, 0) +
    COALESCE(inspection_cost_per_unit, 0)
  ) STORED,
  ADD COLUMN profit_margin_pct numeric GENERATED ALWAYS AS (
    CASE WHEN COALESCE(unit_price, 0) > 0 THEN
      ROUND(((COALESCE(unit_price, 0) - (
        COALESCE(purchase_cost_per_unit, 0) +
        COALESCE(shipping_cost_per_unit, 0) +
        COALESCE(customs_duty_per_unit, 0) +
        COALESCE(insurance_cost_per_unit, 0) +
        COALESCE(handling_fee_per_unit, 0) +
        COALESCE(packaging_cost_per_unit, 0) +
        COALESCE(inspection_cost_per_unit, 0)
      )) / COALESCE(unit_price, 1)) * 100, 2)
    ELSE 0 END
  ) STORED,
  ADD COLUMN supplier_name text,
  ADD COLUMN supplier_contact text,
  ADD COLUMN supplier_country text,
  ADD COLUMN supplier_lead_time_days integer,
  ADD COLUMN minimum_order_qty numeric DEFAULT 1,
  ADD COLUMN shelf_life_days integer,
  ADD COLUMN storage_temperature text,
  ADD COLUMN storage_requirements text,
  ADD COLUMN moisture_content_pct numeric,
  ADD COLUMN grade text,
  ADD COLUMN grain_size text,
  ADD COLUMN certifications text[] DEFAULT '{}',
  ADD COLUMN export_license_required boolean DEFAULT false,
  ADD COLUMN phytosanitary_required boolean DEFAULT false,
  ADD COLUMN fumigation_required boolean DEFAULT false,
  ADD COLUMN regulatory_notes text,
  ADD COLUMN total_units_sold numeric DEFAULT 0,
  ADD COLUMN total_revenue numeric DEFAULT 0,
  ADD COLUMN total_cost numeric DEFAULT 0,
  ADD COLUMN last_sold_at timestamptz,
  ADD COLUMN avg_monthly_volume numeric DEFAULT 0,
  ADD COLUMN target_markets text[] DEFAULT '{}',
  ADD COLUMN preferred_incoterms text DEFAULT 'FOB',
  ADD COLUMN currency text DEFAULT 'USD',
  ADD COLUMN image_url text;