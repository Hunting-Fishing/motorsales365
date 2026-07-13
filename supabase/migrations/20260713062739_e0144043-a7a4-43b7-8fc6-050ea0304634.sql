CREATE TABLE shop_manager.appointments (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  customer_id uuid,
  vehicle_id uuid,
  advisor_id uuid,
  date timestamp with time zone NOT NULL,
  duration integer NOT NULL,
  status text NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT appointments_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.ar_invoice_lines (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  invoice_id uuid NOT NULL,
  description text NOT NULL,
  quantity numeric(10,2) DEFAULT 1 NOT NULL,
  unit_price numeric(12,2) DEFAULT 0 NOT NULL,
  total_price numeric(12,2) DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT ar_invoice_lines_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.ar_invoices (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  customer_id uuid,
  invoice_number text NOT NULL,
  status text NOT NULL,
  issue_date date NOT NULL,
  due_date date,
  subtotal numeric(12,2) DEFAULT 0 NOT NULL,
  tax numeric(12,2) DEFAULT 0 NOT NULL,
  total numeric(12,2) DEFAULT 0 NOT NULL,
  balance_due numeric(12,2) DEFAULT 0 NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  tax_rate numeric(5,2) DEFAULT 0 NOT NULL,
  CONSTRAINT ar_invoices_status_check CHECK (status = ANY (ARRAY['draft'::text, 'sent'::text, 'partial'::text, 'paid'::text, 'overdue'::text, 'void'::text])),
  CONSTRAINT ar_invoices_pkey PRIMARY KEY (id),
  CONSTRAINT ar_invoices_shop_id_invoice_number_key UNIQUE (shop_id, invoice_number)
);

CREATE TABLE shop_manager.ar_payments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  invoice_id uuid,
  payment_date date NOT NULL,
  amount numeric(12,2) DEFAULT 0 NOT NULL,
  payment_method text,
  reference text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT ar_payments_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.company_settings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  settings_key text NOT NULL,
  settings_value jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT company_settings_pkey PRIMARY KEY (id),
  CONSTRAINT company_settings_shop_id_settings_key_key UNIQUE (shop_id, settings_key)
);

CREATE TABLE shop_manager.customer_activities (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid NOT NULL,
  action text NOT NULL,
  user_id text NOT NULL,
  user_name text NOT NULL,
  timestamp timestamp with time zone DEFAULT now() NOT NULL,
  flagged boolean DEFAULT false,
  flag_reason text,
  CONSTRAINT customer_activities_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_addresses (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  address_type text NOT NULL,
  is_default boolean DEFAULT false NOT NULL,
  full_name text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text NOT NULL,
  postal_code text NOT NULL,
  country text DEFAULT 'US'::text NOT NULL,
  phone text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_addresses_address_type_check CHECK (address_type = ANY (ARRAY['shipping'::text, 'billing'::text, 'both'::text])),
  CONSTRAINT customer_addresses_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_automation_preferences (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid NOT NULL,
  email_notifications boolean DEFAULT true,
  sms_notifications boolean DEFAULT false,
  service_reminders boolean DEFAULT true,
  marketing_emails boolean DEFAULT true,
  preferred_contact_time text DEFAULT 'business_hours'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT customer_automation_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT customer_automation_preferences_customer_id_key UNIQUE (customer_id)
);

CREATE TABLE shop_manager.customer_communications (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid NOT NULL,
  date timestamp with time zone DEFAULT now() NOT NULL,
  type text NOT NULL,
  direction text NOT NULL,
  subject text,
  content text NOT NULL,
  staff_member_id text NOT NULL,
  staff_member_name text NOT NULL,
  status text NOT NULL,
  template_id uuid,
  template_name text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_communications_direction_check CHECK (direction = ANY (ARRAY['incoming'::text, 'outgoing'::text])),
  CONSTRAINT customer_communications_status_check CHECK (status = ANY (ARRAY['completed'::text, 'pending'::text, 'failed'::text])),
  CONSTRAINT customer_communications_type_check CHECK (type = ANY (ARRAY['email'::text, 'phone'::text, 'text'::text, 'in-person'::text])),
  CONSTRAINT customer_communications_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_documents (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  original_name text NOT NULL,
  title text NOT NULL,
  description text,
  version integer DEFAULT 1 NOT NULL,
  version_notes text,
  tags text[] DEFAULT '{}'::text[],
  category uuid,
  is_shared boolean DEFAULT false NOT NULL,
  uploaded_by text NOT NULL,
  uploaded_by_name text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_documents_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_form_comments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  form_id uuid NOT NULL,
  user_id uuid NOT NULL,
  comment text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_form_comments_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_interactions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid NOT NULL,
  customer_name text NOT NULL,
  date timestamp with time zone DEFAULT now() NOT NULL,
  type text NOT NULL,
  description text NOT NULL,
  staff_member_id text NOT NULL,
  staff_member_name text NOT NULL,
  status text NOT NULL,
  notes text,
  related_work_order_id uuid,
  follow_up_date timestamp with time zone,
  follow_up_completed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_interactions_status_check CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])),
  CONSTRAINT customer_interactions_type_check CHECK (type = ANY (ARRAY['work_order'::text, 'communication'::text, 'parts'::text, 'service'::text, 'follow_up'::text])),
  CONSTRAINT customer_interactions_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_loyalty (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid,
  current_points integer DEFAULT 0,
  lifetime_points integer DEFAULT 0,
  lifetime_value numeric DEFAULT 0.0,
  tier character varying(50) DEFAULT 'Standard'::character varying,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_loyalty_pkey PRIMARY KEY (id),
  CONSTRAINT customer_loyalty_customer_id_key UNIQUE (customer_id)
);

CREATE TABLE shop_manager.customer_notes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid NOT NULL,
  content text NOT NULL,
  category text DEFAULT 'general'::text NOT NULL,
  created_by text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_notes_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_payment_methods (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  payment_type text NOT NULL,
  provider text NOT NULL,
  last_four text,
  expiry_month integer,
  expiry_year integer,
  is_default boolean DEFAULT false,
  stripe_payment_method_id text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_payment_methods_payment_type_check CHECK (payment_type = ANY (ARRAY['card'::text, 'paypal'::text, 'bank'::text])),
  CONSTRAINT customer_payment_methods_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_profiles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  first_name text,
  last_name text,
  phone text,
  date_of_birth date,
  preferences jsonb DEFAULT '{}'::jsonb,
  marketing_consent boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_profiles_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_property_areas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  area_type text NOT NULL,
  label text,
  square_footage integer NOT NULL,
  length_ft numeric(10,2),
  width_ft numeric(10,2),
  height_ft numeric(10,2),
  notes text,
  last_serviced_at timestamp with time zone,
  service_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_property_areas_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_provided_forms (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  description text,
  customer_id uuid NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  upload_date timestamp with time zone DEFAULT now() NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_notes text,
  tags text[] DEFAULT '{}'::text[],
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT customer_provided_forms_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_referrals (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  referral_date timestamp with time zone DEFAULT now() NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  converted_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_referrals_pkey PRIMARY KEY (id),
  CONSTRAINT customer_referrals_referrer_id_referred_id_key UNIQUE (referrer_id, referred_id)
);

CREATE TABLE shop_manager.customer_segment_assignments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid,
  segment_id uuid,
  is_automatic boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_segment_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT customer_segment_assignments_customer_id_segment_id_key UNIQUE (customer_id, segment_id)
);

CREATE TABLE shop_manager.customer_segments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  color text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_segments_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_shop_relationships (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid NOT NULL,
  shop_id uuid NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  joined_at timestamp with time zone DEFAULT now() NOT NULL,
  booking_enabled boolean DEFAULT true NOT NULL,
  CONSTRAINT customer_shop_relationships_pkey PRIMARY KEY (id),
  CONSTRAINT customer_shop_relationships_customer_id_shop_id_key UNIQUE (customer_id, shop_id)
);

CREATE TABLE shop_manager.customer_touchpoints (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid NOT NULL,
  touchpoint_type text NOT NULL,
  channel text NOT NULL,
  campaign_id uuid,
  action text NOT NULL,
  metadata jsonb,
  occurred_at timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_touchpoints_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customer_uploaded_forms (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid,
  customer_id uuid,
  title text NOT NULL,
  description text,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_notes text,
  tags text[] DEFAULT '{}'::text[],
  category_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT customer_uploaded_forms_status_check CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'digitized'::text])),
  CONSTRAINT customer_uploaded_forms_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.customers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  address text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  household_id uuid,
  segments jsonb,
  referral_person_id uuid,
  city text,
  state text,
  postal_code text,
  country text,
  company text,
  notes text,
  tags jsonb,
  preferred_technician_id text,
  communication_preference text,
  referral_source text,
  other_referral_details text,
  is_fleet boolean DEFAULT false,
  fleet_company text,
  auto_billing boolean DEFAULT false,
  credit_terms text,
  terms_agreed boolean DEFAULT false,
  business_type text,
  business_industry text,
  other_business_industry text,
  tax_id text,
  business_email text,
  business_phone text,
  fleet_manager text,
  fleet_contact text,
  preferred_payment_method text,
  preferred_service_type text,
  auth_user_id uuid,
  labor_tax_exempt boolean DEFAULT false,
  parts_tax_exempt boolean DEFAULT false,
  tax_exempt_certificate_number text,
  tax_exempt_notes text,
  user_id uuid,
  latitude double precision,
  longitude double precision,
  CONSTRAINT customers_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.discount_audit_log (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  discount_id uuid NOT NULL,
  discount_table text NOT NULL,
  action_type text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  performed_by text NOT NULL,
  performed_at timestamp with time zone DEFAULT now() NOT NULL,
  reason text,
  CONSTRAINT discount_audit_log_action_type_check CHECK (action_type = ANY (ARRAY['created'::text, 'modified'::text, 'deleted'::text, 'approved'::text, 'rejected'::text])),
  CONSTRAINT discount_audit_log_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.discount_code_usage (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  discount_code_id uuid,
  order_id uuid,
  user_id uuid,
  discount_amount numeric(10,2) NOT NULL,
  used_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT discount_code_usage_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.discount_codes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  code text NOT NULL,
  description text,
  discount_type text NOT NULL,
  discount_value numeric(10,2) NOT NULL,
  minimum_order_amount numeric(10,2) DEFAULT 0,
  maximum_discount_amount numeric(10,2),
  usage_limit integer,
  usage_count integer DEFAULT 0,
  valid_from timestamp with time zone DEFAULT now() NOT NULL,
  valid_until timestamp with time zone,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT discount_codes_discount_type_check CHECK (discount_type = ANY (ARRAY['percentage'::text, 'fixed_amount'::text, 'free_shipping'::text])),
  CONSTRAINT discount_codes_pkey PRIMARY KEY (id),
  CONSTRAINT discount_codes_code_key UNIQUE (code)
);

CREATE TABLE shop_manager.discount_types (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  discount_type text NOT NULL,
  default_value numeric DEFAULT 0 NOT NULL,
  applies_to text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  requires_approval boolean DEFAULT false NOT NULL,
  max_discount_amount numeric,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by text NOT NULL,
  CONSTRAINT discount_types_applies_to_check CHECK (applies_to = ANY (ARRAY['labor'::text, 'parts'::text, 'work_order'::text, 'any'::text])),
  CONSTRAINT discount_types_discount_type_check CHECK (discount_type = ANY (ARRAY['percentage'::text, 'fixed_amount'::text])),
  CONSTRAINT discount_types_pkey PRIMARY KEY (id),
  CONSTRAINT discount_types_name_key UNIQUE (name)
);

CREATE TABLE shop_manager.employee_accommodations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid,
  employee_id uuid,
  accommodation_type text NOT NULL,
  description text NOT NULL,
  start_date date,
  end_date date,
  is_permanent boolean DEFAULT false,
  approved_by uuid,
  approved_at timestamp with time zone,
  status text DEFAULT 'active'::text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT employee_accommodations_accommodation_type_check CHECK (accommodation_type = ANY (ARRAY['medical'::text, 'religious'::text, 'personal'::text, 'disability'::text, 'other'::text])),
  CONSTRAINT employee_accommodations_status_check CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'expired'::text])),
  CONSTRAINT employee_accommodations_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.employee_availability (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  day_of_week integer NOT NULL,
  available_start time without time zone NOT NULL,
  available_end time without time zone NOT NULL,
  is_available boolean DEFAULT true,
  recurring boolean DEFAULT true,
  effective_from date DEFAULT CURRENT_DATE NOT NULL,
  effective_until date,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT employee_availability_day_of_week_check CHECK (day_of_week >= 0 AND day_of_week <= 6),
  CONSTRAINT valid_time_range CHECK (available_end > available_start),
  CONSTRAINT employee_availability_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.employee_leave_balances (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  leave_type_id uuid NOT NULL,
  balance_hours numeric(10,2) DEFAULT 0,
  used_hours numeric(10,2) DEFAULT 0,
  pending_hours numeric(10,2) DEFAULT 0,
  accrued_ytd numeric(10,2) DEFAULT 0,
  carry_over_hours numeric(10,2) DEFAULT 0,
  year integer DEFAULT EXTRACT(year FROM CURRENT_DATE) NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT employee_leave_balances_pkey PRIMARY KEY (id),
  CONSTRAINT employee_leave_balances_employee_id_leave_type_id_year_key UNIQUE (employee_id, leave_type_id, year)
);

CREATE TABLE shop_manager.household_members (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  household_id uuid,
  customer_id uuid,
  relationship_type text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT household_members_pkey PRIMARY KEY (id),
  CONSTRAINT household_members_household_id_customer_id_key UNIQUE (household_id, customer_id)
);

CREATE TABLE shop_manager.households (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  address text,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT households_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  sku text NOT NULL,
  description text,
  part_number text,
  barcode text,
  category text,
  subcategory text,
  manufacturer text,
  vehicle_compatibility text,
  location text,
  status text DEFAULT 'active'::text,
  supplier text,
  quantity integer DEFAULT 0,
  measurement_unit text,
  on_hold integer DEFAULT 0,
  on_order integer DEFAULT 0,
  reorder_point integer DEFAULT 0,
  min_stock_level integer DEFAULT 0,
  max_stock_level integer DEFAULT 0,
  unit_price numeric DEFAULT 0,
  sell_price_per_unit numeric DEFAULT 0,
  cost_per_unit numeric DEFAULT 0,
  margin_markup numeric DEFAULT 0,
  tax_rate numeric DEFAULT 0,
  tax_exempt boolean DEFAULT false,
  environmental_fee numeric DEFAULT 0,
  core_charge numeric DEFAULT 0,
  hazmat_fee numeric DEFAULT 0,
  weight numeric DEFAULT 0,
  dimensions text,
  color text,
  material text,
  model_year text,
  oem_part_number text,
  universal_part boolean DEFAULT false,
  warranty_period text,
  date_bought text,
  date_last text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_sku_key UNIQUE (sku)
);

CREATE TABLE shop_manager.inventory_adjustments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  work_order_id uuid,
  inventory_item_id uuid,
  quantity integer NOT NULL,
  adjustment_type text NOT NULL,
  adjusted_by uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_adjustments_adjustment_type_check CHECK (adjustment_type = ANY (ARRAY['reserve'::text, 'consume'::text, 'return'::text])),
  CONSTRAINT inventory_adjustments_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_alerts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  product_id uuid,
  variant_id uuid,
  alert_type text NOT NULL,
  threshold_value integer NOT NULL,
  current_value integer NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  message text,
  acknowledged_by uuid,
  acknowledged_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  resolved_at timestamp with time zone,
  notification_sent boolean DEFAULT false,
  CONSTRAINT inventory_alerts_check CHECK (product_id IS NOT NULL AND variant_id IS NULL OR product_id IS NULL AND variant_id IS NOT NULL),
  CONSTRAINT inventory_alerts_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_auto_reorder (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  item_id uuid,
  enabled boolean DEFAULT false NOT NULL,
  threshold integer DEFAULT 5 NOT NULL,
  quantity integer DEFAULT 10 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT inventory_auto_reorder_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_categories (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  CONSTRAINT inventory_categories_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_categories_name_key UNIQUE (name)
);

CREATE TABLE shop_manager.inventory_consumption_history (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  inventory_item_id uuid NOT NULL,
  quantity_consumed numeric(10,2) NOT NULL,
  usage_metric text NOT NULL,
  usage_value numeric(10,2) NOT NULL,
  service_package_id uuid,
  work_order_id uuid,
  consumed_at timestamp with time zone DEFAULT now() NOT NULL,
  notes text,
  CONSTRAINT inventory_consumption_history_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_consumption_rates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  inventory_item_id uuid NOT NULL,
  usage_metric text NOT NULL,
  consumption_per_unit numeric(10,4) NOT NULL,
  average_consumption numeric(10,4),
  variance_percentage numeric(5,2),
  last_calculated_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT inventory_consumption_rates_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_forecasts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  inventory_item_id uuid NOT NULL,
  forecast_type text NOT NULL,
  predicted_runout_date date,
  predicted_runout_usage numeric(10,2),
  current_stock numeric(10,2) NOT NULL,
  average_consumption_rate numeric(10,4) NOT NULL,
  confidence_level numeric(5,2),
  recommended_reorder_date date,
  recommended_reorder_quantity numeric(10,2),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT inventory_forecasts_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  sku text NOT NULL,
  category text NOT NULL,
  supplier text NOT NULL,
  quantity integer DEFAULT 0 NOT NULL,
  reorder_point integer DEFAULT 10 NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  location text,
  status text DEFAULT 'In Stock'::text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  shop_id uuid,
  quantity_in_stock integer,
  part_number text,
  barcode text,
  subcategory text,
  manufacturer text,
  vehicle_compatibility text,
  on_hold integer DEFAULT 0,
  on_order integer DEFAULT 0,
  margin_markup numeric(10,2) DEFAULT 0,
  sell_price_per_unit numeric(10,2) DEFAULT 0,
  cost_per_unit numeric(10,2) DEFAULT 0,
  weight numeric(10,2) DEFAULT 0,
  dimensions text,
  warranty_period text,
  date_bought date,
  date_last date,
  notes text,
  web_links jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT inventory_items_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_locations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  type text,
  parent_id uuid,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT inventory_locations_type_check CHECK (type = ANY (ARRAY['warehouse'::text, 'section'::text, 'shelf'::text, 'bin'::text])),
  CONSTRAINT inventory_locations_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_orders (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  item_id uuid,
  order_date timestamp with time zone DEFAULT now() NOT NULL,
  expected_arrival date NOT NULL,
  quantity_ordered integer NOT NULL,
  quantity_received integer DEFAULT 0 NOT NULL,
  supplier text NOT NULL,
  status text DEFAULT 'ordered'::text NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT inventory_orders_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_purchase_order_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  purchase_order_id uuid NOT NULL,
  inventory_item_id uuid NOT NULL,
  quantity integer NOT NULL,
  quantity_received integer DEFAULT 0,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT inventory_purchase_order_items_quantity_check CHECK (quantity > 0),
  CONSTRAINT inventory_purchase_order_items_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_purchase_orders (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  vendor_id uuid,
  status text DEFAULT 'draft'::text NOT NULL,
  order_date timestamp with time zone DEFAULT now() NOT NULL,
  expected_delivery_date timestamp with time zone,
  received_date timestamp with time zone,
  total_amount numeric,
  created_by uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  received_by uuid,
  po_number text DEFAULT ('PO-'::text || nextval('shop_manager.feature_request_number_seq'::regclass)),
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT inventory_purchase_orders_status_check CHECK (status = ANY (ARRAY['draft'::text, 'submitted'::text, 'partially_received'::text, 'received'::text, 'cancelled'::text])),
  CONSTRAINT inventory_purchase_orders_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_seasonal_factors (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  inventory_item_id uuid,
  category text,
  month integer NOT NULL,
  adjustment_factor numeric(5,2) DEFAULT 1.0 NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT inventory_seasonal_factors_month_check CHECK (month >= 1 AND month <= 12),
  CONSTRAINT inventory_seasonal_factors_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_settings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  low_stock_threshold integer DEFAULT 5,
  auto_reorder_enabled boolean DEFAULT false,
  default_supplier_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_settings_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_settings_shop_id_key UNIQUE (shop_id)
);

CREATE TABLE shop_manager.inventory_suppliers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  contact_name text,
  email text,
  phone text,
  address text,
  website text,
  payment_terms text,
  lead_time_days integer,
  is_active boolean DEFAULT true NOT NULL,
  notes text,
  type text,
  region text,
  CONSTRAINT inventory_suppliers_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_suppliers_name_key UNIQUE (name)
);

CREATE TABLE shop_manager.inventory_transactions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  inventory_item_id uuid NOT NULL,
  transaction_type text NOT NULL,
  quantity integer NOT NULL,
  transaction_date timestamp with time zone DEFAULT now() NOT NULL,
  reference_type text,
  reference_id uuid,
  performed_by uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT inventory_transactions_transaction_type_check CHECK (transaction_type = ANY (ARRAY['purchase'::text, 'sale'::text, 'adjustment'::text, 'transfer'::text, 'return'::text, 'write-off'::text])),
  CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.inventory_vendors (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  address text,
  website text,
  payment_terms text,
  lead_time_days integer,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT inventory_vendors_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.invoice_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  invoice_id text NOT NULL,
  name text NOT NULL,
  description text,
  quantity numeric NOT NULL,
  price numeric NOT NULL,
  total numeric NOT NULL,
  hours boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invoice_items_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.invoice_staff (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  invoice_id text NOT NULL,
  staff_name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invoice_staff_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.invoice_template_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  template_id uuid,
  name text NOT NULL,
  description text,
  quantity numeric DEFAULT 1,
  price numeric NOT NULL,
  total numeric,
  hours boolean DEFAULT false,
  sku text,
  category text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invoice_template_items_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.invoice_templates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  default_tax_rate numeric DEFAULT 0.08,
  default_due_date_days integer DEFAULT 30,
  default_notes text,
  created_at timestamp with time zone DEFAULT now(),
  last_used timestamp with time zone,
  usage_count integer DEFAULT 0,
  CONSTRAINT invoice_templates_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.invoices (
  id text NOT NULL,
  customer text NOT NULL,
  customer_address text,
  customer_email text,
  description text,
  notes text,
  date text NOT NULL,
  due_date text NOT NULL,
  status text NOT NULL,
  work_order_id text,
  created_by text,
  subtotal numeric,
  tax numeric,
  total numeric,
  payment_method text,
  created_at timestamp with time zone DEFAULT now(),
  last_updated_by text,
  last_updated_at timestamp with time zone,
  customer_id uuid,
  CONSTRAINT invoices_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.job_line_discounts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  job_line_id uuid NOT NULL,
  discount_type_id uuid,
  discount_name text NOT NULL,
  discount_type text NOT NULL,
  discount_value numeric NOT NULL,
  discount_amount numeric NOT NULL,
  reason text,
  approved_by text,
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by text NOT NULL,
  CONSTRAINT job_line_discounts_discount_type_check CHECK (discount_type = ANY (ARRAY['percentage'::text, 'fixed_amount'::text])),
  CONSTRAINT job_line_discounts_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.labor_rates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  standard_rate numeric DEFAULT 125.00 NOT NULL,
  diagnostic_rate numeric DEFAULT 145.00 NOT NULL,
  emergency_rate numeric DEFAULT 175.00 NOT NULL,
  warranty_rate numeric DEFAULT 95.00 NOT NULL,
  internal_rate numeric DEFAULT 85.00 NOT NULL,
  diy_rate numeric DEFAULT 65.00 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT labor_rates_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.part_discounts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  part_id uuid NOT NULL,
  discount_type_id uuid,
  discount_name text NOT NULL,
  discount_type text NOT NULL,
  discount_value numeric NOT NULL,
  discount_amount numeric NOT NULL,
  reason text,
  approved_by text,
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by text NOT NULL,
  CONSTRAINT part_discounts_discount_type_check CHECK (discount_type = ANY (ARRAY['percentage'::text, 'fixed_amount'::text])),
  CONSTRAINT part_discounts_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.part_warranties (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  inventory_item_id uuid,
  work_order_id uuid,
  equipment_id uuid,
  vehicle_id uuid,
  part_name character varying(200) NOT NULL,
  part_number character varying(100),
  serial_number character varying(100),
  manufacturer character varying(200),
  installed_date date NOT NULL,
  warranty_months integer,
  warranty_miles integer,
  warranty_hours integer,
  expiry_date date NOT NULL,
  purchase_price numeric(10,2),
  warranty_value numeric(10,2),
  coverage_description text,
  document_url text,
  notes text,
  status character varying(20) DEFAULT 'active'::character varying,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid,
  CONSTRAINT part_warranties_status_check CHECK (status::text = ANY (ARRAY['active'::character varying::text, 'expired'::character varying::text, 'claimed'::character varying::text, 'voided'::character varying::text])),
  CONSTRAINT part_warranties_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.parts_categories (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT parts_categories_pkey PRIMARY KEY (id),
  CONSTRAINT parts_categories_name_key UNIQUE (name)
);

CREATE TABLE shop_manager.parts_inventory (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  part_number text NOT NULL,
  name text NOT NULL,
  description text,
  category text,
  quantity integer DEFAULT 0 NOT NULL,
  min_quantity integer DEFAULT 0,
  cost_price numeric,
  retail_price numeric,
  location text,
  security_invoker boolean DEFAULT true,
  security_barrier boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT parts_inventory_pkey PRIMARY KEY (id)
);