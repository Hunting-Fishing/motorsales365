
-- ============================================================================
-- SOURCE MIGRATION: 20260713063318_90b3f5d4-5173-4f8a-b355-7634671276fe.sql
-- ============================================================================
CREATE TABLE shop_manager.payment_methods (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid NOT NULL,
  method_type text NOT NULL,
  is_default boolean DEFAULT false,
  card_last_four text,
  card_brand text,
  expiry_month integer,
  expiry_year integer,
  billing_name text,
  billing_address text,
  billing_city text,
  billing_state text,
  billing_postal_code text,
  billing_country text,
  token_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payment_methods_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.payment_methods_options (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  value text NOT NULL,
  label text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payment_methods_options_pkey PRIMARY KEY (id),
  CONSTRAINT payment_methods_options_value_key UNIQUE (value)
);

CREATE TABLE shop_manager.payments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid NOT NULL,
  invoice_id text,
  amount numeric NOT NULL,
  payment_method_id uuid,
  payment_type text NOT NULL,
  status text NOT NULL,
  transaction_id text,
  transaction_date timestamp with time zone DEFAULT now(),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.profile_metadata (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  profile_id uuid NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profile_metadata_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.profiles (
  id uuid NOT NULL,
  first_name text,
  last_name text,
  email text NOT NULL,
  phone text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  shop_id uuid,
  job_title text,
  department text,
  department_id uuid,
  notification_preferences jsonb DEFAULT '{"sms": false, "push": true, "email": true}'::jsonb,
  full_name text GENERATED ALWAYS AS (
CASE
    WHEN ((first_name IS NOT NULL) AND (last_name IS NOT NULL)) THEN TRIM(BOTH FROM ((first_name || ' '::text) || last_name))
    WHEN (first_name IS NOT NULL) THEN first_name
    WHEN (last_name IS NOT NULL) THEN last_name
    ELSE NULL::text
END) STORED,
  has_auth_account boolean DEFAULT false,
  invitation_sent_at timestamp with time zone,
  invitation_accepted_at timestamp with time zone,
  middle_name text,
  user_id uuid,
  automotive_region text DEFAULT 'asia-ph'::text NOT NULL,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_email_key UNIQUE (email)
);

CREATE TABLE shop_manager.purchase_order_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  purchase_order_id uuid,
  product_id text NOT NULL,
  quantity integer NOT NULL,
  unit_cost numeric(10,2) NOT NULL,
  total_cost numeric(10,2) NOT NULL,
  received_quantity integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.purchase_orders (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  po_number text NOT NULL,
  supplier_id uuid,
  status text DEFAULT 'draft'::text,
  order_date timestamp with time zone DEFAULT now() NOT NULL,
  expected_delivery_date timestamp with time zone,
  total_amount numeric(10,2) DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT purchase_orders_status_check CHECK (status = ANY (ARRAY['draft'::text, 'sent'::text, 'confirmed'::text, 'received'::text, 'cancelled'::text])),
  CONSTRAINT purchase_orders_pkey PRIMARY KEY (id),
  CONSTRAINT purchase_orders_po_number_key UNIQUE (po_number)
);

CREATE TABLE shop_manager.quote_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  quote_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  category text,
  quantity numeric(10,2) DEFAULT 1 NOT NULL,
  unit_price numeric(10,2) DEFAULT 0 NOT NULL,
  total_price numeric(10,2) DEFAULT 0 NOT NULL,
  item_type text DEFAULT 'service'::text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT quote_items_item_type_check CHECK (item_type = ANY (ARRAY['service'::text, 'part'::text, 'labor'::text])),
  CONSTRAINT quote_items_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.quotes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  quote_number text,
  customer_id uuid,
  vehicle_id uuid,
  status text DEFAULT 'draft'::text NOT NULL,
  subtotal numeric(10,2) DEFAULT 0,
  tax_rate numeric(5,4) DEFAULT 0.08,
  tax_amount numeric(10,2) DEFAULT 0,
  total_amount numeric(10,2) DEFAULT 0,
  expiry_date date,
  notes text,
  terms_conditions text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  sent_at timestamp with time zone,
  approved_at timestamp with time zone,
  rejected_at timestamp with time zone,
  converted_at timestamp with time zone,
  converted_to_work_order_id uuid,
  CONSTRAINT quotes_status_check CHECK (status = ANY (ARRAY['draft'::text, 'sent'::text, 'approved'::text, 'rejected'::text, 'expired'::text, 'converted'::text])),
  CONSTRAINT quotes_pkey PRIMARY KEY (id),
  CONSTRAINT quotes_quote_number_key UNIQUE (quote_number)
);

CREATE TABLE shop_manager.schedule_forecasts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  forecast_date date NOT NULL,
  forecast_type text NOT NULL,
  predicted_value numeric(10,2) NOT NULL,
  confidence_level numeric(5,2),
  actual_value numeric(10,2),
  variance numeric(10,2),
  factors jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT schedule_forecasts_forecast_type_check CHECK (forecast_type = ANY (ARRAY['demand'::text, 'labor_cost'::text, 'coverage'::text])),
  CONSTRAINT schedule_forecasts_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.schedule_notifications (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  user_id uuid NOT NULL,
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  related_entity_type text,
  related_entity_id uuid,
  is_read boolean DEFAULT false,
  read_at timestamp with time zone,
  priority text DEFAULT 'normal'::text,
  action_url text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT schedule_notifications_notification_type_check CHECK (notification_type = ANY (ARRAY['schedule_created'::text, 'schedule_updated'::text, 'schedule_deleted'::text, 'shift_swap_requested'::text, 'shift_swap_approved'::text, 'shift_swap_rejected'::text, 'conflict_detected'::text, 'time_off_approved'::text, 'time_off_rejected'::text])),
  CONSTRAINT schedule_notifications_priority_check CHECK (priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text])),
  CONSTRAINT schedule_notifications_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.schedule_optimization_metrics (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  metric_date date NOT NULL,
  coverage_score numeric(5,2),
  efficiency_score numeric(5,2),
  cost_score numeric(5,2),
  employee_satisfaction_score numeric(5,2),
  understaffed_hours integer,
  overstaffed_hours integer,
  optimal_hours integer,
  total_gaps integer,
  total_overlaps integer,
  recommendations jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT schedule_optimization_metrics_pkey PRIMARY KEY (id),
  CONSTRAINT schedule_optimization_metrics_shop_id_metric_date_key UNIQUE (shop_id, metric_date)
);

CREATE TABLE shop_manager.scheduling_conflicts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  conflict_type text NOT NULL,
  severity text DEFAULT 'medium'::text NOT NULL,
  employee_id uuid,
  schedule_assignment_id uuid,
  conflicting_assignment_id uuid,
  time_off_request_id uuid,
  conflict_date date NOT NULL,
  conflict_start_time time without time zone,
  conflict_end_time time without time zone,
  description text NOT NULL,
  is_resolved boolean DEFAULT false,
  resolved_at timestamp with time zone,
  resolved_by uuid,
  resolution_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT scheduling_conflicts_conflict_type_check CHECK (conflict_type = ANY (ARRAY['double_booking'::text, 'overlapping_shift'::text, 'time_off_conflict'::text, 'accommodation_conflict'::text, 'overtime'::text, 'understaffed'::text])),
  CONSTRAINT scheduling_conflicts_severity_check CHECK (severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])),
  CONSTRAINT scheduling_conflicts_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.scheduling_statistics (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  stat_date date NOT NULL,
  total_scheduled_hours numeric(10,2) DEFAULT 0,
  total_employees_scheduled integer DEFAULT 0,
  total_shifts integer DEFAULT 0,
  coverage_percentage numeric(5,2) DEFAULT 0,
  active_conflicts integer DEFAULT 0,
  critical_conflicts integer DEFAULT 0,
  understaffed_shifts integer DEFAULT 0,
  overstaffed_shifts integer DEFAULT 0,
  overtime_hours numeric(10,2) DEFAULT 0,
  labor_cost_estimate numeric(12,2) DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT scheduling_statistics_pkey PRIMARY KEY (id),
  CONSTRAINT scheduling_statistics_shop_id_stat_date_key UNIQUE (shop_id, stat_date)
);

CREATE TABLE shop_manager.service_automation_rules (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  rule_name text NOT NULL,
  service_type text,
  vehicle_criteria jsonb DEFAULT '{}'::jsonb,
  automation_config jsonb NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT service_automation_rules_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.service_categories (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  position integer DEFAULT 1,
  sector_id uuid,
  CONSTRAINT service_categories_pkey PRIMARY KEY (id),
  CONSTRAINT service_categories_name_sector_unique UNIQUE (name, sector_id)
);

CREATE TABLE shop_manager.service_hierarchy (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  position integer,
  subcategories jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT service_hierarchy_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.service_jobs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  subcategory_id uuid,
  name text NOT NULL,
  description text,
  estimated_time integer,
  price numeric(10,2),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  position integer DEFAULT 0,
  CONSTRAINT service_jobs_pkey PRIMARY KEY (id),
  CONSTRAINT service_jobs_name_subcategory_unique UNIQUE (name, subcategory_id)
);

CREATE TABLE shop_manager.service_package_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  service_package_id uuid NOT NULL,
  inventory_item_id uuid,
  part_number text,
  part_name text NOT NULL,
  quantity numeric(10,2) NOT NULL,
  unit text DEFAULT 'each'::text,
  is_optional boolean DEFAULT false,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT service_package_items_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.service_packages (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  category text,
  interval_value numeric(10,2) NOT NULL,
  interval_metric text NOT NULL,
  estimated_duration_minutes integer,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT service_packages_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.service_reminder_tags (
  reminder_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT service_reminder_tags_pkey PRIMARY KEY (reminder_id, tag_id)
);

CREATE TABLE shop_manager.service_reminders (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid NOT NULL,
  vehicle_id uuid,
  type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  due_date date NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  notification_sent boolean DEFAULT false NOT NULL,
  notification_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by text NOT NULL,
  completed_at timestamp with time zone,
  completed_by text,
  notes text,
  priority text DEFAULT 'medium'::text,
  category_id uuid,
  assigned_to text,
  template_id uuid,
  is_recurring boolean DEFAULT false,
  recurrence_interval integer,
  recurrence_unit text,
  parent_reminder_id uuid,
  last_occurred_at timestamp with time zone,
  next_occurrence_date date,
  CONSTRAINT service_reminders_recurrence_unit_check CHECK (recurrence_unit = ANY (ARRAY['days'::text, 'weeks'::text, 'months'::text, 'years'::text])),
  CONSTRAINT service_reminders_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.service_sectors (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  position integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT service_sectors_pkey PRIMARY KEY (id),
  CONSTRAINT service_sectors_name_unique UNIQUE (name)
);

CREATE TABLE shop_manager.service_subcategories (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  category_id uuid,
  name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  position integer DEFAULT 0,
  CONSTRAINT service_subcategories_pkey PRIMARY KEY (id),
  CONSTRAINT service_subcategories_name_category_unique UNIQUE (name, category_id)
);

CREATE TABLE shop_manager.shift_chats (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  chat_room_id uuid,
  shift_date date NOT NULL,
  shift_name text NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  technician_ids text[] DEFAULT '{}'::text[],
  location text,
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shift_chats_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.shift_swap_requests (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  requesting_employee_id uuid NOT NULL,
  target_employee_id uuid,
  original_schedule_id uuid NOT NULL,
  proposed_schedule_id uuid,
  swap_date date NOT NULL,
  reason text,
  status text DEFAULT 'pending'::text NOT NULL,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT shift_swap_requests_status_check CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text])),
  CONSTRAINT shift_swap_requests_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.shift_templates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  template_name text NOT NULL,
  description text,
  shift_start time without time zone NOT NULL,
  shift_end time without time zone NOT NULL,
  days_of_week integer[] NOT NULL,
  break_duration_minutes integer DEFAULT 0,
  is_active boolean DEFAULT true,
  color text DEFAULT '#3b82f6'::text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT valid_days_of_week CHECK (days_of_week <@ ARRAY[0, 1, 2, 3, 4, 5, 6]),
  CONSTRAINT shift_templates_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.shop_enabled_modules (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  module_id uuid NOT NULL,
  enabled_at timestamp with time zone DEFAULT now(),
  enabled_by uuid,
  display_name text,
  display_logo_url text,
  display_phone text,
  display_email text,
  display_address text,
  display_description text,
  CONSTRAINT shop_enabled_modules_pkey PRIMARY KEY (id),
  CONSTRAINT shop_enabled_modules_shop_id_module_id_key UNIQUE (shop_id, module_id)
);

CREATE TABLE shop_manager.shop_fuel_price_settings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  reference_city text DEFAULT 'Victoria'::text NOT NULL,
  reference_province text DEFAULT 'BC'::text NOT NULL,
  custom_location_label text,
  show_on_portal boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT shop_fuel_price_settings_pkey PRIMARY KEY (id),
  CONSTRAINT shop_fuel_price_settings_shop_id_key UNIQUE (shop_id)
);

CREATE TABLE shop_manager.shop_hours (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  day_of_week integer NOT NULL,
  open_time time without time zone DEFAULT '09:00:00'::time without time zone NOT NULL,
  close_time time without time zone DEFAULT '17:00:00'::time without time zone NOT NULL,
  is_closed boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT shop_hours_day_of_week_check CHECK (day_of_week >= 0 AND day_of_week <= 6),
  CONSTRAINT shop_hours_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.shop_integrations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  auth_credentials jsonb DEFAULT '{}'::jsonb,
  configuration jsonb DEFAULT '{}'::jsonb,
  sync_settings jsonb DEFAULT '{}'::jsonb,
  last_sync_at timestamp with time zone,
  sync_status text DEFAULT 'pending'::text,
  error_details text,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shop_integrations_pkey PRIMARY KEY (id),
  CONSTRAINT shop_integrations_shop_id_provider_id_key UNIQUE (shop_id, provider_id)
);

CREATE TABLE shop_manager.shop_role_permissions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  role_name text NOT NULL,
  module text NOT NULL,
  actions jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  CONSTRAINT shop_role_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT shop_role_permissions_shop_id_role_name_module_key UNIQUE (shop_id, role_name, module)
);

CREATE TABLE shop_manager.shop_settings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  address text,
  phone text,
  email text,
  hours jsonb,
  logo_url text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  shop_id uuid,
  booking_enabled boolean DEFAULT true NOT NULL,
  CONSTRAINT shop_settings_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.shop_special_days (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  date date NOT NULL,
  name text NOT NULL,
  description text,
  is_closed boolean DEFAULT true NOT NULL,
  open_time time without time zone,
  close_time time without time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT shop_special_days_pkey PRIMARY KEY (id),
  CONSTRAINT shop_special_days_shop_id_date_unique UNIQUE (shop_id, date)
);

CREATE TABLE shop_manager.shopping_carts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT shopping_carts_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.shops (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  organization_id uuid NOT NULL,
  address text,
  phone text,
  email text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  logo_url text,
  business_type text,
  industry text,
  other_industry text,
  tax_id text,
  city text,
  state text,
  postal_code text,
  latitude numeric(10,8),
  longitude numeric(11,8),
  is_active boolean DEFAULT true,
  shop_description text,
  shop_image_url text,
  onboarding_completed boolean DEFAULT false,
  onboarding_data jsonb DEFAULT '{}'::jsonb,
  setup_step integer DEFAULT 0,
  trial_started_at timestamp with time zone DEFAULT now(),
  trial_days integer DEFAULT 14,
  slug text,
  invite_code text,
  CONSTRAINT shops_name_not_empty CHECK (name IS NOT NULL AND TRIM(BOTH FROM name) <> ''::text),
  CONSTRAINT shops_pkey PRIMARY KEY (id),
  CONSTRAINT shops_invite_code_key UNIQUE (invite_code),
  CONSTRAINT shops_slug_key UNIQUE (slug)
);

CREATE TABLE shop_manager.staff_certificate_types (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  requires_renewal boolean DEFAULT true,
  default_validity_months integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_certificate_types_pkey PRIMARY KEY (id),
  CONSTRAINT staff_certificate_types_name_key UNIQUE (name)
);

CREATE TABLE shop_manager.staff_certificates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  staff_id uuid NOT NULL,
  certificate_type_id uuid NOT NULL,
  certificate_number text,
  issue_date date NOT NULL,
  expiry_date date,
  training_date date,
  issuing_authority text,
  status text DEFAULT 'active'::text,
  notes text,
  document_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  CONSTRAINT staff_certificates_status_check CHECK (status = ANY (ARRAY['active'::text, 'expired'::text, 'suspended'::text, 'revoked'::text])),
  CONSTRAINT staff_certificates_pkey PRIMARY KEY (id),
  CONSTRAINT staff_certificates_staff_id_certificate_type_id_issue_date_key UNIQUE (staff_id, certificate_type_id, issue_date)
);

CREATE TABLE shop_manager.staff_service_assignments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid,
  employee_id uuid,
  service_id uuid,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT staff_service_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT staff_service_assignments_employee_id_service_id_key UNIQUE (employee_id, service_id)
);

CREATE TABLE shop_manager.stock_alerts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  product_id text NOT NULL,
  alert_type text NOT NULL,
  threshold_quantity integer NOT NULL,
  current_quantity integer NOT NULL,
  is_resolved boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  resolved_at timestamp with time zone,
  CONSTRAINT stock_alerts_alert_type_check CHECK (alert_type = ANY (ARRAY['low_stock'::text, 'out_of_stock'::text, 'reorder_point'::text])),
  CONSTRAINT stock_alerts_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.stock_transfers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  inventory_item_id uuid NOT NULL,
  from_location text NOT NULL,
  to_location text NOT NULL,
  quantity integer NOT NULL,
  notes text,
  transferred_by text,
  transferred_at timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT stock_transfers_quantity_check CHECK (quantity > 0),
  CONSTRAINT stock_transfers_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.suppliers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  address text,
  payment_terms text,
  lead_time_days integer DEFAULT 7,
  minimum_order_amount numeric(10,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  rating numeric(2,1) DEFAULT 5.0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT suppliers_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.technician_breaks (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  schedule_id uuid NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT technician_breaks_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.technician_schedules (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  technician_id uuid NOT NULL,
  day_of_week integer NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  is_recurring boolean DEFAULT true NOT NULL,
  specific_date date,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT technician_schedules_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.technician_status_changes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  technician_id text NOT NULL,
  previous_status text NOT NULL,
  new_status text NOT NULL,
  change_date timestamp with time zone DEFAULT now() NOT NULL,
  change_reason text,
  changed_by text NOT NULL,
  CONSTRAINT technician_status_changes_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.user_roles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  role_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_role_id_key UNIQUE (user_id, role_id)
);

CREATE TABLE shop_manager.vehicle_inspections (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  vehicle_id uuid,
  technician_id uuid,
  inspection_date timestamp with time zone DEFAULT now() NOT NULL,
  vehicle_body_style text NOT NULL,
  status text DEFAULT 'draft'::text NOT NULL,
  damage_areas jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT vehicle_inspections_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.vehicle_makes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  make_id text NOT NULL,
  make_display text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT vehicle_makes_pkey PRIMARY KEY (id),
  CONSTRAINT vehicle_makes_make_id_key UNIQUE (make_id)
);

CREATE TABLE shop_manager.vehicle_models (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  make_id text NOT NULL,
  model_id text NOT NULL,
  model_display text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT vehicle_models_pkey PRIMARY KEY (id),
  CONSTRAINT vehicle_models_make_id_model_id_key UNIQUE (make_id, model_id)
);

CREATE TABLE shop_manager.vehicles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid,
  make text NOT NULL,
  model text NOT NULL,
  year integer,
  vin text,
  license_plate text,
  color text,
  last_service_date timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  transmission text,
  drive_type text,
  fuel_type text,
  engine text,
  body_style text,
  country text,
  transmission_type text,
  gvwr text,
  trim text,
  owner_type text DEFAULT 'customer'::text NOT NULL,
  asset_category text,
  asset_status text DEFAULT 'available'::text,
  checked_out_to uuid,
  checked_out_at timestamp with time zone,
  expected_return_date date,
  current_location text,
  qr_code text,
  qr_code_generated_at timestamp with time zone,
  CONSTRAINT vehicles_asset_category_check CHECK (owner_type = 'customer'::text AND asset_category IS NULL OR owner_type = 'company'::text AND (asset_category = ANY (ARRAY['courtesy'::text, 'rental'::text, 'fleet'::text, 'service'::text, 'equipment'::text, 'other'::text]))),
  CONSTRAINT vehicles_asset_status_check CHECK (asset_status = ANY (ARRAY['available'::text, 'in_use'::text, 'maintenance'::text, 'out_of_service'::text, 'retired'::text])),
  CONSTRAINT vehicles_owner_type_check CHECK (owner_type = ANY (ARRAY['customer'::text, 'company'::text])),
  CONSTRAINT vehicles_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.vendor_bill_lines (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  bill_id uuid NOT NULL,
  description text NOT NULL,
  quantity numeric(10,2) DEFAULT 1 NOT NULL,
  unit_cost numeric(12,2) DEFAULT 0 NOT NULL,
  total_cost numeric(12,2) DEFAULT 0 NOT NULL,
  account_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT vendor_bill_lines_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.vendor_bills (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  supplier_id uuid,
  bill_number text NOT NULL,
  status text NOT NULL,
  bill_date date NOT NULL,
  due_date date,
  total_amount numeric(12,2) DEFAULT 0 NOT NULL,
  balance_due numeric(12,2) DEFAULT 0 NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  subtotal numeric(12,2) DEFAULT 0 NOT NULL,
  tax_rate numeric(5,2) DEFAULT 0 NOT NULL,
  tax_amount numeric(12,2) DEFAULT 0 NOT NULL,
  CONSTRAINT vendor_bills_status_check CHECK (status = ANY (ARRAY['draft'::text, 'approved'::text, 'paid'::text, 'overdue'::text, 'void'::text])),
  CONSTRAINT vendor_bills_pkey PRIMARY KEY (id),
  CONSTRAINT vendor_bills_shop_id_bill_number_key UNIQUE (shop_id, bill_number)
);

CREATE TABLE shop_manager.vendor_payment_batch_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  batch_id uuid NOT NULL,
  bill_id uuid,
  amount numeric(12,2) DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT vendor_payment_batch_items_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.vendor_payment_batches (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  batch_number text NOT NULL,
  payment_date date NOT NULL,
  payment_method text,
  reference text,
  total_amount numeric(12,2) DEFAULT 0 NOT NULL,
  status text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT vendor_payment_batches_status_check CHECK (status = ANY (ARRAY['draft'::text, 'processed'::text, 'void'::text])),
  CONSTRAINT vendor_payment_batches_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.vendor_payments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  shop_id uuid NOT NULL,
  supplier_id uuid,
  bill_id uuid,
  payment_date date NOT NULL,
  amount numeric(12,2) DEFAULT 0 NOT NULL,
  payment_method text,
  reference text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT vendor_payments_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_order_activities (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  work_order_id uuid NOT NULL,
  action text NOT NULL,
  user_id text NOT NULL,
  user_name text NOT NULL,
  timestamp timestamp with time zone DEFAULT now(),
  flagged boolean DEFAULT false,
  flag_reason text,
  CONSTRAINT work_order_activities_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_order_assignments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  work_order_id uuid NOT NULL,
  technician_id uuid,
  assigned_by uuid,
  assigned_by_name text NOT NULL,
  assigned_at timestamp with time zone DEFAULT now(),
  unassigned_at timestamp with time zone,
  assignment_notes text,
  is_active boolean DEFAULT true,
  CONSTRAINT work_order_assignments_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_order_checklists (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  work_order_id uuid NOT NULL,
  checklist_name text NOT NULL,
  checklist_type text DEFAULT 'general'::text NOT NULL,
  description text,
  status text DEFAULT 'pending'::text NOT NULL,
  completion_percentage integer DEFAULT 0,
  assigned_to uuid,
  completed_by uuid,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  CONSTRAINT work_order_checklists_checklist_type_check CHECK (checklist_type = ANY (ARRAY['general'::text, 'safety'::text, 'quality'::text, 'inspection'::text, 'delivery'::text])),
  CONSTRAINT work_order_checklists_completion_percentage_check CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  CONSTRAINT work_order_checklists_status_check CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'skipped'::text])),
  CONSTRAINT work_order_checklists_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_order_discounts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  work_order_id uuid NOT NULL,
  discount_type_id uuid,
  discount_name text NOT NULL,
  discount_type text NOT NULL,
  discount_value numeric NOT NULL,
  discount_amount numeric NOT NULL,
  applies_to text NOT NULL,
  reason text,
  approved_by text,
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by text NOT NULL,
  CONSTRAINT work_order_discounts_applies_to_check CHECK (applies_to = ANY (ARRAY['labor'::text, 'parts'::text, 'total'::text])),
  CONSTRAINT work_order_discounts_discount_type_check CHECK (discount_type = ANY (ARRAY['percentage'::text, 'fixed_amount'::text])),
  CONSTRAINT work_order_discounts_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_order_document_categories (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT work_order_document_categories_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_order_document_versions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  document_id uuid,
  file_url text NOT NULL,
  version_number integer NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  notes text,
  CONSTRAINT work_order_document_versions_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_order_documents (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  work_order_id uuid,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  category text,
  description text,
  uploaded_by uuid,
  uploaded_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  category_id uuid,
  version_count integer DEFAULT 1,
  created_by uuid,
  CONSTRAINT work_order_documents_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_order_inventory_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  work_order_id uuid NOT NULL,
  name text NOT NULL,
  sku text NOT NULL,
  category text NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT work_order_inventory_items_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_order_job_line_history (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  job_line_id uuid NOT NULL,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  changed_by uuid,
  changed_by_name text NOT NULL,
  change_reason text,
  changed_at timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT work_order_job_line_history_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_order_job_lines (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  work_order_id uuid NOT NULL,
  name text NOT NULL,
  category text,
  subcategory text,
  description text,
  estimated_hours numeric DEFAULT 0,
  labor_rate_type text DEFAULT 'standard'::text,
  labor_rate numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  status shop_manager.job_line_status DEFAULT 'pending'::shop_manager.job_line_status,
  notes text,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT work_order_job_lines_pkey PRIMARY KEY (id)
);


-- ============================================================================
-- SOURCE MIGRATION: 20260713063430_0a07d0d9-729b-4662-ac1e-d561b0a2ce85.sql
-- ============================================================================
CREATE TABLE shop_manager.work_order_notifications (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  work_order_id uuid NOT NULL,
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  recipient_type text NOT NULL,
  recipient_id text NOT NULL,
  status text DEFAULT 'pending'::text,
  sent_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT work_order_notifications_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_order_part_history (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  part_id uuid NOT NULL,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  changed_by uuid,
  changed_by_name text NOT NULL,
  change_reason text,
  changed_at timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT work_order_part_history_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_order_parts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  work_order_id uuid NOT NULL,
  job_line_id uuid,
  inventory_item_id uuid,
  part_name text NOT NULL,
  part_number text,
  supplier_name text,
  supplier_cost numeric(10,2) DEFAULT 0,
  markup_percentage numeric(5,2) DEFAULT 0,
  retail_price numeric(10,2) DEFAULT 0,
  customer_price numeric(10,2) NOT NULL,
  quantity integer DEFAULT 1 NOT NULL,
  part_type text NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  category text,
  is_taxable boolean DEFAULT true,
  core_charge_amount numeric(10,2) DEFAULT 0,
  core_charge_applied boolean DEFAULT false,
  warranty_duration text,
  warranty_expiry_date date,
  install_date date,
  installed_by text,
  status text DEFAULT 'ordered'::text,
  is_stock_item boolean DEFAULT true,
  date_added timestamp with time zone DEFAULT now(),
  attachments jsonb DEFAULT '[]'::jsonb,
  notes_internal text,
  invoice_number text,
  po_line text,
  supplier_suggested_retail_price numeric,
  eco_fee numeric DEFAULT 0,
  eco_fee_applied boolean DEFAULT false,
  CONSTRAINT work_order_parts_part_type_check CHECK (part_type = ANY (ARRAY['inventory'::text, 'non-inventory'::text])),
  CONSTRAINT work_order_parts_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_order_priorities (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  level integer NOT NULL,
  color text DEFAULT '#6B7280'::text,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT work_order_priorities_pkey PRIMARY KEY (id),
  CONSTRAINT work_order_priorities_level_key UNIQUE (level),
  CONSTRAINT work_order_priorities_name_key UNIQUE (name)
);

CREATE TABLE shop_manager.work_order_signatures (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  work_order_id uuid,
  signature_url text NOT NULL,
  signature_type text NOT NULL,
  signed_by text NOT NULL,
  signed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT work_order_signatures_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_order_status_history (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  work_order_id uuid NOT NULL,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid,
  changed_by_name text NOT NULL,
  change_reason text,
  changed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT work_order_status_history_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_order_template_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  template_id uuid,
  name text NOT NULL,
  sku text,
  category text,
  quantity integer DEFAULT 1,
  unit_price numeric,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT work_order_template_items_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_order_templates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  status text DEFAULT 'active'::text,
  priority text,
  technician text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  last_used timestamp with time zone,
  usage_count integer DEFAULT 0,
  CONSTRAINT work_order_templates_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_order_time_entries (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  work_order_id uuid NOT NULL,
  employee_id text NOT NULL,
  employee_name text NOT NULL,
  start_time text NOT NULL,
  end_time text,
  duration integer NOT NULL,
  notes text,
  billable boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT work_order_time_entries_pkey PRIMARY KEY (id)
);

CREATE TABLE shop_manager.work_orders (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  customer_id uuid,
  vehicle_id uuid,
  advisor_id uuid,
  technician_id uuid,
  status text NOT NULL,
  description text,
  estimated_hours numeric,
  total_cost numeric,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  service_type text,
  service_category_id uuid,
  invoice_id text,
  invoiced_at timestamp with time zone,
  work_order_number text,
  customer_complaint text,
  complaint_source text DEFAULT 'Customer'::text,
  additional_info text,
  requested_services jsonb DEFAULT '[]'::jsonb,
  customer_instructions text,
  authorization_limit numeric DEFAULT 0,
  preferred_contact_method text DEFAULT 'Phone'::text,
  urgency_level text DEFAULT 'Normal'::text,
  drop_off_type text DEFAULT 'Walk-in'::text,
  diagnostic_notes text,
  write_up_by uuid,
  write_up_time timestamp with time zone DEFAULT now(),
  initial_mileage integer,
  vehicle_condition_notes text,
  attachments jsonb DEFAULT '[]'::jsonb,
  service_tags text[] DEFAULT '{}'::text[],
  customer_waiting boolean DEFAULT false,
  is_warranty boolean DEFAULT false,
  is_repeat_issue boolean DEFAULT false,
  linked_prior_work_order_id uuid,
  vehicle_damages jsonb DEFAULT '[]'::jsonb,
  equipment_id uuid,
  priority text DEFAULT 'medium'::text,
  shop_id uuid NOT NULL,
  CONSTRAINT check_drop_off_type CHECK (drop_off_type = ANY (ARRAY['Walk-in'::text, 'Appointment'::text, 'Tow-in'::text, 'Night Drop'::text])),
  CONSTRAINT check_preferred_contact_method CHECK (preferred_contact_method = ANY (ARRAY['Phone'::text, 'Email'::text, 'Text'::text, 'In-Person'::text])),
  CONSTRAINT check_urgency_level CHECK (urgency_level = ANY (ARRAY['Low'::text, 'Normal'::text, 'Urgent'::text, 'Emergency'::text])),
  CONSTRAINT work_orders_must_have_reference CHECK (customer_id IS NOT NULL OR vehicle_id IS NOT NULL),
  CONSTRAINT work_orders_pkey PRIMARY KEY (id)
);


-- ============================================================================
-- SOURCE MIGRATION: 20260713070220_28789e9e-20ef-4e63-a727-e686ff8c5c7c.sql
-- ============================================================================
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.appointments ADD CONSTRAINT appointments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.appointments ADD CONSTRAINT appointments_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES shop_manager.vehicles(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.appointments ADD CONSTRAINT fk_appointments_advisor FOREIGN KEY (advisor_id) REFERENCES shop_manager.profiles(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.appointments ADD CONSTRAINT fk_appointments_customer FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.appointments ADD CONSTRAINT fk_appointments_vehicle FOREIGN KEY (vehicle_id) REFERENCES shop_manager.vehicles(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.ar_invoice_lines ADD CONSTRAINT ar_invoice_lines_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES shop_manager.ar_invoices(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.ar_invoices ADD CONSTRAINT ar_invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES shop_manager.profiles(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.ar_invoices ADD CONSTRAINT ar_invoices_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.ar_invoices ADD CONSTRAINT ar_invoices_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.ar_payments ADD CONSTRAINT ar_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES shop_manager.profiles(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.ar_payments ADD CONSTRAINT ar_payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES shop_manager.ar_invoices(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.ar_payments ADD CONSTRAINT ar_payments_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.company_settings ADD CONSTRAINT company_settings_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_communications ADD CONSTRAINT customer_communications_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_documents ADD CONSTRAINT customer_documents_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_form_comments ADD CONSTRAINT customer_form_comments_form_id_fkey FOREIGN KEY (form_id) REFERENCES shop_manager.customer_provided_forms(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_interactions ADD CONSTRAINT customer_interactions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_interactions ADD CONSTRAINT customer_interactions_related_work_order_id_fkey FOREIGN KEY (related_work_order_id) REFERENCES shop_manager.work_orders(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_loyalty ADD CONSTRAINT customer_loyalty_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_notes ADD CONSTRAINT customer_notes_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_property_areas ADD CONSTRAINT customer_property_areas_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_property_areas ADD CONSTRAINT customer_property_areas_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_provided_forms ADD CONSTRAINT customer_provided_forms_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_referrals ADD CONSTRAINT customer_referrals_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES shop_manager.customers(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_referrals ADD CONSTRAINT customer_referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES shop_manager.customers(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_segment_assignments ADD CONSTRAINT customer_segment_assignments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_segment_assignments ADD CONSTRAINT customer_segment_assignments_segment_id_fkey FOREIGN KEY (segment_id) REFERENCES shop_manager.customer_segments(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_shop_relationships ADD CONSTRAINT customer_shop_relationships_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_shop_relationships ADD CONSTRAINT customer_shop_relationships_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_touchpoints ADD CONSTRAINT customer_touchpoints_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_uploaded_forms ADD CONSTRAINT customer_uploaded_forms_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_uploaded_forms ADD CONSTRAINT customer_uploaded_forms_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES shop_manager.profiles(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_uploaded_forms ADD CONSTRAINT customer_uploaded_forms_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customers ADD CONSTRAINT customers_household_id_fkey FOREIGN KEY (household_id) REFERENCES shop_manager.households(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customers ADD CONSTRAINT customers_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.discount_code_usage ADD CONSTRAINT discount_code_usage_discount_code_id_fkey FOREIGN KEY (discount_code_id) REFERENCES shop_manager.discount_codes(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.employee_accommodations ADD CONSTRAINT employee_accommodations_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES shop_manager.profiles(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.employee_accommodations ADD CONSTRAINT employee_accommodations_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES shop_manager.profiles(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.employee_accommodations ADD CONSTRAINT employee_accommodations_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.employee_availability ADD CONSTRAINT employee_availability_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.household_members ADD CONSTRAINT household_members_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.household_members ADD CONSTRAINT household_members_household_id_fkey FOREIGN KEY (household_id) REFERENCES shop_manager.households(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.inventory_adjustments ADD CONSTRAINT inventory_adjustments_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES shop_manager.inventory_items(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.inventory_adjustments ADD CONSTRAINT inventory_adjustments_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES shop_manager.work_orders(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.inventory_auto_reorder ADD CONSTRAINT inventory_auto_reorder_item_id_fkey FOREIGN KEY (item_id) REFERENCES shop_manager.inventory_items(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.inventory_consumption_history ADD CONSTRAINT inventory_consumption_history_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES shop_manager.inventory_items(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.inventory_consumption_history ADD CONSTRAINT inventory_consumption_history_service_package_id_fkey FOREIGN KEY (service_package_id) REFERENCES shop_manager.service_packages(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.inventory_consumption_history ADD CONSTRAINT inventory_consumption_history_service_package_id_fkey2 FOREIGN KEY (service_package_id) REFERENCES shop_manager.service_packages(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.inventory_consumption_history ADD CONSTRAINT inventory_consumption_history_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES shop_manager.work_orders(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.inventory_consumption_history ADD CONSTRAINT inventory_consumption_history_service_package_id_fkey3 FOREIGN KEY (service_package_id) REFERENCES shop_manager.service_packages(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.inventory_consumption_history ADD CONSTRAINT inventory_consumption_history_service_package_id_fkey4 FOREIGN KEY (service_package_id) REFERENCES shop_manager.service_packages(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.inventory_consumption_history ADD CONSTRAINT inventory_consumption_history_service_package_id_fkey5 FOREIGN KEY (service_package_id) REFERENCES shop_manager.service_packages(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;


-- ============================================================================
-- SOURCE MIGRATION: 20260713070436_a4f482f9-5657-4142-88e7-047bd0e90a42.sql
-- ============================================================================
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.shift_swap_requests ADD CONSTRAINT shift_swap_requests_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.shift_templates ADD CONSTRAINT shift_templates_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.shop_enabled_modules ADD CONSTRAINT shop_enabled_modules_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.shop_fuel_price_settings ADD CONSTRAINT shop_fuel_price_settings_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.shop_hours ADD CONSTRAINT shop_hours_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.shop_role_permissions ADD CONSTRAINT shop_role_permissions_created_by_fkey FOREIGN KEY (created_by) REFERENCES shop_manager.profiles(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.shop_role_permissions ADD CONSTRAINT shop_role_permissions_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.shop_settings ADD CONSTRAINT shop_settings_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.shop_special_days ADD CONSTRAINT shop_special_days_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.staff_certificates ADD CONSTRAINT staff_certificates_certificate_type_id_fkey FOREIGN KEY (certificate_type_id) REFERENCES shop_manager.staff_certificate_types(id) ON DELETE RESTRICT'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.staff_certificates ADD CONSTRAINT staff_certificates_created_by_fkey FOREIGN KEY (created_by) REFERENCES shop_manager.profiles(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.staff_certificates ADD CONSTRAINT staff_certificates_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES shop_manager.profiles(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.staff_service_assignments ADD CONSTRAINT staff_service_assignments_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES shop_manager.profiles(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.staff_service_assignments ADD CONSTRAINT staff_service_assignments_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.stock_transfers ADD CONSTRAINT stock_transfers_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES shop_manager.inventory_items(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.technician_breaks ADD CONSTRAINT technician_breaks_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES shop_manager.technician_schedules(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.vehicle_inspections ADD CONSTRAINT vehicle_inspections_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES shop_manager.vehicles(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.vehicles ADD CONSTRAINT fk_vehicles_customer FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.vehicles ADD CONSTRAINT vehicles_checked_out_to_fkey FOREIGN KEY (checked_out_to) REFERENCES shop_manager.profiles(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.vehicles ADD CONSTRAINT vehicles_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.vendor_bill_lines ADD CONSTRAINT vendor_bill_lines_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES shop_manager.vendor_bills(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.vendor_bills ADD CONSTRAINT vendor_bills_created_by_fkey FOREIGN KEY (created_by) REFERENCES shop_manager.profiles(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.vendor_bills ADD CONSTRAINT vendor_bills_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.vendor_bills ADD CONSTRAINT vendor_bills_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES shop_manager.suppliers(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.vendor_payment_batch_items ADD CONSTRAINT vendor_payment_batch_items_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES shop_manager.vendor_payment_batches(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.vendor_payment_batch_items ADD CONSTRAINT vendor_payment_batch_items_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES shop_manager.vendor_bills(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.vendor_payment_batches ADD CONSTRAINT vendor_payment_batches_created_by_fkey FOREIGN KEY (created_by) REFERENCES shop_manager.profiles(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.vendor_payment_batches ADD CONSTRAINT vendor_payment_batches_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.vendor_payments ADD CONSTRAINT vendor_payments_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES shop_manager.vendor_bills(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.vendor_payments ADD CONSTRAINT vendor_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES shop_manager.profiles(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.vendor_payments ADD CONSTRAINT vendor_payments_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.vendor_payments ADD CONSTRAINT vendor_payments_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES shop_manager.suppliers(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_activities ADD CONSTRAINT fk_activities_work_order FOREIGN KEY (work_order_id) REFERENCES shop_manager.work_orders(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_activities ADD CONSTRAINT work_order_activities_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES shop_manager.work_orders(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_assignments ADD CONSTRAINT work_order_assignments_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES shop_manager.work_orders(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_checklists ADD CONSTRAINT work_order_checklists_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES shop_manager.profiles(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_checklists ADD CONSTRAINT work_order_checklists_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES shop_manager.profiles(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_checklists ADD CONSTRAINT work_order_checklists_created_by_fkey FOREIGN KEY (created_by) REFERENCES shop_manager.profiles(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_checklists ADD CONSTRAINT work_order_checklists_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES shop_manager.work_orders(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_discounts ADD CONSTRAINT work_order_discounts_discount_type_id_fkey FOREIGN KEY (discount_type_id) REFERENCES shop_manager.discount_types(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_discounts ADD CONSTRAINT work_order_discounts_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES shop_manager.work_orders(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_document_versions ADD CONSTRAINT work_order_document_versions_document_id_fkey FOREIGN KEY (document_id) REFERENCES shop_manager.work_order_documents(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_documents ADD CONSTRAINT work_order_documents_category_id_fkey FOREIGN KEY (category_id) REFERENCES shop_manager.work_order_document_categories(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_documents ADD CONSTRAINT work_order_documents_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES shop_manager.work_orders(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_inventory_items ADD CONSTRAINT fk_inventory_items_work_order FOREIGN KEY (work_order_id) REFERENCES shop_manager.work_orders(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_inventory_items ADD CONSTRAINT work_order_inventory_items_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES shop_manager.work_orders(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_job_line_history ADD CONSTRAINT work_order_job_line_history_job_line_id_fkey FOREIGN KEY (job_line_id) REFERENCES shop_manager.work_order_job_lines(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_job_lines ADD CONSTRAINT fk_job_lines_work_order FOREIGN KEY (work_order_id) REFERENCES shop_manager.work_orders(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_job_lines ADD CONSTRAINT work_order_job_lines_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES shop_manager.work_orders(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_notifications ADD CONSTRAINT work_order_notifications_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES shop_manager.work_orders(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_part_history ADD CONSTRAINT work_order_part_history_part_id_fkey FOREIGN KEY (part_id) REFERENCES shop_manager.work_order_parts(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_parts ADD CONSTRAINT work_order_parts_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES shop_manager.inventory_items(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_parts ADD CONSTRAINT work_order_parts_job_line_id_fkey FOREIGN KEY (job_line_id) REFERENCES shop_manager.work_order_job_lines(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_signatures ADD CONSTRAINT work_order_signatures_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES shop_manager.work_orders(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_status_history ADD CONSTRAINT work_order_status_history_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES shop_manager.work_orders(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_template_items ADD CONSTRAINT work_order_template_items_template_id_fkey FOREIGN KEY (template_id) REFERENCES shop_manager.work_order_templates(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_time_entries ADD CONSTRAINT fk_time_entries_work_order FOREIGN KEY (work_order_id) REFERENCES shop_manager.work_orders(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_time_entries ADD CONSTRAINT work_order_time_entries_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES shop_manager.work_orders(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_orders ADD CONSTRAINT fk_linked_prior_work_order FOREIGN KEY (linked_prior_work_order_id) REFERENCES shop_manager.work_orders(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_orders ADD CONSTRAINT fk_work_orders_advisor FOREIGN KEY (advisor_id) REFERENCES shop_manager.profiles(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_orders ADD CONSTRAINT fk_work_orders_created_by FOREIGN KEY (created_by) REFERENCES shop_manager.profiles(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_orders ADD CONSTRAINT fk_work_orders_customer FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_orders ADD CONSTRAINT fk_work_orders_technician FOREIGN KEY (technician_id) REFERENCES shop_manager.profiles(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_orders ADD CONSTRAINT fk_work_orders_vehicle FOREIGN KEY (vehicle_id) REFERENCES shop_manager.vehicles(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_orders ADD CONSTRAINT work_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES shop_manager.customers(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_orders ADD CONSTRAINT work_orders_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES shop_manager.invoices(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_orders ADD CONSTRAINT work_orders_service_category_id_fkey FOREIGN KEY (service_category_id) REFERENCES shop_manager.service_categories(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_orders ADD CONSTRAINT work_orders_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shop_manager.shops(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_orders ADD CONSTRAINT work_orders_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES shop_manager.vehicles(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.appointments ADD CONSTRAINT appointments_advisor_id_fkey FOREIGN KEY (advisor_id) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_addresses ADD CONSTRAINT customer_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_form_comments ADD CONSTRAINT customer_form_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_payment_methods ADD CONSTRAINT customer_payment_methods_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_profiles ADD CONSTRAINT customer_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customer_provided_forms ADD CONSTRAINT customer_provided_forms_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customers ADD CONSTRAINT customers_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.customers ADD CONSTRAINT customers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.discount_code_usage ADD CONSTRAINT discount_code_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.discount_codes ADD CONSTRAINT discount_codes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.employee_availability ADD CONSTRAINT employee_availability_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES auth.users(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.inventory_adjustments ADD CONSTRAINT inventory_adjustments_adjusted_by_fkey FOREIGN KEY (adjusted_by) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.inventory_alerts ADD CONSTRAINT inventory_alerts_acknowledged_by_fkey FOREIGN KEY (acknowledged_by) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.profiles ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.purchase_orders ADD CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.quotes ADD CONSTRAINT quotes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.schedule_notifications ADD CONSTRAINT schedule_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.shift_chats ADD CONSTRAINT shift_chats_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.shift_swap_requests ADD CONSTRAINT shift_swap_requests_requesting_employee_id_fkey FOREIGN KEY (requesting_employee_id) REFERENCES auth.users(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.shift_swap_requests ADD CONSTRAINT shift_swap_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.shift_swap_requests ADD CONSTRAINT shift_swap_requests_target_employee_id_fkey FOREIGN KEY (target_employee_id) REFERENCES auth.users(id) ON DELETE SET NULL'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.shift_templates ADD CONSTRAINT shift_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.shopping_carts ADD CONSTRAINT shopping_carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.vehicle_inspections ADD CONSTRAINT vehicle_inspections_technician_id_fkey FOREIGN KEY (technician_id) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_document_versions ADD CONSTRAINT work_order_document_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_documents ADD CONSTRAINT work_order_documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_documents ADD CONSTRAINT work_order_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_job_line_history ADD CONSTRAINT work_order_job_line_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_order_part_history ADD CONSTRAINT work_order_part_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_orders ADD CONSTRAINT work_orders_advisor_id_fkey FOREIGN KEY (advisor_id) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE shop_manager.work_orders ADD CONSTRAINT work_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)'; EXCEPTION WHEN others THEN RAISE NOTICE 'skip: %', SQLERRM; END $$;


-- ============================================================================
-- SOURCE MIGRATION: 20260713070515_c57f9258-c8b3-4973-9eff-2d03ccade037.sql
-- ============================================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='shop_manager' LOOP
    EXECUTE format('GRANT USAGE ON SCHEMA shop_manager TO authenticated, service_role');
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.%I TO authenticated', r.tablename);
    EXECUTE format('GRANT ALL ON shop_manager.%I TO service_role', r.tablename);
    EXECUTE format('ALTER TABLE shop_manager.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;

GRANT USAGE ON SCHEMA shop_manager TO authenticated, service_role;


-- ============================================================================
-- SOURCE MIGRATION: 20260713071921_8c790938-2bb4-420b-b1df-3261d4bed855.sql
-- ============================================================================

-- 1. Extend chat_threads with business scope
ALTER TABLE public.chat_threads
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'group';

CREATE UNIQUE INDEX IF NOT EXISTS chat_threads_business_team_unique
  ON public.chat_threads(business_id) WHERE kind = 'team';

CREATE INDEX IF NOT EXISTS chat_threads_business_idx ON public.chat_threads(business_id);

-- 2. Ensure a team thread exists for each business and mirror staff membership
CREATE OR REPLACE FUNCTION public.ensure_business_team_thread(_business_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _thread_id uuid;
  _owner_id uuid;
  _name text;
BEGIN
  SELECT id INTO _thread_id FROM public.chat_threads
    WHERE business_id = _business_id AND kind = 'team' LIMIT 1;
  IF _thread_id IS NOT NULL THEN RETURN _thread_id; END IF;

  SELECT owner_id, COALESCE(name,'Team') INTO _owner_id, _name
    FROM public.businesses WHERE id = _business_id;
  IF _owner_id IS NULL THEN RETURN NULL; END IF;

  INSERT INTO public.chat_threads(title, created_by, business_id, kind)
    VALUES (_name || ' — Team', _owner_id, _business_id, 'team')
    RETURNING id INTO _thread_id;

  INSERT INTO public.chat_thread_members(thread_id, user_id, status, invited_by)
    VALUES (_thread_id, _owner_id, 'active', _owner_id)
    ON CONFLICT DO NOTHING;

  -- Add existing active staff
  INSERT INTO public.chat_thread_members(thread_id, user_id, status, invited_by)
    SELECT _thread_id, s.user_id, 'active', _owner_id
      FROM public.business_staff s
      WHERE s.business_id = _business_id AND s.active = true
    ON CONFLICT DO NOTHING;

  RETURN _thread_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_business_created_team_thread()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.ensure_business_team_thread(NEW.id);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS business_team_thread_on_create ON public.businesses;
CREATE TRIGGER business_team_thread_on_create
  AFTER INSERT ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.trg_business_created_team_thread();

CREATE OR REPLACE FUNCTION public.trg_staff_sync_team_thread()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _thread_id uuid;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    SELECT id INTO _thread_id FROM public.chat_threads
      WHERE business_id = OLD.business_id AND kind='team' LIMIT 1;
    IF _thread_id IS NOT NULL THEN
      DELETE FROM public.chat_thread_members
        WHERE thread_id = _thread_id AND user_id = OLD.user_id;
    END IF;
    RETURN OLD;
  END IF;

  _thread_id := public.ensure_business_team_thread(NEW.business_id);
  IF _thread_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.active THEN
    INSERT INTO public.chat_thread_members(thread_id, user_id, status, invited_by)
      VALUES (_thread_id, NEW.user_id, 'active', NEW.invited_by)
      ON CONFLICT (thread_id, user_id) DO UPDATE SET status = 'active';
  ELSE
    UPDATE public.chat_thread_members SET status = 'inactive'
      WHERE thread_id = _thread_id AND user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS business_staff_team_thread_sync ON public.business_staff;
CREATE TRIGGER business_staff_team_thread_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.business_staff
  FOR EACH ROW EXECUTE FUNCTION public.trg_staff_sync_team_thread();

-- Backfill: create team thread for every existing business
DO $$
DECLARE _b uuid;
BEGIN
  FOR _b IN SELECT id FROM public.businesses LOOP
    PERFORM public.ensure_business_team_thread(_b);
  END LOOP;
END $$;

-- 3. Tow request notifications
CREATE OR REPLACE FUNCTION public.notify_user(
  _user_id uuid, _category text, _title text, _body text,
  _link text, _entity_type text, _entity_id uuid, _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.user_notifications(user_id, category, title, body, link_url, entity_type, entity_id, metadata)
    VALUES (_user_id, _category, _title, _body, _link, _entity_type, _entity_id, COALESCE(_metadata, '{}'::jsonb));
END; $$;

CREATE OR REPLACE FUNCTION public.trg_tow_request_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _pid uuid;
  _title text;
  _body text;
  _link text;
BEGIN
  _link := '/dashboard/dispatch?request=' || NEW.id::text;

  IF (TG_OP = 'INSERT') THEN
    _title := 'New tow request';
    _body := COALESCE(NEW.vehicle_summary,'Vehicle') || ' — ' || COALESCE(NEW.pickup_city, NEW.pickup_region, 'Location TBD');
    IF NEW.matched_provider_ids IS NOT NULL THEN
      FOREACH _pid IN ARRAY NEW.matched_provider_ids LOOP
        PERFORM public.notify_user(_pid,'tow_request',_title,_body,_link,'tow_request',NEW.id,'{}'::jsonb);
      END LOOP;
    END IF;
    IF NEW.requested_provider_id IS NOT NULL THEN
      PERFORM public.notify_user(NEW.requested_provider_id,'tow_request','You were requested for a tow',_body,_link,'tow_request',NEW.id,'{}'::jsonb);
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: status change
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    _body := 'Status: ' || NEW.status || ' — ' || COALESCE(NEW.vehicle_summary,'Vehicle');
    PERFORM public.notify_user(NEW.requester_id,'tow_request','Tow request updated',_body,_link,'tow_request',NEW.id,'{}'::jsonb);
    IF NEW.provider_id IS NOT NULL AND (OLD.provider_id IS NULL OR OLD.provider_id <> NEW.provider_id) THEN
      PERFORM public.notify_user(NEW.provider_id,'tow_request','Tow request assigned to you',_body,_link,'tow_request',NEW.id,'{}'::jsonb);
    END IF;
  END IF;

  -- New matched providers appended
  IF NEW.matched_provider_ids IS DISTINCT FROM OLD.matched_provider_ids THEN
    _body := COALESCE(NEW.vehicle_summary,'Vehicle') || ' — ' || COALESCE(NEW.pickup_city, NEW.pickup_region, 'Location TBD');
    IF NEW.matched_provider_ids IS NOT NULL THEN
      FOREACH _pid IN ARRAY NEW.matched_provider_ids LOOP
        IF OLD.matched_provider_ids IS NULL OR NOT (_pid = ANY(OLD.matched_provider_ids)) THEN
          PERFORM public.notify_user(_pid,'tow_request','New tow request',_body,_link,'tow_request',NEW.id,'{}'::jsonb);
        END IF;
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS tow_request_notify ON public.tow_requests;
CREATE TRIGGER tow_request_notify
  AFTER INSERT OR UPDATE ON public.tow_requests
  FOR EACH ROW EXECUTE FUNCTION public.trg_tow_request_notify();

-- 4. Marketplace DM notifications
CREATE OR REPLACE FUNCTION public.trg_message_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _title text; _body text; _link text;
BEGIN
  IF NEW.recipient_id IS NULL OR NEW.recipient_id = NEW.sender_id THEN RETURN NEW; END IF;
  _title := CASE WHEN NEW.is_offer THEN 'New offer' ELSE 'New message' END;
  _body := COALESCE(LEFT(NEW.body, 140), '(attachment)');
  _link := '/dashboard/messages?listing=' || NEW.listing_id::text || '&user=' || NEW.sender_id::text;
  PERFORM public.notify_user(NEW.recipient_id,'message',_title,_body,_link,'message',NEW.id,
    jsonb_build_object('listing_id', NEW.listing_id, 'sender_id', NEW.sender_id));
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS message_notify ON public.messages;
CREATE TRIGGER message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.trg_message_notify();

-- 5. Team chat message notifications (fan-out to other active members)
CREATE OR REPLACE FUNCTION public.trg_thread_message_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _rec record;
  _thread_title text;
  _body text;
BEGIN
  SELECT title INTO _thread_title FROM public.chat_threads WHERE id = NEW.thread_id;
  _body := COALESCE(LEFT(NEW.body, 140), '(attachment)');
  FOR _rec IN
    SELECT user_id FROM public.chat_thread_members
      WHERE thread_id = NEW.thread_id AND status = 'active' AND user_id <> NEW.sender_id
  LOOP
    PERFORM public.notify_user(_rec.user_id,'team_chat',COALESCE(_thread_title,'New team message'),_body,
      '/dashboard/messages?thread=' || NEW.thread_id::text,'chat_thread',NEW.thread_id,
      jsonb_build_object('sender_id', NEW.sender_id));
  END LOOP;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS thread_message_notify ON public.chat_thread_messages;
CREATE TRIGGER thread_message_notify
  AFTER INSERT ON public.chat_thread_messages
  FOR EACH ROW EXECUTE FUNCTION public.trg_thread_message_notify();

-- 6. Realtime
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_thread_messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_thread_members;  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_threads;         EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;             EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.tow_requests;         EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;


-- ============================================================================
-- SOURCE MIGRATION: 20260713081429_d9cdd366-04dd-4e51-939f-541106ff205e.sql
-- ============================================================================

-- Helper: current user's shop_id from shop_manager.profiles
CREATE OR REPLACE FUNCTION shop_manager.get_current_user_shop_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, shop_manager AS $$
  SELECT shop_id FROM shop_manager.profiles WHERE id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION shop_manager.get_user_shop_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, shop_manager AS $$
  SELECT shop_id FROM shop_manager.profiles WHERE id = _user_id LIMIT 1
$$;

-- roles catalog referenced by user_roles.role_id
CREATE TABLE IF NOT EXISTS shop_manager.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name shop_manager.app_role NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON shop_manager.roles TO authenticated;
GRANT ALL ON shop_manager.roles TO service_role;
ALTER TABLE shop_manager.roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "roles_select_all" ON shop_manager.roles;
CREATE POLICY "roles_select_all" ON shop_manager.roles FOR SELECT TO authenticated USING (true);

INSERT INTO shop_manager.roles (name)
SELECT unnest(enum_range(NULL::shop_manager.app_role))
ON CONFLICT (name) DO NOTHING;

-- has_role by enum value (matches policy signatures)
CREATE OR REPLACE FUNCTION shop_manager.has_role(_user_id uuid, _role shop_manager.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, shop_manager AS $$
  SELECT EXISTS (
    SELECT 1
    FROM shop_manager.user_roles ur
    JOIN shop_manager.roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id AND r.name = _role
  )
$$;

-- Generic permission stub — allow owner/admin; extend later when a
-- permissions table lands. Kept conservative on purpose.
CREATE OR REPLACE FUNCTION shop_manager.user_has_permission(_user_id uuid, _permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, shop_manager AS $$
  SELECT EXISTS (
    SELECT 1
    FROM shop_manager.user_roles ur
    JOIN shop_manager.roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id
      AND r.name IN ('owner'::shop_manager.app_role, 'admin'::shop_manager.app_role)
  )
$$;


-- ============================================================================
-- SOURCE MIGRATION: 20260713081559_69ad9a73-edab-4719-b16e-38541b8ba91a.sql
-- ============================================================================

-- Text overload of has_role (some policies pass 'admin'::text instead of the enum)
CREATE OR REPLACE FUNCTION shop_manager.has_role(_user_id uuid, _role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, shop_manager AS $$
  SELECT EXISTS (
    SELECT 1 FROM shop_manager.user_roles ur
    JOIN shop_manager.roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id AND r.name::text = _role
  )
$$;

CREATE OR REPLACE FUNCTION shop_manager.is_staff_member()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, shop_manager AS $$
  SELECT EXISTS (SELECT 1 FROM shop_manager.profiles WHERE id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION shop_manager.is_owner_or_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, shop_manager AS $$
  SELECT EXISTS (
    SELECT 1 FROM shop_manager.user_roles ur
    JOIN shop_manager.roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id
      AND r.name IN ('owner'::shop_manager.app_role, 'admin'::shop_manager.app_role)
  )
$$;

CREATE OR REPLACE FUNCTION shop_manager.get_user_shop_id_secure(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, shop_manager AS $$
  SELECT shop_id FROM shop_manager.profiles WHERE id = _user_id LIMIT 1
$$;

-- 3-arg overload: resource + action; conservative — owner/admin only.
CREATE OR REPLACE FUNCTION shop_manager.user_has_permission(_user_id uuid, _resource text, _action text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, shop_manager AS $$
  SELECT shop_manager.is_owner_or_admin(_user_id)
$$;


-- ============================================================================
-- SOURCE MIGRATION: 20260713081649_7763bb16-35c5-4c76-a8f9-36c3f58090ce.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION shop_manager.is_admin_or_owner_secure(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, shop_manager AS $$
  SELECT shop_manager.is_owner_or_admin(_user_id)
$$;

CREATE OR REPLACE FUNCTION shop_manager.check_user_is_admin_or_owner(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, shop_manager AS $$
  SELECT shop_manager.is_owner_or_admin(_user_id)
$$;

CREATE OR REPLACE FUNCTION shop_manager.is_admin_user(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, shop_manager AS $$
  SELECT shop_manager.has_role(_user_id, 'admin'::shop_manager.app_role)
$$;

CREATE OR REPLACE FUNCTION shop_manager.is_same_shop(_profile_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, shop_manager AS $$
  SELECT EXISTS (
    SELECT 1 FROM shop_manager.profiles p
    WHERE p.id = _profile_id
      AND p.shop_id = (SELECT shop_id FROM shop_manager.profiles WHERE id = auth.uid())
  )
$$;

CREATE OR REPLACE FUNCTION shop_manager.user_belongs_to_shop(_user_id uuid, _shop_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, shop_manager AS $$
  SELECT EXISTS (
    SELECT 1 FROM shop_manager.profiles WHERE id = _user_id AND shop_id = _shop_id
  )
$$;


-- ============================================================================
-- SOURCE MIGRATION: 20260713081838_b99aba93-f19b-4aec-b7a1-3bdb86faadc6.sql
-- ============================================================================

-- ============================================================
-- Profiles: user can see/update own; admins can read shop profiles
-- ============================================================
DROP POLICY IF EXISTS "sm_profiles_select_self" ON shop_manager.profiles;
DROP POLICY IF EXISTS "sm_profiles_select_shop" ON shop_manager.profiles;
DROP POLICY IF EXISTS "sm_profiles_update_self" ON shop_manager.profiles;
DROP POLICY IF EXISTS "sm_profiles_insert_self" ON shop_manager.profiles;

CREATE POLICY "sm_profiles_select_self" ON shop_manager.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR user_id = auth.uid());

CREATE POLICY "sm_profiles_select_shop" ON shop_manager.profiles
  FOR SELECT TO authenticated
  USING (shop_id = shop_manager.get_current_user_shop_id() AND shop_id IS NOT NULL);

CREATE POLICY "sm_profiles_update_self" ON shop_manager.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR user_id = auth.uid())
  WITH CHECK (id = auth.uid() OR user_id = auth.uid());

CREATE POLICY "sm_profiles_insert_self" ON shop_manager.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR user_id = auth.uid());

-- ============================================================
-- Shops: members read; owner/admin update
-- ============================================================
DROP POLICY IF EXISTS "sm_shops_select_members" ON shop_manager.shops;
DROP POLICY IF EXISTS "sm_shops_update_admins" ON shop_manager.shops;

CREATE POLICY "sm_shops_select_members" ON shop_manager.shops
  FOR SELECT TO authenticated
  USING (id = shop_manager.get_current_user_shop_id());

CREATE POLICY "sm_shops_update_admins" ON shop_manager.shops
  FOR UPDATE TO authenticated
  USING (id = shop_manager.get_current_user_shop_id() AND shop_manager.is_owner_or_admin(auth.uid()))
  WITH CHECK (id = shop_manager.get_current_user_shop_id() AND shop_manager.is_owner_or_admin(auth.uid()));

-- ============================================================
-- User roles: user reads own; owner/admin manages in same shop
-- ============================================================
DROP POLICY IF EXISTS "sm_user_roles_select_self" ON shop_manager.user_roles;
DROP POLICY IF EXISTS "sm_user_roles_admin_manage" ON shop_manager.user_roles;

CREATE POLICY "sm_user_roles_select_self" ON shop_manager.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "sm_user_roles_admin_manage" ON shop_manager.user_roles
  FOR ALL TO authenticated
  USING (shop_manager.is_owner_or_admin(auth.uid())
         AND shop_manager.user_belongs_to_shop(user_id, shop_manager.get_current_user_shop_id()))
  WITH CHECK (shop_manager.is_owner_or_admin(auth.uid())
              AND shop_manager.user_belongs_to_shop(user_id, shop_manager.get_current_user_shop_id()));

-- ============================================================
-- Shop-scoped tables (direct shop_id column)
-- ============================================================
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['customers','inventory_items','work_orders']) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "sm_%1$s_shop_all" ON shop_manager.%1$I', t);
    EXECUTE format(
      'CREATE POLICY "sm_%1$s_shop_all" ON shop_manager.%1$I FOR ALL TO authenticated
         USING (shop_id = shop_manager.get_current_user_shop_id() AND shop_id IS NOT NULL)
         WITH CHECK (shop_id = shop_manager.get_current_user_shop_id() AND shop_id IS NOT NULL)', t);
  END LOOP;
END$$;

-- Customer can view/update their own record too
DROP POLICY IF EXISTS "sm_customers_self_select" ON shop_manager.customers;
CREATE POLICY "sm_customers_self_select" ON shop_manager.customers
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- Customer-linked tables (join through shop_manager.customers)
-- ============================================================
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['vehicles','appointments','invoices','quotes']) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "sm_%1$s_shop_all" ON shop_manager.%1$I', t);
    EXECUTE format(
      'CREATE POLICY "sm_%1$s_shop_all" ON shop_manager.%1$I FOR ALL TO authenticated
         USING (customer_id IN (
           SELECT id FROM shop_manager.customers
           WHERE shop_id = shop_manager.get_current_user_shop_id()))
         WITH CHECK (customer_id IN (
           SELECT id FROM shop_manager.customers
           WHERE shop_id = shop_manager.get_current_user_shop_id()))', t);
  END LOOP;
END$$;

-- ============================================================
-- Line items: join through parent invoice / quote
-- ============================================================
DROP POLICY IF EXISTS "sm_invoice_items_shop_all" ON shop_manager.invoice_items;
CREATE POLICY "sm_invoice_items_shop_all" ON shop_manager.invoice_items
  FOR ALL TO authenticated
  USING (invoice_id IN (
    SELECT i.id FROM shop_manager.invoices i
    JOIN shop_manager.customers c ON c.id = i.customer_id
    WHERE c.shop_id = shop_manager.get_current_user_shop_id()))
  WITH CHECK (invoice_id IN (
    SELECT i.id FROM shop_manager.invoices i
    JOIN shop_manager.customers c ON c.id = i.customer_id
    WHERE c.shop_id = shop_manager.get_current_user_shop_id()));

DROP POLICY IF EXISTS "sm_quote_items_shop_all" ON shop_manager.quote_items;
CREATE POLICY "sm_quote_items_shop_all" ON shop_manager.quote_items
  FOR ALL TO authenticated
  USING (quote_id IN (
    SELECT q.id FROM shop_manager.quotes q
    JOIN shop_manager.customers c ON c.id = q.customer_id
    WHERE c.shop_id = shop_manager.get_current_user_shop_id()))
  WITH CHECK (quote_id IN (
    SELECT q.id FROM shop_manager.quotes q
    JOIN shop_manager.customers c ON c.id = q.customer_id
    WHERE c.shop_id = shop_manager.get_current_user_shop_id()));

-- ============================================================
-- Roles catalog: already granted SELECT; policy in previous migration
-- ============================================================

-- ============================================================
-- Auto-provision shop_manager.profiles on first authenticated visit
--
-- Bridge: when a signed-in user hits any shop_manager server-fn / RLS check
-- and there is no matching row in shop_manager.profiles yet, create a stub
-- pointing at their existing public.businesses row (if any) so the
-- get_current_user_shop_id() helper resolves cleanly.
-- ============================================================
CREATE OR REPLACE FUNCTION shop_manager.ensure_profile_for(_user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, shop_manager AS $$
DECLARE
  _existing_shop uuid;
  _biz_id uuid;
  _email text;
  _first text;
  _last text;
BEGIN
  SELECT shop_id INTO _existing_shop FROM shop_manager.profiles WHERE id = _user_id;
  IF _existing_shop IS NOT NULL THEN
    RETURN _existing_shop;
  END IF;

  -- Best-effort: pull the first business the user owns as their "shop".
  BEGIN
    SELECT id INTO _biz_id FROM public.businesses WHERE owner_id = _user_id ORDER BY created_at LIMIT 1;
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    _biz_id := NULL;
  END;

  SELECT email, raw_user_meta_data->>'first_name', raw_user_meta_data->>'last_name'
    INTO _email, _first, _last
    FROM auth.users WHERE id = _user_id;

  INSERT INTO shop_manager.profiles (id, user_id, email, first_name, last_name, shop_id)
  VALUES (_user_id, _user_id, _email, COALESCE(_first, ''), COALESCE(_last, ''), _biz_id)
  ON CONFLICT (id) DO NOTHING;

  RETURN _biz_id;
END$$;

GRANT EXECUTE ON FUNCTION shop_manager.ensure_profile_for(uuid) TO authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260713092951_9b14970f-d116-4ec7-ac76-927ba14d5bcb.sql
-- ============================================================================

ALTER TABLE shop_manager.inventory_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shop members access inventory_transactions" ON shop_manager.inventory_transactions;
CREATE POLICY "shop members access inventory_transactions"
ON shop_manager.inventory_transactions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM shop_manager.inventory_items i WHERE i.id = inventory_transactions.inventory_item_id AND i.shop_id = shop_manager.get_current_user_shop_id()))
WITH CHECK (EXISTS (SELECT 1 FROM shop_manager.inventory_items i WHERE i.id = inventory_transactions.inventory_item_id AND i.shop_id = shop_manager.get_current_user_shop_id()));

ALTER TABLE shop_manager.work_order_parts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shop members access work_order_parts" ON shop_manager.work_order_parts;
CREATE POLICY "shop members access work_order_parts"
ON shop_manager.work_order_parts FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM shop_manager.work_orders w WHERE w.id = work_order_parts.work_order_id AND w.shop_id = shop_manager.get_current_user_shop_id()))
WITH CHECK (EXISTS (SELECT 1 FROM shop_manager.work_orders w WHERE w.id = work_order_parts.work_order_id AND w.shop_id = shop_manager.get_current_user_shop_id()));

ALTER TABLE shop_manager.work_order_job_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shop members access work_order_job_lines" ON shop_manager.work_order_job_lines;
CREATE POLICY "shop members access work_order_job_lines"
ON shop_manager.work_order_job_lines FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM shop_manager.work_orders w WHERE w.id = work_order_job_lines.work_order_id AND w.shop_id = shop_manager.get_current_user_shop_id()))
WITH CHECK (EXISTS (SELECT 1 FROM shop_manager.work_orders w WHERE w.id = work_order_job_lines.work_order_id AND w.shop_id = shop_manager.get_current_user_shop_id()));

-- invoices: id is text; work_order_id is text; customer_id is uuid
ALTER TABLE shop_manager.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shop members access invoices" ON shop_manager.invoices;
CREATE POLICY "shop members access invoices"
ON shop_manager.invoices FOR ALL TO authenticated
USING (
  (invoices.work_order_id IS NOT NULL AND EXISTS (SELECT 1 FROM shop_manager.work_orders w WHERE w.id::text = invoices.work_order_id AND w.shop_id = shop_manager.get_current_user_shop_id()))
  OR EXISTS (SELECT 1 FROM shop_manager.customers c WHERE c.id = invoices.customer_id AND c.shop_id = shop_manager.get_current_user_shop_id())
)
WITH CHECK (
  (invoices.work_order_id IS NOT NULL AND EXISTS (SELECT 1 FROM shop_manager.work_orders w WHERE w.id::text = invoices.work_order_id AND w.shop_id = shop_manager.get_current_user_shop_id()))
  OR EXISTS (SELECT 1 FROM shop_manager.customers c WHERE c.id = invoices.customer_id AND c.shop_id = shop_manager.get_current_user_shop_id())
);

ALTER TABLE shop_manager.invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shop members access invoice_items" ON shop_manager.invoice_items;
CREATE POLICY "shop members access invoice_items"
ON shop_manager.invoice_items FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM shop_manager.invoices i
  LEFT JOIN shop_manager.work_orders w ON w.id::text = i.work_order_id
  LEFT JOIN shop_manager.customers c ON c.id = i.customer_id
  WHERE i.id = invoice_items.invoice_id
    AND (w.shop_id = shop_manager.get_current_user_shop_id() OR c.shop_id = shop_manager.get_current_user_shop_id())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM shop_manager.invoices i
  LEFT JOIN shop_manager.work_orders w ON w.id::text = i.work_order_id
  LEFT JOIN shop_manager.customers c ON c.id = i.customer_id
  WHERE i.id = invoice_items.invoice_id
    AND (w.shop_id = shop_manager.get_current_user_shop_id() OR c.shop_id = shop_manager.get_current_user_shop_id())
));

ALTER TABLE shop_manager.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shop members access payments" ON shop_manager.payments;
CREATE POLICY "shop members access payments"
ON shop_manager.payments FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM shop_manager.customers c WHERE c.id = payments.customer_id AND c.shop_id = shop_manager.get_current_user_shop_id()))
WITH CHECK (EXISTS (SELECT 1 FROM shop_manager.customers c WHERE c.id = payments.customer_id AND c.shop_id = shop_manager.get_current_user_shop_id()));

ALTER TABLE shop_manager.purchase_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shop members access purchase_orders" ON shop_manager.purchase_orders;
CREATE POLICY "shop members access purchase_orders"
ON shop_manager.purchase_orders FOR ALL TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

ALTER TABLE shop_manager.purchase_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shop members access purchase_order_items" ON shop_manager.purchase_order_items;
CREATE POLICY "shop members access purchase_order_items"
ON shop_manager.purchase_order_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM shop_manager.purchase_orders po WHERE po.id = purchase_order_items.purchase_order_id AND (po.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))))
WITH CHECK (EXISTS (SELECT 1 FROM shop_manager.purchase_orders po WHERE po.id = purchase_order_items.purchase_order_id AND (po.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))));


-- ============================================================================
-- SOURCE MIGRATION: 20260714030752_6f5ee6b1-4f4f-4c51-8e76-02388780860e.sql
-- ============================================================================

-- Suppliers: no shop_id column; scope by whether user belongs to any shop
CREATE POLICY sm_suppliers_all ON shop_manager.suppliers
  FOR ALL TO authenticated
  USING (shop_manager.get_current_user_shop_id() IS NOT NULL)
  WITH CHECK (shop_manager.get_current_user_shop_id() IS NOT NULL);

CREATE POLICY sm_vendor_bills_all ON shop_manager.vendor_bills
  FOR ALL TO authenticated
  USING (shop_id = shop_manager.get_current_user_shop_id())
  WITH CHECK (shop_id = shop_manager.get_current_user_shop_id());

CREATE POLICY sm_vendor_bill_lines_all ON shop_manager.vendor_bill_lines
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM shop_manager.vendor_bills b WHERE b.id = vendor_bill_lines.bill_id AND b.shop_id = shop_manager.get_current_user_shop_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM shop_manager.vendor_bills b WHERE b.id = vendor_bill_lines.bill_id AND b.shop_id = shop_manager.get_current_user_shop_id()));

CREATE POLICY sm_vendor_payments_all ON shop_manager.vendor_payments
  FOR ALL TO authenticated
  USING (shop_id = shop_manager.get_current_user_shop_id())
  WITH CHECK (shop_id = shop_manager.get_current_user_shop_id());


-- ============================================================================
-- SOURCE MIGRATION: 20260714031847_09f013bc-9de9-4686-8cbb-b2b4ccbd1633.sql
-- ============================================================================
DO $$ BEGIN
  EXECUTE 'ALTER TABLE shop_manager.labor_rates ENABLE ROW LEVEL SECURITY';
  EXECUTE 'DROP POLICY IF EXISTS sm_labor_rates_all ON shop_manager.labor_rates';
  EXECUTE 'CREATE POLICY sm_labor_rates_all ON shop_manager.labor_rates FOR ALL TO authenticated USING (shop_id = shop_manager.get_current_user_shop_id()) WITH CHECK (shop_id = shop_manager.get_current_user_shop_id())';

  EXECUTE 'ALTER TABLE shop_manager.work_order_time_entries ENABLE ROW LEVEL SECURITY';
  EXECUTE 'DROP POLICY IF EXISTS sm_wo_time_all ON shop_manager.work_order_time_entries';
  EXECUTE 'CREATE POLICY sm_wo_time_all ON shop_manager.work_order_time_entries FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM shop_manager.work_orders wo WHERE wo.id = work_order_time_entries.work_order_id AND wo.shop_id = shop_manager.get_current_user_shop_id())) WITH CHECK (EXISTS (SELECT 1 FROM shop_manager.work_orders wo WHERE wo.id = work_order_time_entries.work_order_id AND wo.shop_id = shop_manager.get_current_user_shop_id()))';

  EXECUTE 'ALTER TABLE shop_manager.work_order_assignments ENABLE ROW LEVEL SECURITY';
  EXECUTE 'DROP POLICY IF EXISTS sm_wo_assign_all ON shop_manager.work_order_assignments';
  EXECUTE 'CREATE POLICY sm_wo_assign_all ON shop_manager.work_order_assignments FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM shop_manager.work_orders wo WHERE wo.id = work_order_assignments.work_order_id AND wo.shop_id = shop_manager.get_current_user_shop_id())) WITH CHECK (EXISTS (SELECT 1 FROM shop_manager.work_orders wo WHERE wo.id = work_order_assignments.work_order_id AND wo.shop_id = shop_manager.get_current_user_shop_id()))';

  EXECUTE 'ALTER TABLE shop_manager.technician_schedules ENABLE ROW LEVEL SECURITY';
  EXECUTE 'DROP POLICY IF EXISTS sm_tech_sched_all ON shop_manager.technician_schedules';
  EXECUTE 'CREATE POLICY sm_tech_sched_all ON shop_manager.technician_schedules FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM shop_manager.profiles p WHERE p.id = technician_schedules.technician_id AND p.shop_id = shop_manager.get_current_user_shop_id())) WITH CHECK (EXISTS (SELECT 1 FROM shop_manager.profiles p WHERE p.id = technician_schedules.technician_id AND p.shop_id = shop_manager.get_current_user_shop_id()))';

  EXECUTE 'ALTER TABLE shop_manager.technician_breaks ENABLE ROW LEVEL SECURITY';
  EXECUTE 'DROP POLICY IF EXISTS sm_tech_breaks_all ON shop_manager.technician_breaks';
  EXECUTE 'CREATE POLICY sm_tech_breaks_all ON shop_manager.technician_breaks FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM shop_manager.technician_schedules s JOIN shop_manager.profiles p ON p.id = s.technician_id WHERE s.id = technician_breaks.schedule_id AND p.shop_id = shop_manager.get_current_user_shop_id())) WITH CHECK (EXISTS (SELECT 1 FROM shop_manager.technician_schedules s JOIN shop_manager.profiles p ON p.id = s.technician_id WHERE s.id = technician_breaks.schedule_id AND p.shop_id = shop_manager.get_current_user_shop_id()))';

  EXECUTE 'ALTER TABLE shop_manager.technician_status_changes ENABLE ROW LEVEL SECURITY';
  EXECUTE 'DROP POLICY IF EXISTS sm_tech_status_all ON shop_manager.technician_status_changes';
  EXECUTE 'CREATE POLICY sm_tech_status_all ON shop_manager.technician_status_changes FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM shop_manager.profiles p WHERE p.id::text = technician_status_changes.technician_id AND p.shop_id = shop_manager.get_current_user_shop_id())) WITH CHECK (EXISTS (SELECT 1 FROM shop_manager.profiles p WHERE p.id::text = technician_status_changes.technician_id AND p.shop_id = shop_manager.get_current_user_shop_id()))';
END $$;


-- ============================================================================
-- SOURCE MIGRATION: 20260714032507_f944b167-9bbe-4f1b-a49b-48dec9a68a68.sql
-- ============================================================================

-- Enable RLS + shop-scoped policies on settings tables
ALTER TABLE shop_manager.shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_manager.shop_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_manager.shop_special_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_manager.company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sm_shop_settings_all ON shop_manager.shop_settings;
CREATE POLICY sm_shop_settings_all ON shop_manager.shop_settings FOR ALL TO authenticated
  USING (shop_id = shop_manager.get_current_user_shop_id())
  WITH CHECK (shop_id = shop_manager.get_current_user_shop_id());

DROP POLICY IF EXISTS sm_shop_hours_all ON shop_manager.shop_hours;
CREATE POLICY sm_shop_hours_all ON shop_manager.shop_hours FOR ALL TO authenticated
  USING (shop_id = shop_manager.get_current_user_shop_id())
  WITH CHECK (shop_id = shop_manager.get_current_user_shop_id());

DROP POLICY IF EXISTS sm_shop_special_days_all ON shop_manager.shop_special_days;
CREATE POLICY sm_shop_special_days_all ON shop_manager.shop_special_days FOR ALL TO authenticated
  USING (shop_id = shop_manager.get_current_user_shop_id())
  WITH CHECK (shop_id = shop_manager.get_current_user_shop_id());

DROP POLICY IF EXISTS sm_company_settings_all ON shop_manager.company_settings;
CREATE POLICY sm_company_settings_all ON shop_manager.company_settings FOR ALL TO authenticated
  USING (shop_id = shop_manager.get_current_user_shop_id())
  WITH CHECK (shop_id = shop_manager.get_current_user_shop_id());

-- Expense tracking
CREATE TABLE IF NOT EXISTS shop_manager.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shop_manager.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  category_id UUID REFERENCES shop_manager.expense_categories(id) ON DELETE SET NULL,
  vendor_id UUID,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  reference_number TEXT,
  description TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'recorded',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_shop_date ON shop_manager.expenses(shop_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON shop_manager.expenses(category_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.expense_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.expenses TO authenticated;
GRANT ALL ON shop_manager.expense_categories TO service_role;
GRANT ALL ON shop_manager.expenses TO service_role;

ALTER TABLE shop_manager.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_manager.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY sm_expense_categories_all ON shop_manager.expense_categories FOR ALL TO authenticated
  USING (shop_id = shop_manager.get_current_user_shop_id())
  WITH CHECK (shop_id = shop_manager.get_current_user_shop_id());

CREATE POLICY sm_expenses_all ON shop_manager.expenses FOR ALL TO authenticated
  USING (shop_id = shop_manager.get_current_user_shop_id())
  WITH CHECK (shop_id = shop_manager.get_current_user_shop_id());

-- updated_at trigger for expenses
CREATE OR REPLACE FUNCTION shop_manager.touch_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = shop_manager AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_expenses_updated ON shop_manager.expenses;
CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON shop_manager.expenses
  FOR EACH ROW EXECUTE FUNCTION shop_manager.touch_updated_at();

DROP TRIGGER IF EXISTS trg_expense_categories_updated ON shop_manager.expense_categories;
CREATE TRIGGER trg_expense_categories_updated BEFORE UPDATE ON shop_manager.expense_categories
  FOR EACH ROW EXECUTE FUNCTION shop_manager.touch_updated_at();


-- ============================================================================
-- SOURCE MIGRATION: 20260714033406_52a679a7-d96b-447e-a534-cb540b995c98.sql
-- ============================================================================

-- Communications & notes: shop-scoped via customer join
CREATE POLICY sm_customer_comms_all ON shop_manager.customer_communications
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM shop_manager.customers c WHERE c.id = customer_communications.customer_id AND c.shop_id = shop_manager.get_current_user_shop_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM shop_manager.customers c WHERE c.id = customer_communications.customer_id AND c.shop_id = shop_manager.get_current_user_shop_id()));

CREATE POLICY sm_customer_notes_all ON shop_manager.customer_notes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM shop_manager.customers c WHERE c.id = customer_notes.customer_id AND c.shop_id = shop_manager.get_current_user_shop_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM shop_manager.customers c WHERE c.id = customer_notes.customer_id AND c.shop_id = shop_manager.get_current_user_shop_id()));


-- ============================================================================
-- SOURCE MIGRATION: 20260714034131_1bed039d-569f-4b91-8f56-bf19451a7786.sql
-- ============================================================================

ALTER TABLE shop_manager.expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT;

DROP POLICY IF EXISTS "shop-receipts read authenticated" ON storage.objects;
DROP POLICY IF EXISTS "shop-receipts write authenticated" ON storage.objects;
DROP POLICY IF EXISTS "shop-receipts update authenticated" ON storage.objects;
DROP POLICY IF EXISTS "shop-receipts delete authenticated" ON storage.objects;

CREATE POLICY "shop-receipts read authenticated" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'shop-receipts');
CREATE POLICY "shop-receipts write authenticated" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'shop-receipts');
CREATE POLICY "shop-receipts update authenticated" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'shop-receipts');
CREATE POLICY "shop-receipts delete authenticated" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'shop-receipts');

CREATE TABLE IF NOT EXISTS shop_manager.customer_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID,
  customer_id UUID NOT NULL,
  vehicle_id UUID,
  reminder_type TEXT NOT NULL DEFAULT 'follow_up',
  title TEXT NOT NULL,
  notes TEXT,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_to UUID,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.customer_reminders TO authenticated;
GRANT ALL ON shop_manager.customer_reminders TO service_role;

ALTER TABLE shop_manager.customer_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reminders_all_authenticated" ON shop_manager.customer_reminders;
CREATE POLICY "reminders_all_authenticated" ON shop_manager.customer_reminders
FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS customer_reminders_customer_idx ON shop_manager.customer_reminders(customer_id);
CREATE INDEX IF NOT EXISTS customer_reminders_due_idx ON shop_manager.customer_reminders(due_date) WHERE status = 'pending';

CREATE OR REPLACE FUNCTION shop_manager.touch_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS customer_reminders_touch ON shop_manager.customer_reminders;
CREATE TRIGGER customer_reminders_touch BEFORE UPDATE ON shop_manager.customer_reminders
FOR EACH ROW EXECUTE FUNCTION shop_manager.touch_updated_at();


-- ============================================================================
-- SOURCE MIGRATION: 20260714035008_71146e6f-405a-436d-a0d3-9c1c87779acd.sql
-- ============================================================================

-- Grants + RLS for CRM segments, service reminders, loyalty
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['customer_segments','customer_segment_assignments','service_reminders','service_reminder_tags','customer_loyalty','customer_activities','customer_touchpoints']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON shop_manager.%I TO service_role', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_all_%s" ON shop_manager.%I', t, t);
    EXECUTE format('CREATE POLICY "auth_all_%s" ON shop_manager.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;


-- ============================================================================
-- SOURCE MIGRATION: 20260714035559_c43891b0-62af-40d5-9dd9-757d5ea6bf16.sql
-- ============================================================================

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['shift_templates','shift_swap_requests','employee_availability','discount_codes','discount_code_usage','discount_types','stock_alerts','service_automation_rules']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON shop_manager.%I TO service_role', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_all_%s" ON shop_manager.%I', t, t);
    EXECUTE format('CREATE POLICY "auth_all_%s" ON shop_manager.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;


-- ============================================================================
-- SOURCE MIGRATION: 20260714040242_e2995194-583b-4ca7-9f5e-a8456e9af42f.sql
-- ============================================================================

-- 1. Grants + policies for existing HR/automation tables
GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.staff_certificates TO authenticated;
GRANT ALL ON shop_manager.staff_certificates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.staff_certificate_types TO authenticated;
GRANT ALL ON shop_manager.staff_certificate_types TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.employee_leave_balances TO authenticated;
GRANT ALL ON shop_manager.employee_leave_balances TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.customer_automation_preferences TO authenticated;
GRANT ALL ON shop_manager.customer_automation_preferences TO service_role;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='shop_manager' AND tablename='staff_certificates') THEN
    EXECUTE 'CREATE POLICY auth_all_staff_certificates ON shop_manager.staff_certificates FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='shop_manager' AND tablename='staff_certificate_types') THEN
    EXECUTE 'CREATE POLICY auth_all_staff_certificate_types ON shop_manager.staff_certificate_types FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='shop_manager' AND tablename='employee_leave_balances') THEN
    EXECUTE 'CREATE POLICY auth_all_employee_leave_balances ON shop_manager.employee_leave_balances FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='shop_manager' AND tablename='customer_automation_preferences') THEN
    EXECUTE 'CREATE POLICY auth_all_customer_automation_preferences ON shop_manager.customer_automation_preferences FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- 2. Leave types lookup
CREATE TABLE IF NOT EXISTS shop_manager.leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID,
  name TEXT NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT true,
  default_hours_per_year NUMERIC NOT NULL DEFAULT 0,
  color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.leave_types TO authenticated;
GRANT ALL ON shop_manager.leave_types TO service_role;
ALTER TABLE shop_manager.leave_types ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='shop_manager' AND tablename='leave_types') THEN
    EXECUTE 'CREATE POLICY auth_all_leave_types ON shop_manager.leave_types FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- 3. Chart of accounts + double-entry journal
CREATE TABLE IF NOT EXISTS shop_manager.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset','liability','equity','revenue','expense')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.chart_of_accounts TO authenticated;
GRANT ALL ON shop_manager.chart_of_accounts TO service_role;
ALTER TABLE shop_manager.chart_of_accounts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='shop_manager' AND tablename='chart_of_accounts') THEN
    EXECUTE 'CREATE POLICY auth_all_chart_of_accounts ON shop_manager.chart_of_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS shop_manager.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference TEXT,
  memo TEXT,
  status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('draft','posted','void')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.journal_entries TO authenticated;
GRANT ALL ON shop_manager.journal_entries TO service_role;
ALTER TABLE shop_manager.journal_entries ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='shop_manager' AND tablename='journal_entries') THEN
    EXECUTE 'CREATE POLICY auth_all_journal_entries ON shop_manager.journal_entries FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS shop_manager.journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES shop_manager.journal_entries(id) ON DELETE CASCADE,
  account_id UUID REFERENCES shop_manager.chart_of_accounts(id),
  account_code TEXT,
  description TEXT,
  debit NUMERIC NOT NULL DEFAULT 0,
  credit NUMERIC NOT NULL DEFAULT 0,
  line_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.journal_entry_lines TO authenticated;
GRANT ALL ON shop_manager.journal_entry_lines TO service_role;
ALTER TABLE shop_manager.journal_entry_lines ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='shop_manager' AND tablename='journal_entry_lines') THEN
    EXECUTE 'CREATE POLICY auth_all_journal_entry_lines ON shop_manager.journal_entry_lines FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_je_lines_entry ON shop_manager.journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_je_date ON shop_manager.journal_entries(entry_date DESC);


-- ============================================================================
-- SOURCE MIGRATION: 20260714041231_2a64059b-ef9b-4388-b34d-dcae0ab40cd2.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS shop_manager.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid,
  employee_id uuid NOT NULL,
  leave_type_id uuid REFERENCES shop_manager.leave_types(id) ON DELETE SET NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  hours numeric NOT NULL DEFAULT 0,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.leave_requests TO authenticated;
GRANT ALL ON shop_manager.leave_requests TO service_role;

ALTER TABLE shop_manager.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_leave_requests" ON shop_manager.leave_requests
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION shop_manager.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = shop_manager, public;

DROP TRIGGER IF EXISTS update_leave_requests_updated_at ON shop_manager.leave_requests;
CREATE TRIGGER update_leave_requests_updated_at
BEFORE UPDATE ON shop_manager.leave_requests
FOR EACH ROW EXECUTE FUNCTION shop_manager.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON shop_manager.leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON shop_manager.leave_requests(status);


-- ============================================================================
-- SOURCE MIGRATION: 20260714155326_c1b1b538-961e-401b-a3e7-0eba5e655d65.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.feature_screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id TEXT NOT NULL,
  route TEXT NOT NULL,
  url TEXT NOT NULL,
  viewport TEXT NOT NULL DEFAULT 'desktop',
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  captured_by TEXT,
  notes TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  sha256 TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feature_screenshots_feature_captured_idx
  ON public.feature_screenshots (feature_id, captured_at DESC);

GRANT SELECT ON public.feature_screenshots TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.feature_screenshots TO authenticated;
GRANT ALL ON public.feature_screenshots TO service_role;

ALTER TABLE public.feature_screenshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_screenshots public read"
  ON public.feature_screenshots FOR SELECT
  USING (true);

CREATE POLICY "feature_screenshots admin insert"
  ON public.feature_screenshots FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "feature_screenshots admin update"
  ON public.feature_screenshots FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "feature_screenshots admin delete"
  ON public.feature_screenshots FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Storage policies for feature-screenshots bucket
CREATE POLICY "feature-screenshots public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'feature-screenshots');

CREATE POLICY "feature-screenshots admin write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'feature-screenshots' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "feature-screenshots admin update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'feature-screenshots' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "feature-screenshots admin delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'feature-screenshots' AND public.has_role(auth.uid(), 'admin'));


-- ============================================================================
-- SOURCE MIGRATION: 20260714155507_6f25272b-4786-48dd-a9c7-31e3d5e2cf43.sql
-- ============================================================================

ALTER TABLE public.feature_screenshots
  ADD COLUMN IF NOT EXISTS storage_path TEXT;


-- ============================================================================
-- SOURCE MIGRATION: 20260714170250_e9540d54-e006-48bd-918c-8e5033f08dab.sql
-- ============================================================================
-- Add optional labor economics fields to shop_manager.profiles so
-- per-technician P&L (revenue = billable hours × rate, cost = hours × cost_rate)
-- has stable columns to read from.
ALTER TABLE shop_manager.profiles
  ADD COLUMN IF NOT EXISTS hourly_rate numeric(10,2),
  ADD COLUMN IF NOT EXISTS cost_rate numeric(10,2);

-- Track which rule produced a reminder so audit + admin surfaces can attribute
-- automation output.
ALTER TABLE shop_manager.service_reminders
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS source_rule_id uuid;

-- Register the cron-driven automation runner token. Value is a random 32-byte
-- hex string; pg_cron sends it in the `x-cron-token` header.
INSERT INTO public.internal_cron_tokens (job_name, token)
VALUES ('shop_automation_run', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (job_name) DO NOTHING;


-- ============================================================================
-- SOURCE MIGRATION: 20260714172542_fe842540-f4a5-410d-a22b-db7d2530ac2c.sql
-- ============================================================================

-- Automation run logs (shop_manager schema)
CREATE TABLE IF NOT EXISTS shop_manager.automation_run_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NULL,
  rule_id uuid NULL,
  ran_at timestamptz NOT NULL DEFAULT now(),
  customers_scanned integer NOT NULL DEFAULT 0,
  vehicles_scanned integer NOT NULL DEFAULT 0,
  reminders_created integer NOT NULL DEFAULT 0,
  skipped_duplicate integer NOT NULL DEFAULT 0,
  error text NULL,
  triggered_by text NOT NULL DEFAULT 'cron'
);

CREATE INDEX IF NOT EXISTS automation_run_logs_shop_ran_at_idx
  ON shop_manager.automation_run_logs (shop_id, ran_at DESC);

GRANT SELECT ON shop_manager.automation_run_logs TO authenticated;
GRANT ALL ON shop_manager.automation_run_logs TO service_role;

ALTER TABLE shop_manager.automation_run_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'shop_manager'
      AND tablename = 'automation_run_logs'
      AND policyname = 'Shop members can read own automation logs'
  ) THEN
    CREATE POLICY "Shop members can read own automation logs"
      ON shop_manager.automation_run_logs
      FOR SELECT
      TO authenticated
      USING (
        shop_id IS NOT NULL
        AND shop_id = shop_manager.get_current_user_shop_id()
      );
  END IF;
END $$;


-- ============================================================================
-- SOURCE MIGRATION: 20260714182226_86c87564-8376-4497-be04-81f0d6ff5210.sql
-- ============================================================================

-- Digital Inspections MVP for Shop Manager
-- Extend vehicle_inspections and add templates/items/photos

ALTER TABLE shop_manager.vehicle_inspections
  ADD COLUMN IF NOT EXISTS shop_id uuid,
  ADD COLUMN IF NOT EXISTS work_order_id uuid,
  ADD COLUMN IF NOT EXISTS customer_id uuid,
  ADD COLUMN IF NOT EXISTS template_id uuid,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS overall_result text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS signed_off_by uuid,
  ADD COLUMN IF NOT EXISTS customer_shared_at timestamptz;

ALTER TABLE shop_manager.vehicle_inspections
  ALTER COLUMN vehicle_body_style DROP NOT NULL;

-- Templates
CREATE TABLE IF NOT EXISTS shop_manager.inspection_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid,
  name text NOT NULL,
  description text,
  is_default boolean NOT NULL DEFAULT false,
  is_system boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shop_manager.inspection_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES shop_manager.inspection_templates(id) ON DELETE CASCADE,
  category text NOT NULL,
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Item results (one row per checked point)
CREATE TABLE IF NOT EXISTS shop_manager.inspection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES shop_manager.vehicle_inspections(id) ON DELETE CASCADE,
  category text NOT NULL,
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  -- pass | attention | fail | na
  result text,
  notes text,
  measurement text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspection_items_inspection ON shop_manager.inspection_items(inspection_id);

-- Photos attached to inspection or specific item
CREATE TABLE IF NOT EXISTS shop_manager.inspection_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES shop_manager.vehicle_inspections(id) ON DELETE CASCADE,
  item_id uuid REFERENCES shop_manager.inspection_items(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  caption text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspection_photos_inspection ON shop_manager.inspection_photos(inspection_id);
CREATE INDEX IF NOT EXISTS idx_vi_shop ON shop_manager.vehicle_inspections(shop_id);
CREATE INDEX IF NOT EXISTS idx_vi_wo ON shop_manager.vehicle_inspections(work_order_id);

GRANT USAGE ON SCHEMA shop_manager TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.inspection_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.inspection_template_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.inspection_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.inspection_photos TO authenticated;
GRANT ALL ON shop_manager.inspection_templates TO service_role;
GRANT ALL ON shop_manager.inspection_template_items TO service_role;
GRANT ALL ON shop_manager.inspection_items TO service_role;
GRANT ALL ON shop_manager.inspection_photos TO service_role;

ALTER TABLE shop_manager.inspection_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_manager.inspection_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_manager.inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_manager.inspection_photos ENABLE ROW LEVEL SECURITY;

-- Templates: shop members can see own shop's templates + system templates
DROP POLICY IF EXISTS "templates_select" ON shop_manager.inspection_templates;
CREATE POLICY "templates_select" ON shop_manager.inspection_templates FOR SELECT TO authenticated
USING (is_system = true OR shop_id = shop_manager.get_current_user_shop_id());

DROP POLICY IF EXISTS "templates_write" ON shop_manager.inspection_templates;
CREATE POLICY "templates_write" ON shop_manager.inspection_templates FOR ALL TO authenticated
USING (shop_id = shop_manager.get_current_user_shop_id())
WITH CHECK (shop_id = shop_manager.get_current_user_shop_id());

DROP POLICY IF EXISTS "template_items_select" ON shop_manager.inspection_template_items;
CREATE POLICY "template_items_select" ON shop_manager.inspection_template_items FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM shop_manager.inspection_templates t WHERE t.id = template_id
  AND (t.is_system = true OR t.shop_id = shop_manager.get_current_user_shop_id())));

DROP POLICY IF EXISTS "template_items_write" ON shop_manager.inspection_template_items;
CREATE POLICY "template_items_write" ON shop_manager.inspection_template_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM shop_manager.inspection_templates t WHERE t.id = template_id AND t.shop_id = shop_manager.get_current_user_shop_id()))
WITH CHECK (EXISTS (SELECT 1 FROM shop_manager.inspection_templates t WHERE t.id = template_id AND t.shop_id = shop_manager.get_current_user_shop_id()));

-- Vehicle inspections RLS (scoped by shop)
ALTER TABLE shop_manager.vehicle_inspections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vi_all" ON shop_manager.vehicle_inspections;
CREATE POLICY "vi_all" ON shop_manager.vehicle_inspections FOR ALL TO authenticated
USING (shop_id = shop_manager.get_current_user_shop_id())
WITH CHECK (shop_id = shop_manager.get_current_user_shop_id());

DROP POLICY IF EXISTS "insp_items_all" ON shop_manager.inspection_items;
CREATE POLICY "insp_items_all" ON shop_manager.inspection_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM shop_manager.vehicle_inspections v WHERE v.id = inspection_id AND v.shop_id = shop_manager.get_current_user_shop_id()))
WITH CHECK (EXISTS (SELECT 1 FROM shop_manager.vehicle_inspections v WHERE v.id = inspection_id AND v.shop_id = shop_manager.get_current_user_shop_id()));

DROP POLICY IF EXISTS "insp_photos_all" ON shop_manager.inspection_photos;
CREATE POLICY "insp_photos_all" ON shop_manager.inspection_photos FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM shop_manager.vehicle_inspections v WHERE v.id = inspection_id AND v.shop_id = shop_manager.get_current_user_shop_id()))
WITH CHECK (EXISTS (SELECT 1 FROM shop_manager.vehicle_inspections v WHERE v.id = inspection_id AND v.shop_id = shop_manager.get_current_user_shop_id()));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION shop_manager.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_vi_upd ON shop_manager.vehicle_inspections;
CREATE TRIGGER trg_vi_upd BEFORE UPDATE ON shop_manager.vehicle_inspections
  FOR EACH ROW EXECUTE FUNCTION shop_manager.set_updated_at();
DROP TRIGGER IF EXISTS trg_ii_upd ON shop_manager.inspection_items;
CREATE TRIGGER trg_ii_upd BEFORE UPDATE ON shop_manager.inspection_items
  FOR EACH ROW EXECUTE FUNCTION shop_manager.set_updated_at();
DROP TRIGGER IF EXISTS trg_it_upd ON shop_manager.inspection_templates;
CREATE TRIGGER trg_it_upd BEFORE UPDATE ON shop_manager.inspection_templates
  FOR EACH ROW EXECUTE FUNCTION shop_manager.set_updated_at();

-- Seed a system default 50-point inspection template
DO $$
DECLARE tid uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM shop_manager.inspection_templates WHERE is_system = true AND name = 'Standard Digital Inspection') THEN
    INSERT INTO shop_manager.inspection_templates(name, description, is_default, is_system, active)
    VALUES ('Standard Digital Inspection', 'Default multi-point inspection covering exterior, interior, under-hood, under-vehicle, brakes, tires, and fluids.', true, true, true)
    RETURNING id INTO tid;

    INSERT INTO shop_manager.inspection_template_items(template_id, category, label, sort_order) VALUES
    (tid, 'Exterior', 'Body condition / panels', 10),
    (tid, 'Exterior', 'Headlights & signals', 20),
    (tid, 'Exterior', 'Windshield & wipers', 30),
    (tid, 'Exterior', 'Mirrors', 40),
    (tid, 'Interior', 'Horn operation', 50),
    (tid, 'Interior', 'Seat belts & airbags', 60),
    (tid, 'Interior', 'HVAC / A/C performance', 70),
    (tid, 'Interior', 'Dashboard warning lights', 80),
    (tid, 'Under Hood', 'Engine oil level & condition', 90),
    (tid, 'Under Hood', 'Coolant level & condition', 100),
    (tid, 'Under Hood', 'Brake fluid', 110),
    (tid, 'Under Hood', 'Power steering fluid', 120),
    (tid, 'Under Hood', 'Battery & terminals', 130),
    (tid, 'Under Hood', 'Belts & hoses', 140),
    (tid, 'Under Hood', 'Air filter', 150),
    (tid, 'Under Vehicle', 'Exhaust system', 160),
    (tid, 'Under Vehicle', 'CV boots / drive shafts', 170),
    (tid, 'Under Vehicle', 'Suspension components', 180),
    (tid, 'Under Vehicle', 'Steering linkage', 190),
    (tid, 'Under Vehicle', 'Fluid leaks', 200),
    (tid, 'Brakes', 'Front pad thickness', 210),
    (tid, 'Brakes', 'Rear pad / shoe thickness', 220),
    (tid, 'Brakes', 'Rotors / drums condition', 230),
    (tid, 'Brakes', 'Brake lines & hoses', 240),
    (tid, 'Tires', 'LF tread depth', 250),
    (tid, 'Tires', 'RF tread depth', 260),
    (tid, 'Tires', 'LR tread depth', 270),
    (tid, 'Tires', 'RR tread depth', 280),
    (tid, 'Tires', 'Tire pressure (all)', 290),
    (tid, 'Tires', 'Wear pattern', 300);
  END IF;
END $$;

-- Storage RLS for shop-inspections bucket
DROP POLICY IF EXISTS "shop_inspections_read" ON storage.objects;
CREATE POLICY "shop_inspections_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'shop-inspections' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "shop_inspections_write" ON storage.objects;
CREATE POLICY "shop_inspections_write" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'shop-inspections' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "shop_inspections_delete" ON storage.objects;
CREATE POLICY "shop_inspections_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'shop-inspections' AND auth.uid() IS NOT NULL);


-- ============================================================================
-- SOURCE MIGRATION: 20260715012303_a5daad1f-ca4a-4606-b07d-3f38ec8c7ee9.sql
-- ============================================================================

-- ============================================================
-- Shop Manager: helper functions
-- ============================================================

-- Sequences for auto-generated numbers (per-shop scoping done via prefix)
CREATE SEQUENCE IF NOT EXISTS shop_manager.quote_number_seq START 1000;
CREATE SEQUENCE IF NOT EXISTS shop_manager.work_order_number_seq START 1000;
CREATE SEQUENCE IF NOT EXISTS shop_manager.receipt_number_seq START 1000;
GRANT USAGE ON SEQUENCE shop_manager.quote_number_seq TO authenticated;
GRANT USAGE ON SEQUENCE shop_manager.work_order_number_seq TO authenticated;
GRANT USAGE ON SEQUENCE shop_manager.receipt_number_seq TO authenticated;

-- Generate quote number
CREATE OR REPLACE FUNCTION shop_manager.generate_quote_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shop_manager, public
AS $$
BEGIN
  IF NEW.quote_number IS NULL OR NEW.quote_number = '' THEN
    NEW.quote_number := 'Q-' || to_char(now(), 'YYMM') || '-' ||
      lpad(nextval('shop_manager.quote_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_generate_quote_number ON shop_manager.quotes;
CREATE TRIGGER trg_generate_quote_number
  BEFORE INSERT ON shop_manager.quotes
  FOR EACH ROW EXECUTE FUNCTION shop_manager.generate_quote_number();

-- Generate work-order number
CREATE OR REPLACE FUNCTION shop_manager.generate_work_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shop_manager, public
AS $$
BEGIN
  IF NEW.work_order_number IS NULL OR NEW.work_order_number = '' THEN
    NEW.work_order_number := 'WO-' || to_char(now(), 'YYMM') || '-' ||
      lpad(nextval('shop_manager.work_order_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_generate_work_order_number ON shop_manager.work_orders;
CREATE TRIGGER trg_generate_work_order_number
  BEFORE INSERT ON shop_manager.work_orders
  FOR EACH ROW EXECUTE FUNCTION shop_manager.generate_work_order_number();

-- Generate payment receipt number (uses transaction_id as receipt slot)
CREATE OR REPLACE FUNCTION shop_manager.generate_receipt_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shop_manager, public
AS $$
BEGIN
  IF NEW.transaction_id IS NULL OR NEW.transaction_id = '' THEN
    NEW.transaction_id := 'RC-' || to_char(now(), 'YYMM') || '-' ||
      lpad(nextval('shop_manager.receipt_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_generate_receipt_number ON shop_manager.payments;
CREATE TRIGGER trg_generate_receipt_number
  BEFORE INSERT ON shop_manager.payments
  FOR EACH ROW EXECUTE FUNCTION shop_manager.generate_receipt_number();

-- Recalculate work-order totals from job lines + parts
CREATE OR REPLACE FUNCTION shop_manager.calculate_work_order_totals(_work_order_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shop_manager, public
AS $$
DECLARE
  labor_total numeric := 0;
  parts_total numeric := 0;
  grand numeric := 0;
BEGIN
  SELECT COALESCE(SUM(total_amount), 0) INTO labor_total
    FROM shop_manager.work_order_job_lines WHERE work_order_id = _work_order_id;
  SELECT COALESCE(SUM(customer_price * quantity), 0) INTO parts_total
    FROM shop_manager.work_order_parts WHERE work_order_id = _work_order_id;
  grand := labor_total + parts_total;
  UPDATE shop_manager.work_orders SET total_cost = grand, updated_at = now()
    WHERE id = _work_order_id;
  RETURN grand;
END $$;

GRANT EXECUTE ON FUNCTION shop_manager.calculate_work_order_totals(uuid) TO authenticated;

-- Detect scheduling conflicts for a technician in a time window
CREATE OR REPLACE FUNCTION shop_manager.detect_schedule_conflicts(
  _technician_id uuid,
  _start timestamptz,
  _end timestamptz,
  _exclude_work_order uuid DEFAULT NULL
)
RETURNS TABLE(work_order_id uuid, start_time timestamptz, end_time timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = shop_manager, public
AS $$
  SELECT id, start_time, end_time
  FROM shop_manager.work_orders
  WHERE technician_id = _technician_id
    AND start_time IS NOT NULL
    AND end_time IS NOT NULL
    AND (_exclude_work_order IS NULL OR id <> _exclude_work_order)
    AND tstzrange(start_time, end_time, '[)') && tstzrange(_start, _end, '[)');
$$;

GRANT EXECUTE ON FUNCTION shop_manager.detect_schedule_conflicts(uuid, timestamptz, timestamptz, uuid) TO authenticated;

-- Convert a quote to a work order (copies quote_items → work_order_job_lines / parts)
CREATE OR REPLACE FUNCTION shop_manager.convert_quote_to_work_order(_quote_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shop_manager, public
AS $$
DECLARE
  q shop_manager.quotes%ROWTYPE;
  new_wo_id uuid;
BEGIN
  SELECT * INTO q FROM shop_manager.quotes WHERE id = _quote_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quote % not found', _quote_id; END IF;
  IF q.status = 'converted' AND q.converted_to_work_order_id IS NOT NULL THEN
    RETURN q.converted_to_work_order_id;
  END IF;

  INSERT INTO shop_manager.work_orders (customer_id, vehicle_id, status, description, created_by)
  VALUES (q.customer_id, q.vehicle_id, 'pending', q.notes, auth.uid())
  RETURNING id INTO new_wo_id;

  -- Services / labor lines
  INSERT INTO shop_manager.work_order_job_lines
    (work_order_id, name, description, category, estimated_hours, labor_rate, total_amount, display_order)
  SELECT new_wo_id, name, description, category, quantity, unit_price, total_price, display_order
  FROM shop_manager.quote_items WHERE quote_id = _quote_id AND item_type IN ('service','labor');

  -- Parts lines
  INSERT INTO shop_manager.work_order_parts
    (work_order_id, part_name, quantity, customer_price, retail_price, part_type, category)
  SELECT new_wo_id, name, quantity::int, unit_price, unit_price, 'aftermarket', category
  FROM shop_manager.quote_items WHERE quote_id = _quote_id AND item_type = 'part';

  UPDATE shop_manager.quotes
    SET status = 'converted', converted_at = now(), converted_to_work_order_id = new_wo_id, updated_at = now()
    WHERE id = _quote_id;

  PERFORM shop_manager.calculate_work_order_totals(new_wo_id);
  RETURN new_wo_id;
END $$;

GRANT EXECUTE ON FUNCTION shop_manager.convert_quote_to_work_order(uuid) TO authenticated;

-- Convert a work order to an invoice
CREATE OR REPLACE FUNCTION shop_manager.convert_work_order_to_invoice(_work_order_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shop_manager, public
AS $$
DECLARE
  wo shop_manager.work_orders%ROWTYPE;
  cust shop_manager.customers%ROWTYPE;
  new_invoice_id text;
  subtotal_v numeric := 0;
  tax_rate_v numeric := 0.12;
  tax_v numeric := 0;
BEGIN
  SELECT * INTO wo FROM shop_manager.work_orders WHERE id = _work_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Work order % not found', _work_order_id; END IF;
  IF wo.invoice_id IS NOT NULL THEN RETURN wo.invoice_id; END IF;

  SELECT * INTO cust FROM shop_manager.customers WHERE id = wo.customer_id;

  PERFORM shop_manager.calculate_work_order_totals(_work_order_id);
  SELECT total_cost INTO subtotal_v FROM shop_manager.work_orders WHERE id = _work_order_id;
  subtotal_v := COALESCE(subtotal_v, 0);
  tax_v := round(subtotal_v * tax_rate_v, 2);

  new_invoice_id := 'INV-' || to_char(now(), 'YYMM') || '-' ||
    lpad(nextval('shop_manager.work_order_number_seq')::text, 5, '0');

  INSERT INTO shop_manager.invoices
    (id, customer, customer_email, description, date, due_date, status,
     work_order_id, subtotal, tax, total, created_by, customer_id, created_at)
  VALUES
    (new_invoice_id,
     TRIM(CONCAT(cust.first_name, ' ', cust.last_name)),
     cust.email,
     wo.description,
     to_char(now(), 'YYYY-MM-DD'),
     to_char(now() + interval '30 days', 'YYYY-MM-DD'),
     'unpaid',
     _work_order_id::text,
     subtotal_v,
     tax_v,
     subtotal_v + tax_v,
     auth.uid()::text,
     wo.customer_id,
     now());

  -- Copy job lines as invoice items
  INSERT INTO shop_manager.invoice_items (invoice_id, name, description, quantity, price, total, hours)
  SELECT new_invoice_id, name, description, estimated_hours, labor_rate, total_amount, true
  FROM shop_manager.work_order_job_lines WHERE work_order_id = _work_order_id;

  -- Copy parts as invoice items
  INSERT INTO shop_manager.invoice_items (invoice_id, name, description, quantity, price, total, hours)
  SELECT new_invoice_id, part_name, part_number, quantity, customer_price, customer_price * quantity, false
  FROM shop_manager.work_order_parts WHERE work_order_id = _work_order_id;

  UPDATE shop_manager.work_orders
    SET invoice_id = new_invoice_id, invoiced_at = now(), updated_at = now()
    WHERE id = _work_order_id;

  RETURN new_invoice_id;
END $$;

GRANT EXECUTE ON FUNCTION shop_manager.convert_work_order_to_invoice(uuid) TO authenticated;

-- ============================================================
-- Helper views (security_invoker=on so RLS binds to the caller)
-- ============================================================

-- Technicians view: shop staff resolved from profiles
CREATE OR REPLACE VIEW shop_manager.technicians
WITH (security_invoker=on) AS
SELECT
  p.id,
  p.first_name,
  p.last_name,
  p.full_name,
  p.email,
  p.phone,
  p.shop_id,
  p.job_title,
  p.hourly_rate,
  p.cost_rate
FROM shop_manager.profiles p
WHERE p.shop_id IS NOT NULL;

GRANT SELECT ON shop_manager.technicians TO authenticated;

-- Customer overview: spend & visits
CREATE OR REPLACE VIEW shop_manager.customer_overview
WITH (security_invoker=on) AS
SELECT
  c.id AS customer_id,
  c.shop_id,
  c.first_name,
  c.last_name,
  c.email,
  c.phone,
  COUNT(DISTINCT w.id) AS work_order_count,
  COALESCE(SUM(w.total_cost), 0) AS lifetime_spend,
  MAX(w.created_at) AS last_visit_at,
  MIN(w.created_at) AS first_visit_at
FROM shop_manager.customers c
LEFT JOIN shop_manager.work_orders w ON w.customer_id = c.id
GROUP BY c.id, c.shop_id, c.first_name, c.last_name, c.email, c.phone;

GRANT SELECT ON shop_manager.customer_overview TO authenticated;

-- Inventory stock view
CREATE OR REPLACE VIEW shop_manager.inventory_stock_view
WITH (security_invoker=on) AS
SELECT
  i.id,
  i.shop_id,
  i.name,
  i.sku,
  i.part_number,
  i.category,
  i.supplier,
  i.manufacturer,
  i.quantity AS on_hand,
  COALESCE(i.on_hold, 0) AS on_hold,
  COALESCE(i.on_order, 0) AS on_order,
  GREATEST(i.quantity - COALESCE(i.on_hold, 0), 0) AS available,
  i.reorder_point,
  i.cost_per_unit,
  i.sell_price_per_unit,
  i.unit_price,
  (i.quantity * COALESCE(i.cost_per_unit, 0)) AS stock_value_cost,
  (i.quantity * COALESCE(i.sell_price_per_unit, i.unit_price)) AS stock_value_retail,
  i.status,
  i.updated_at
FROM shop_manager.inventory_items i;

GRANT SELECT ON shop_manager.inventory_stock_view TO authenticated;

-- Financial summary: month-to-date rollup per shop
CREATE OR REPLACE VIEW shop_manager.financial_summary_view
WITH (security_invoker=on) AS
WITH inv AS (
  SELECT
    c.shop_id,
    date_trunc('month', now()) AS period_start,
    COUNT(*) FILTER (WHERE i.status <> 'draft') AS invoice_count,
    COALESCE(SUM(i.total) FILTER (WHERE i.status <> 'draft'), 0) AS invoiced_total,
    COALESCE(SUM(i.total) FILTER (WHERE i.status = 'unpaid'), 0) AS unpaid_total
  FROM shop_manager.invoices i
  LEFT JOIN shop_manager.customers c ON c.id = i.customer_id
  WHERE i.created_at >= date_trunc('month', now())
  GROUP BY c.shop_id
),
pay AS (
  SELECT
    c.shop_id,
    COALESCE(SUM(p.amount), 0) AS payments_total
  FROM shop_manager.payments p
  JOIN shop_manager.customers c ON c.id = p.customer_id
  WHERE p.created_at >= date_trunc('month', now())
    AND p.status IN ('completed','captured','paid','succeeded')
  GROUP BY c.shop_id
),
exp AS (
  SELECT
    e.shop_id,
    COALESCE(SUM(e.amount), 0) AS expense_total
  FROM shop_manager.expenses e
  WHERE e.created_at >= date_trunc('month', now())
  GROUP BY e.shop_id
)
SELECT
  s.id AS shop_id,
  date_trunc('month', now()) AS period_start,
  COALESCE(inv.invoice_count, 0) AS invoice_count,
  COALESCE(inv.invoiced_total, 0) AS invoiced_total,
  COALESCE(inv.unpaid_total, 0) AS unpaid_total,
  COALESCE(pay.payments_total, 0) AS payments_total,
  COALESCE(exp.expense_total, 0) AS expense_total,
  COALESCE(pay.payments_total, 0) - COALESCE(exp.expense_total, 0) AS net_cash
FROM shop_manager.shops s
LEFT JOIN inv ON inv.shop_id = s.id
LEFT JOIN pay ON pay.shop_id = s.id
LEFT JOIN exp ON exp.shop_id = s.id;

GRANT SELECT ON shop_manager.financial_summary_view TO authenticated;


-- ============================================================================
-- SOURCE MIGRATION: 20260715015208_d62496ef-e67e-4f61-a395-604bfd5749dc.sql
-- ============================================================================

-- 1. Source tracking on journal entries -------------------------------------
ALTER TABLE shop_manager.journal_entries
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_id   uuid;

CREATE UNIQUE INDEX IF NOT EXISTS journal_entries_source_uniq
  ON shop_manager.journal_entries (source_type, source_id)
  WHERE source_type IS NOT NULL AND source_id IS NOT NULL;

-- 2. Chart-of-accounts helper -----------------------------------------------
CREATE OR REPLACE FUNCTION shop_manager.sm_get_or_create_account(
  p_shop uuid, p_code text, p_name text, p_type text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shop_manager, public
AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM shop_manager.chart_of_accounts
   WHERE shop_id = p_shop AND code = p_code LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO shop_manager.chart_of_accounts (shop_id, code, name, account_type, is_active)
    VALUES (p_shop, p_code, p_name, p_type, true)
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION shop_manager.sm_seed_chart_of_accounts(p_shop uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shop_manager, public
AS $$
BEGIN
  PERFORM shop_manager.sm_get_or_create_account(p_shop, '1000', 'Cash',                 'asset');
  PERFORM shop_manager.sm_get_or_create_account(p_shop, '1100', 'Accounts Receivable',  'asset');
  PERFORM shop_manager.sm_get_or_create_account(p_shop, '1200', 'Inventory',            'asset');
  PERFORM shop_manager.sm_get_or_create_account(p_shop, '2000', 'Accounts Payable',     'liability');
  PERFORM shop_manager.sm_get_or_create_account(p_shop, '2100', 'Sales Tax Payable',    'liability');
  PERFORM shop_manager.sm_get_or_create_account(p_shop, '4000', 'Sales Revenue',        'revenue');
  PERFORM shop_manager.sm_get_or_create_account(p_shop, '4100', 'Service Revenue',      'revenue');
  PERFORM shop_manager.sm_get_or_create_account(p_shop, '5000', 'Cost of Goods Sold',   'expense');
  PERFORM shop_manager.sm_get_or_create_account(p_shop, '6000', 'Operating Expenses',   'expense');
END $$;

-- 3. Core posting helper ----------------------------------------------------
-- Posts a balanced journal entry from a jsonb array of lines:
--   [ { "code": "1100", "name": "Accounts Receivable", "type": "asset",
--       "debit": 1000, "credit": 0, "description": "..." }, ... ]
CREATE OR REPLACE FUNCTION shop_manager.sm_post_journal(
  p_shop        uuid,
  p_date        date,
  p_reference   text,
  p_memo        text,
  p_source_type text,
  p_source_id   uuid,
  p_lines       jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shop_manager, public
AS $$
DECLARE
  v_entry_id uuid;
  v_line     jsonb;
  v_idx      int := 0;
  v_acct     uuid;
  v_debit    numeric := 0;
  v_credit   numeric := 0;
BEGIN
  IF p_shop IS NULL THEN RETURN NULL; END IF;
  IF p_source_id IS NOT NULL THEN
    SELECT id INTO v_entry_id FROM shop_manager.journal_entries
     WHERE source_type = p_source_type AND source_id = p_source_id LIMIT 1;
    IF v_entry_id IS NOT NULL THEN RETURN v_entry_id; END IF;
  END IF;

  -- Balance guard
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    v_debit  := v_debit  + COALESCE((v_line->>'debit')::numeric, 0);
    v_credit := v_credit + COALESCE((v_line->>'credit')::numeric, 0);
  END LOOP;
  IF ROUND(v_debit, 2) <> ROUND(v_credit, 2) THEN
    RAISE EXCEPTION 'Unbalanced journal entry (debit=% credit=%)', v_debit, v_credit;
  END IF;
  IF v_debit = 0 THEN RETURN NULL; END IF;

  INSERT INTO shop_manager.journal_entries (shop_id, entry_date, reference, memo, status, source_type, source_id)
  VALUES (p_shop, p_date, p_reference, p_memo, 'posted', p_source_type, p_source_id)
  RETURNING id INTO v_entry_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    v_acct := shop_manager.sm_get_or_create_account(
      p_shop,
      v_line->>'code',
      COALESCE(v_line->>'name', v_line->>'code'),
      COALESCE(v_line->>'type', 'asset')
    );
    INSERT INTO shop_manager.journal_entry_lines
      (journal_entry_id, account_id, account_code, description, debit, credit, line_order)
    VALUES (
      v_entry_id, v_acct, v_line->>'code', v_line->>'description',
      COALESCE((v_line->>'debit')::numeric, 0),
      COALESCE((v_line->>'credit')::numeric, 0),
      v_idx
    );
    v_idx := v_idx + 1;
  END LOOP;

  RETURN v_entry_id;
END $$;

CREATE OR REPLACE FUNCTION shop_manager.sm_void_journal_by_source(
  p_source_type text, p_source_id uuid, p_reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shop_manager, public
AS $$
BEGIN
  UPDATE shop_manager.journal_entries
     SET status = 'void',
         memo   = COALESCE(memo,'') || CASE WHEN p_reason IS NULL THEN '' ELSE ' | voided: ' || p_reason END,
         updated_at = now()
   WHERE source_type = p_source_type AND source_id = p_source_id AND status <> 'void';
END $$;

-- 4. Invoice → Journal ------------------------------------------------------
CREATE OR REPLACE FUNCTION shop_manager.sm_trg_invoice_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shop_manager, public
AS $$
DECLARE
  v_shop uuid;
  v_lines jsonb;
BEGIN
  -- Only post when the invoice becomes real to the customer (not draft/void)
  IF COALESCE(NEW.status,'') IN ('draft','void','cancelled') THEN
    IF TG_OP = 'UPDATE' AND COALESCE(OLD.status,'') NOT IN ('draft','void','cancelled') THEN
      PERFORM shop_manager.sm_void_journal_by_source('invoice', NEW.id, 'status=' || NEW.status);
    END IF;
    RETURN NEW;
  END IF;

  SELECT wo.shop_id INTO v_shop FROM shop_manager.work_orders wo WHERE wo.id = NEW.work_order_id;
  IF v_shop IS NULL THEN
    v_shop := shop_manager.get_current_user_shop_id();
  END IF;
  IF v_shop IS NULL THEN RETURN NEW; END IF;

  v_lines := jsonb_build_array(
    jsonb_build_object('code','1100','name','Accounts Receivable','type','asset',
                       'debit', COALESCE(NEW.total,0), 'credit', 0,
                       'description', 'Invoice ' || NEW.id),
    jsonb_build_object('code','4000','name','Sales Revenue','type','revenue',
                       'debit', 0, 'credit', COALESCE(NEW.subtotal,0),
                       'description','Sales'),
    jsonb_build_object('code','2100','name','Sales Tax Payable','type','liability',
                       'debit', 0, 'credit', COALESCE(NEW.tax,0),
                       'description','Sales tax')
  );

  PERFORM shop_manager.sm_post_journal(
    v_shop, COALESCE(NEW.date::date, CURRENT_DATE),
    'INV-' || substr(NEW.id::text,1,8),
    'Invoice posted', 'invoice', NEW.id, v_lines
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS sm_trg_invoice_post_ins ON shop_manager.invoices;
DROP TRIGGER IF EXISTS sm_trg_invoice_post_upd ON shop_manager.invoices;
CREATE TRIGGER sm_trg_invoice_post_ins AFTER INSERT ON shop_manager.invoices
FOR EACH ROW EXECUTE FUNCTION shop_manager.sm_trg_invoice_post();
CREATE TRIGGER sm_trg_invoice_post_upd AFTER UPDATE OF status ON shop_manager.invoices
FOR EACH ROW EXECUTE FUNCTION shop_manager.sm_trg_invoice_post();

-- 5. Payment → Journal (DR Cash, CR AR) + refund reversal -------------------
CREATE OR REPLACE FUNCTION shop_manager.sm_trg_payment_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shop_manager, public
AS $$
DECLARE v_shop uuid;
BEGIN
  IF TG_OP = 'UPDATE'
     AND COALESCE(NEW.status,'') = 'refunded'
     AND COALESCE(OLD.status,'') <> 'refunded' THEN
    SELECT wo.shop_id INTO v_shop
      FROM shop_manager.invoices i JOIN shop_manager.work_orders wo ON wo.id=i.work_order_id
     WHERE i.id = NEW.invoice_id;
    IF v_shop IS NULL THEN v_shop := shop_manager.get_current_user_shop_id(); END IF;
    IF v_shop IS NOT NULL THEN
      PERFORM shop_manager.sm_post_journal(
        v_shop, COALESCE(NEW.transaction_date::date, CURRENT_DATE),
        'REFUND-' || substr(NEW.id::text,1,8),
        'Payment refunded',
        'payment_refund', NEW.id,
        jsonb_build_array(
          jsonb_build_object('code','1100','name','Accounts Receivable','type','asset',
                             'debit', COALESCE(NEW.amount,0), 'credit', 0,
                             'description','Refund reversal — restore AR'),
          jsonb_build_object('code','1000','name','Cash','type','asset',
                             'debit', 0, 'credit', COALESCE(NEW.amount,0),
                             'description','Cash out for refund')
        )
      );
    END IF;
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.status,'completed') NOT IN ('completed','succeeded','paid') THEN
    RETURN NEW;
  END IF;

  SELECT wo.shop_id INTO v_shop
    FROM shop_manager.invoices i JOIN shop_manager.work_orders wo ON wo.id=i.work_order_id
   WHERE i.id = NEW.invoice_id;
  IF v_shop IS NULL THEN v_shop := shop_manager.get_current_user_shop_id(); END IF;
  IF v_shop IS NULL THEN RETURN NEW; END IF;

  PERFORM shop_manager.sm_post_journal(
    v_shop, COALESCE(NEW.transaction_date::date, CURRENT_DATE),
    'PMT-' || substr(NEW.id::text,1,8),
    'Customer payment', 'payment', NEW.id,
    jsonb_build_array(
      jsonb_build_object('code','1000','name','Cash','type','asset',
                         'debit', COALESCE(NEW.amount,0), 'credit', 0,
                         'description','Cash received'),
      jsonb_build_object('code','1100','name','Accounts Receivable','type','asset',
                         'debit', 0, 'credit', COALESCE(NEW.amount,0),
                         'description','Applied to AR')
    )
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS sm_trg_payment_post_ins ON shop_manager.payments;
DROP TRIGGER IF EXISTS sm_trg_payment_post_upd ON shop_manager.payments;
CREATE TRIGGER sm_trg_payment_post_ins AFTER INSERT ON shop_manager.payments
FOR EACH ROW EXECUTE FUNCTION shop_manager.sm_trg_payment_post();
CREATE TRIGGER sm_trg_payment_post_upd AFTER UPDATE OF status ON shop_manager.payments
FOR EACH ROW EXECUTE FUNCTION shop_manager.sm_trg_payment_post();

-- 6. Expense → Journal (DR Expense, CR Cash or AP) --------------------------
CREATE OR REPLACE FUNCTION shop_manager.sm_trg_expense_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shop_manager, public
AS $$
DECLARE
  v_shop uuid := NEW.shop_id;
  v_credit_code text := '1000';
  v_credit_name text := 'Cash';
  v_credit_type text := 'asset';
BEGIN
  IF v_shop IS NULL THEN v_shop := shop_manager.get_current_user_shop_id(); END IF;
  IF v_shop IS NULL THEN RETURN NEW; END IF;
  IF COALESCE(NEW.status,'paid') = 'unpaid' THEN
    v_credit_code := '2000'; v_credit_name := 'Accounts Payable'; v_credit_type := 'liability';
  END IF;

  PERFORM shop_manager.sm_post_journal(
    v_shop, COALESCE(NEW.expense_date, CURRENT_DATE),
    'EXP-' || substr(NEW.id::text,1,8),
    COALESCE(NEW.description,'Expense'),
    'expense', NEW.id,
    jsonb_build_array(
      jsonb_build_object('code','6000','name','Operating Expenses','type','expense',
                         'debit', COALESCE(NEW.amount,0) + COALESCE(NEW.tax_amount,0), 'credit', 0,
                         'description', COALESCE(NEW.description,'Expense')),
      jsonb_build_object('code', v_credit_code, 'name', v_credit_name, 'type', v_credit_type,
                         'debit', 0, 'credit', COALESCE(NEW.amount,0) + COALESCE(NEW.tax_amount,0),
                         'description', COALESCE(NEW.payment_method,'Cash out'))
    )
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS sm_trg_expense_post_ins ON shop_manager.expenses;
CREATE TRIGGER sm_trg_expense_post_ins AFTER INSERT ON shop_manager.expenses
FOR EACH ROW EXECUTE FUNCTION shop_manager.sm_trg_expense_post();

-- 7. Vendor payment → Journal (DR AP, CR Cash) ------------------------------
CREATE OR REPLACE FUNCTION shop_manager.sm_trg_vendor_payment_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shop_manager, public
AS $$
DECLARE v_shop uuid := NEW.shop_id;
BEGIN
  IF v_shop IS NULL THEN v_shop := shop_manager.get_current_user_shop_id(); END IF;
  IF v_shop IS NULL THEN RETURN NEW; END IF;

  PERFORM shop_manager.sm_post_journal(
    v_shop, COALESCE(NEW.payment_date, CURRENT_DATE),
    'VP-' || substr(NEW.id::text,1,8),
    'Vendor payment', 'vendor_payment', NEW.id,
    jsonb_build_array(
      jsonb_build_object('code','2000','name','Accounts Payable','type','liability',
                         'debit', COALESCE(NEW.amount,0), 'credit', 0,
                         'description','Payable settled'),
      jsonb_build_object('code','1000','name','Cash','type','asset',
                         'debit', 0, 'credit', COALESCE(NEW.amount,0),
                         'description', COALESCE(NEW.payment_method,'Cash out'))
    )
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS sm_trg_vendor_payment_post_ins ON shop_manager.vendor_payments;
CREATE TRIGGER sm_trg_vendor_payment_post_ins AFTER INSERT ON shop_manager.vendor_payments
FOR EACH ROW EXECUTE FUNCTION shop_manager.sm_trg_vendor_payment_post();

-- 8. Backfill: seed chart of accounts for every existing shop --------------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT shop_id FROM shop_manager.chart_of_accounts WHERE shop_id IS NOT NULL LOOP
    PERFORM shop_manager.sm_seed_chart_of_accounts(r.shop_id);
  END LOOP;
END $$;


-- ============================================================================
-- SOURCE MIGRATION: 20260715020120_bc5cc45c-4d3d-4e90-a555-cf44d6e11086.sql
-- ============================================================================
-- Invoice-from-inventory: link invoice lines to inventory items, deduct stock, and auto-post COGS/Inventory journals

-- 1) Extend invoice_items with inventory linkage and unit_cost
ALTER TABLE shop_manager.invoice_items
  ADD COLUMN IF NOT EXISTS inventory_item_id uuid REFERENCES shop_manager.inventory_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_cost numeric(12,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_invoice_items_inventory
  ON shop_manager.invoice_items(inventory_item_id) WHERE inventory_item_id IS NOT NULL;

-- 2) Helper: consume ('out') or return ('in') stock for one invoice_items row
-- and post the matching COGS <-> Inventory journal entry line-by-line.
CREATE OR REPLACE FUNCTION shop_manager.sm_apply_invoice_line_stock(
  p_invoice_id text,
  p_item_id uuid,
  p_direction text  -- 'out' = ship (decrement stock, post COGS/Inventory)
                    -- 'in'  = reverse (restore stock, void COGS/Inventory)
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'shop_manager', 'public'
AS $$
DECLARE
  v_line record;
  v_shop uuid;
  v_inv record;
  v_qty numeric;
  v_cost numeric;
  v_total_cost numeric;
  v_lines jsonb;
  v_src text;
BEGIN
  SELECT ii.*, i.date, i.status
    INTO v_line
    FROM shop_manager.invoice_items ii
    JOIN shop_manager.invoices i ON i.id = ii.invoice_id
   WHERE ii.id = p_item_id AND ii.invoice_id = p_invoice_id;
  IF NOT FOUND OR v_line.inventory_item_id IS NULL THEN RETURN; END IF;

  v_qty := COALESCE(v_line.quantity, 0);
  IF v_qty <= 0 THEN RETURN; END IF;

  SELECT * INTO v_inv FROM shop_manager.inventory_items WHERE id = v_line.inventory_item_id;
  IF NOT FOUND THEN RETURN; END IF;
  v_shop := v_inv.shop_id;
  IF v_shop IS NULL THEN RETURN; END IF;

  -- unit_cost: prefer the value snapshotted on the invoice_item, else the inventory master cost
  v_cost := COALESCE(NULLIF(v_line.unit_cost, 0), v_inv.cost_per_unit, 0);
  v_total_cost := v_cost * v_qty;

  IF p_direction = 'out' THEN
    UPDATE shop_manager.inventory_items
       SET quantity = GREATEST(0, COALESCE(quantity,0) - v_qty::int),
           quantity_in_stock = GREATEST(0, COALESCE(quantity_in_stock, quantity, 0) - v_qty::int),
           date_last = CURRENT_DATE,
           updated_at = now()
     WHERE id = v_inv.id;

    IF v_total_cost > 0 THEN
      PERFORM shop_manager.sm_seed_chart_of_accounts(v_shop);
      v_lines := jsonb_build_array(
        jsonb_build_object('code','5000','name','Cost of Goods Sold','type','expense',
                           'debit', v_total_cost, 'credit', 0,
                           'description', 'COGS ' || COALESCE(v_line.name,'inventory item') || ' x' || v_qty::text),
        jsonb_build_object('code','1200','name','Inventory','type','asset',
                           'debit', 0, 'credit', v_total_cost,
                           'description', 'Inventory shipped')
      );
      v_src := 'invoice_item:' || p_item_id::text;
      PERFORM shop_manager.sm_post_journal(
        v_shop,
        COALESCE(v_line.date::date, CURRENT_DATE),
        'COGS-' || substr(p_invoice_id::text,1,8),
        'Inventory sold on invoice ' || p_invoice_id,
        v_src, p_item_id, v_lines
      );
    END IF;

  ELSIF p_direction = 'in' THEN
    UPDATE shop_manager.inventory_items
       SET quantity = COALESCE(quantity,0) + v_qty::int,
           quantity_in_stock = COALESCE(quantity_in_stock, quantity, 0) + v_qty::int,
           updated_at = now()
     WHERE id = v_inv.id;

    PERFORM shop_manager.sm_void_journal_by_source('invoice_item:' || p_item_id::text, p_item_id, 'reversal');
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION shop_manager.sm_apply_invoice_line_stock(text, uuid, text) TO authenticated, service_role;

-- 3) Helper: apply/reverse ALL inventory-linked lines for an invoice
CREATE OR REPLACE FUNCTION shop_manager.sm_apply_invoice_stock(p_invoice_id text, p_direction text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'shop_manager','public'
AS $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT id FROM shop_manager.invoice_items
     WHERE invoice_id = p_invoice_id AND inventory_item_id IS NOT NULL
  LOOP
    PERFORM shop_manager.sm_apply_invoice_line_stock(p_invoice_id, r.id, p_direction);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION shop_manager.sm_apply_invoice_stock(text, text) TO authenticated, service_role;

-- 4) Trigger on invoices: on status transition into "posted" (non-draft/void),
--    consume all inventory-linked lines; on transition out, restore them.
CREATE OR REPLACE FUNCTION shop_manager.sm_trg_invoice_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'shop_manager','public'
AS $$
DECLARE
  was_posted boolean;
  is_posted boolean;
BEGIN
  is_posted := COALESCE(NEW.status,'') NOT IN ('draft','void','cancelled');
  IF TG_OP = 'INSERT' THEN
    IF is_posted THEN PERFORM shop_manager.sm_apply_invoice_stock(NEW.id, 'out'); END IF;
    RETURN NEW;
  END IF;

  was_posted := COALESCE(OLD.status,'') NOT IN ('draft','void','cancelled');
  IF was_posted AND NOT is_posted THEN
    PERFORM shop_manager.sm_apply_invoice_stock(NEW.id, 'in');
  ELSIF is_posted AND NOT was_posted THEN
    PERFORM shop_manager.sm_apply_invoice_stock(NEW.id, 'out');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS sm_trg_invoice_stock_ins ON shop_manager.invoices;
DROP TRIGGER IF EXISTS sm_trg_invoice_stock_upd ON shop_manager.invoices;
CREATE TRIGGER sm_trg_invoice_stock_ins
  AFTER INSERT ON shop_manager.invoices
  FOR EACH ROW EXECUTE FUNCTION shop_manager.sm_trg_invoice_stock();
CREATE TRIGGER sm_trg_invoice_stock_upd
  AFTER UPDATE OF status ON shop_manager.invoices
  FOR EACH ROW EXECUTE FUNCTION shop_manager.sm_trg_invoice_stock();

-- 5) Trigger on invoice_items: apply stock immediately when a line is added
--    to an already-posted invoice, and reverse on delete/qty change.
CREATE OR REPLACE FUNCTION shop_manager.sm_trg_invoice_item_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'shop_manager','public'
AS $$
DECLARE
  v_status text;
  v_posted boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT status INTO v_status FROM shop_manager.invoices WHERE id = OLD.invoice_id;
    v_posted := COALESCE(v_status,'') NOT IN ('draft','void','cancelled');
    IF v_posted AND OLD.inventory_item_id IS NOT NULL THEN
      PERFORM shop_manager.sm_apply_invoice_line_stock(OLD.invoice_id, OLD.id, 'in');
    END IF;
    RETURN OLD;
  END IF;

  SELECT status INTO v_status FROM shop_manager.invoices WHERE id = NEW.invoice_id;
  v_posted := COALESCE(v_status,'') NOT IN ('draft','void','cancelled');
  IF NOT v_posted THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.inventory_item_id IS NOT NULL THEN
      PERFORM shop_manager.sm_apply_invoice_line_stock(NEW.invoice_id, NEW.id, 'out');
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Reverse old, apply new, whenever inventory link or quantity changed
    IF OLD.inventory_item_id IS DISTINCT FROM NEW.inventory_item_id
       OR COALESCE(OLD.quantity,0) IS DISTINCT FROM COALESCE(NEW.quantity,0) THEN
      IF OLD.inventory_item_id IS NOT NULL THEN
        PERFORM shop_manager.sm_apply_invoice_line_stock(OLD.invoice_id, OLD.id, 'in');
      END IF;
      IF NEW.inventory_item_id IS NOT NULL THEN
        PERFORM shop_manager.sm_apply_invoice_line_stock(NEW.invoice_id, NEW.id, 'out');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS sm_trg_invoice_item_stock ON shop_manager.invoice_items;
CREATE TRIGGER sm_trg_invoice_item_stock
  AFTER INSERT OR UPDATE OR DELETE ON shop_manager.invoice_items
  FOR EACH ROW EXECUTE FUNCTION shop_manager.sm_trg_invoice_item_stock();


-- ============================================================================
-- SOURCE MIGRATION: 20260715020533_cd0eef21-5341-4af3-abc2-71fc7c080432.sql
-- ============================================================================
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS custom_domain text,
  ADD COLUMN IF NOT EXISTS custom_domain_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS custom_domain_verify_token text,
  ADD COLUMN IF NOT EXISTS custom_domain_verified_at timestamptz;

CREATE OR REPLACE FUNCTION public.normalize_business_domain(v text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF(
    regexp_replace(
      regexp_replace(lower(trim(coalesce(v,''))), '^https?://', ''),
      '^www\.', ''
    ),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.enforce_business_custom_domain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE norm text;
BEGIN
  norm := public.normalize_business_domain(NEW.custom_domain);
  IF norm IS NOT NULL AND norm !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$' THEN
    RAISE EXCEPTION 'Invalid custom domain: %', NEW.custom_domain;
  END IF;
  NEW.custom_domain := norm;
  IF norm IS NULL THEN
    NEW.custom_domain_status := 'none';
    NEW.custom_domain_verify_token := NULL;
    NEW.custom_domain_verified_at := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_business_custom_domain ON public.businesses;
CREATE TRIGGER trg_enforce_business_custom_domain
  BEFORE INSERT OR UPDATE OF custom_domain, custom_domain_status ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.enforce_business_custom_domain();

CREATE UNIQUE INDEX IF NOT EXISTS uniq_business_custom_domain
  ON public.businesses (custom_domain)
  WHERE custom_domain IS NOT NULL;

DROP POLICY IF EXISTS "Public can resolve verified custom domains" ON public.businesses;
CREATE POLICY "Public can resolve verified custom domains"
  ON public.businesses
  FOR SELECT
  TO anon, authenticated
  USING (
    custom_domain IS NOT NULL
    AND custom_domain_status = 'verified'
  );


-- ============================================================================
-- SOURCE MIGRATION: 20260716020110_bcb99519-8cc0-40be-b8af-c0d69fe82236.sql
-- ============================================================================

-- 1. shop-inspections storage policies: scope to owning shop
DROP POLICY IF EXISTS shop_inspections_read ON storage.objects;
DROP POLICY IF EXISTS shop_inspections_write ON storage.objects;
DROP POLICY IF EXISTS shop_inspections_delete ON storage.objects;

CREATE POLICY shop_inspections_read ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'shop-inspections'
  AND EXISTS (
    SELECT 1 FROM shop_manager.vehicle_inspections v
    WHERE v.id::text = (storage.foldername(name))[1]
      AND v.shop_id = shop_manager.get_current_user_shop_id()
  )
);

CREATE POLICY shop_inspections_write ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'shop-inspections'
  AND EXISTS (
    SELECT 1 FROM shop_manager.vehicle_inspections v
    WHERE v.id::text = (storage.foldername(name))[1]
      AND v.shop_id = shop_manager.get_current_user_shop_id()
  )
);

CREATE POLICY shop_inspections_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'shop-inspections'
  AND EXISTS (
    SELECT 1 FROM shop_manager.vehicle_inspections v
    WHERE v.id::text = (storage.foldername(name))[1]
      AND v.shop_id = shop_manager.get_current_user_shop_id()
  )
);

-- 2. shop-receipts storage policies: scope to uploader's own folder
DROP POLICY IF EXISTS "shop-receipts read authenticated" ON storage.objects;
DROP POLICY IF EXISTS "shop-receipts write authenticated" ON storage.objects;
DROP POLICY IF EXISTS "shop-receipts update authenticated" ON storage.objects;
DROP POLICY IF EXISTS "shop-receipts delete authenticated" ON storage.objects;

CREATE POLICY "shop-receipts read authenticated" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'shop-receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "shop-receipts write authenticated" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'shop-receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "shop-receipts update authenticated" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'shop-receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'shop-receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "shop-receipts delete authenticated" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'shop-receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. staff_academy_articles: drop the email-domain shortcut
DROP POLICY IF EXISTS "Staff read published articles" ON public.staff_academy_articles;

CREATE POLICY "Staff read published articles" ON public.staff_academy_articles
FOR SELECT
USING (
  status <> 'draft'
  AND is_staff(auth.uid())
);


-- ============================================================================
-- SOURCE MIGRATION: 20260716145553_ac1cd5fe-07aa-4ad1-b6ad-caf47c0e2886.sql
-- ============================================================================

-- =========================================
-- business_invoices
-- =========================================
CREATE TABLE public.business_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','void')),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  currency TEXT NOT NULL DEFAULT 'PHP',
  notes TEXT,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, invoice_number)
);
CREATE INDEX business_invoices_business_idx ON public.business_invoices(business_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_invoices TO authenticated;
GRANT ALL ON public.business_invoices TO service_role;

ALTER TABLE public.business_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view business invoices"
  ON public.business_invoices FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));

CREATE POLICY "Managers can insert business invoices"
  ON public.business_invoices FOR INSERT TO authenticated
  WITH CHECK (public.has_business_role(auth.uid(), business_id, 'manager'));

CREATE POLICY "Managers can update business invoices"
  ON public.business_invoices FOR UPDATE TO authenticated
  USING (public.has_business_role(auth.uid(), business_id, 'manager'))
  WITH CHECK (public.has_business_role(auth.uid(), business_id, 'manager'));

CREATE POLICY "Managers can delete business invoices"
  ON public.business_invoices FOR DELETE TO authenticated
  USING (public.has_business_role(auth.uid(), business_id, 'manager'));

-- =========================================
-- business_invoice_items
-- =========================================
CREATE TABLE public.business_invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.business_invoices(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES public.business_inventory_items(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  deducted_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX business_invoice_items_invoice_idx ON public.business_invoice_items(invoice_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_invoice_items TO authenticated;
GRANT ALL ON public.business_invoice_items TO service_role;

ALTER TABLE public.business_invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view invoice items"
  ON public.business_invoice_items FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));

CREATE POLICY "Managers can insert invoice items"
  ON public.business_invoice_items FOR INSERT TO authenticated
  WITH CHECK (public.has_business_role(auth.uid(), business_id, 'manager'));

CREATE POLICY "Managers can update invoice items"
  ON public.business_invoice_items FOR UPDATE TO authenticated
  USING (public.has_business_role(auth.uid(), business_id, 'manager'))
  WITH CHECK (public.has_business_role(auth.uid(), business_id, 'manager'));

CREATE POLICY "Managers can delete invoice items"
  ON public.business_invoice_items FOR DELETE TO authenticated
  USING (public.has_business_role(auth.uid(), business_id, 'manager'));

-- =========================================
-- Trigger: line_total + updated_at + inventory sync
-- =========================================
CREATE OR REPLACE FUNCTION public.set_business_invoice_item_totals()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.line_total := ROUND(COALESCE(NEW.quantity,0) * COALESCE(NEW.unit_price,0), 2);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_biz_invoice_item_totals
BEFORE INSERT OR UPDATE ON public.business_invoice_items
FOR EACH ROW EXECUTE FUNCTION public.set_business_invoice_item_totals();

-- Inventory sync: keep business_inventory_items.qty_on_hand in sync
-- with deducted_qty and log a movement for the diff.
CREATE OR REPLACE FUNCTION public.sync_invoice_item_inventory()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_delta NUMERIC;
  v_target NUMERIC;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.inventory_item_id IS NOT NULL AND NEW.quantity > 0 THEN
      v_delta := -NEW.quantity;
      UPDATE public.business_inventory_items
        SET qty_on_hand = COALESCE(qty_on_hand,0) + v_delta
        WHERE id = NEW.inventory_item_id;
      INSERT INTO public.business_inventory_movements(item_id, business_id, delta, reason, actor_id)
        VALUES (NEW.inventory_item_id, NEW.business_id, v_delta, 'invoice:' || NEW.invoice_id, auth.uid());
      NEW.deducted_qty := NEW.quantity;
      UPDATE public.business_invoice_items SET deducted_qty = NEW.quantity WHERE id = NEW.id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Restore prior deduction if item link removed or changed
    IF OLD.inventory_item_id IS NOT NULL AND OLD.deducted_qty <> 0
       AND (NEW.inventory_item_id IS DISTINCT FROM OLD.inventory_item_id) THEN
      UPDATE public.business_inventory_items
        SET qty_on_hand = COALESCE(qty_on_hand,0) + OLD.deducted_qty
        WHERE id = OLD.inventory_item_id;
      INSERT INTO public.business_inventory_movements(item_id, business_id, delta, reason, actor_id)
        VALUES (OLD.inventory_item_id, OLD.business_id, OLD.deducted_qty, 'invoice-unlink:' || OLD.invoice_id, auth.uid());
      NEW.deducted_qty := 0;
    END IF;
    -- Sync current linked item to NEW.quantity
    IF NEW.inventory_item_id IS NOT NULL THEN
      v_target := NEW.quantity;
      v_delta := -(v_target - NEW.deducted_qty);
      IF v_delta <> 0 THEN
        UPDATE public.business_inventory_items
          SET qty_on_hand = COALESCE(qty_on_hand,0) + v_delta
          WHERE id = NEW.inventory_item_id;
        INSERT INTO public.business_inventory_movements(item_id, business_id, delta, reason, actor_id)
          VALUES (NEW.inventory_item_id, NEW.business_id, v_delta, 'invoice-adjust:' || NEW.invoice_id, auth.uid());
        NEW.deducted_qty := v_target;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.inventory_item_id IS NOT NULL AND OLD.deducted_qty <> 0 THEN
      UPDATE public.business_inventory_items
        SET qty_on_hand = COALESCE(qty_on_hand,0) + OLD.deducted_qty
        WHERE id = OLD.inventory_item_id;
      INSERT INTO public.business_inventory_movements(item_id, business_id, delta, reason, actor_id)
        VALUES (OLD.inventory_item_id, OLD.business_id, OLD.deducted_qty, 'invoice-delete:' || OLD.invoice_id, auth.uid());
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_biz_invoice_item_inventory_ins
AFTER INSERT ON public.business_invoice_items
FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_item_inventory();

CREATE TRIGGER trg_biz_invoice_item_inventory_upd
BEFORE UPDATE ON public.business_invoice_items
FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_item_inventory();

CREATE TRIGGER trg_biz_invoice_item_inventory_del
AFTER DELETE ON public.business_invoice_items
FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_item_inventory();

-- Recompute invoice totals on line change
CREATE OR REPLACE FUNCTION public.recompute_business_invoice_totals()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_invoice UUID;
  v_sub NUMERIC;
  v_rate NUMERIC;
  v_tax NUMERIC;
BEGIN
  v_invoice := COALESCE(NEW.invoice_id, OLD.invoice_id);
  SELECT COALESCE(SUM(line_total),0) INTO v_sub
    FROM public.business_invoice_items WHERE invoice_id = v_invoice;
  SELECT tax_rate INTO v_rate FROM public.business_invoices WHERE id = v_invoice;
  v_tax := ROUND(v_sub * COALESCE(v_rate,0) / 100.0, 2);
  UPDATE public.business_invoices
    SET subtotal = v_sub,
        tax_amount = v_tax,
        total = v_sub + v_tax,
        updated_at = now()
    WHERE id = v_invoice;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_biz_invoice_totals
AFTER INSERT OR UPDATE OR DELETE ON public.business_invoice_items
FOR EACH ROW EXECUTE FUNCTION public.recompute_business_invoice_totals();

-- updated_at on invoice
CREATE OR REPLACE FUNCTION public.touch_business_invoice_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_biz_invoice_touch
BEFORE UPDATE ON public.business_invoices
FOR EACH ROW EXECUTE FUNCTION public.touch_business_invoice_updated_at();


-- ============================================================================
-- SOURCE MIGRATION: 20260717033312_67f3b139-4a4e-418a-95bf-fab1035a98c5.sql
-- ============================================================================

ALTER TABLE public.business_inventory_items
  ADD COLUMN IF NOT EXISTS barcode text,
  ADD COLUMN IF NOT EXISTS manufacturer_part_number text,
  ADD COLUMN IF NOT EXISTS main_category text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS manufacturer text,
  ADD COLUMN IF NOT EXISTS supplier text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS markup_percentage numeric,
  ADD COLUMN IF NOT EXISTS date_purchased date,
  ADD COLUMN IF NOT EXISTS last_price_update date,
  ADD COLUMN IF NOT EXISTS qty_on_hold numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qty_on_order numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_stock_level numeric,
  ADD COLUMN IF NOT EXISTS max_stock_level numeric,
  ADD COLUMN IF NOT EXISTS weight_lbs numeric,
  ADD COLUMN IF NOT EXISTS dimensions text,
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS material text,
  ADD COLUMN IF NOT EXISTS model_year integer,
  ADD COLUMN IF NOT EXISTS oem_part_number text,
  ADD COLUMN IF NOT EXISTS warranty_period text,
  ADD COLUMN IF NOT EXISTS universal_part boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tax_rate numeric,
  ADD COLUMN IF NOT EXISTS environmental_fee numeric,
  ADD COLUMN IF NOT EXISTS core_charge numeric,
  ADD COLUMN IF NOT EXISTS hazmat_fee numeric,
  ADD COLUMN IF NOT EXISTS tax_exempt boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS date_last_ordered date,
  ADD COLUMN IF NOT EXISTS date_last_used date,
  ADD COLUMN IF NOT EXISTS web_links jsonb NOT NULL DEFAULT '[]'::jsonb;


-- ============================================================================
-- SOURCE MIGRATION: 20260718125837_e056555a-51c9-4074-9ab4-f0d8297324d4.sql
-- ============================================================================

ALTER TABLE public.business_invoices
  ADD COLUMN IF NOT EXISTS customer_address TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS po_number TEXT,
  ADD COLUMN IF NOT EXISTS terms TEXT;


-- ============================================================================
-- SOURCE MIGRATION: 20260720052948_61b323c1-58ce-4316-996c-4cac73e5da99.sql
-- ============================================================================

-- 1) Shop Manager plans (per business kind × tier)
CREATE TABLE public.shop_manager_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_kind text NOT NULL,
  tier text NOT NULL CHECK (tier IN ('free','starter','pro','enterprise')),
  name text NOT NULL,
  blurb text,
  base_price_php numeric(10,2) NOT NULL DEFAULT 0,
  yearly_discount_pct numeric(5,2) NOT NULL DEFAULT 16.67, -- ~2 months free
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_ceiling integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_kind, tier)
);

GRANT SELECT ON public.shop_manager_plans TO anon, authenticated;
GRANT ALL ON public.shop_manager_plans TO service_role;
ALTER TABLE public.shop_manager_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans"
  ON public.shop_manager_plans FOR SELECT
  USING (active = true);

-- 2) Regional PPP pricing table
CREATE TABLE public.shop_manager_regional_pricing (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code text NOT NULL UNIQUE,
  country_name text NOT NULL,
  ppp_multiplier numeric(6,3) NOT NULL DEFAULT 1.0,
  currency text NOT NULL DEFAULT 'PHP',
  currency_symbol text NOT NULL DEFAULT '₱',
  fx_to_php numeric(12,6) NOT NULL DEFAULT 1.0, -- 1 unit of local currency = X PHP
  price_ends_in text NOT NULL DEFAULT '9', -- snap suffix
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.shop_manager_regional_pricing TO anon, authenticated;
GRANT ALL ON public.shop_manager_regional_pricing TO service_role;
ALTER TABLE public.shop_manager_regional_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active regional pricing"
  ON public.shop_manager_regional_pricing FOR SELECT
  USING (active = true);

-- 3) Shop Manager subscriptions (per business)
CREATE TABLE public.shop_manager_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  business_id uuid NOT NULL,
  plan_id uuid REFERENCES public.shop_manager_plans(id),
  tier text NOT NULL DEFAULT 'free' CHECK (tier IN ('free','starter','pro','enterprise')),
  status text NOT NULL DEFAULT 'active',
  interval text NOT NULL DEFAULT 'month' CHECK (interval IN ('month','year')),
  country_code text,
  effective_price_local numeric(12,2),
  effective_currency text,
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  auto_upgrade boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id)
);

GRANT SELECT ON public.shop_manager_subscriptions TO authenticated;
GRANT ALL ON public.shop_manager_subscriptions TO service_role;
ALTER TABLE public.shop_manager_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or member can view sub"
  ON public.shop_manager_subscriptions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = shop_manager_subscriptions.business_id AND b.owner_id = auth.uid()
    )
  );

-- 4) Fair-use AI usage counter (monthly)
CREATE TABLE public.shop_manager_ai_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL,
  month_key text NOT NULL, -- 'YYYY-MM'
  calls_used integer NOT NULL DEFAULT 0,
  last_call_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, month_key)
);

GRANT SELECT ON public.shop_manager_ai_usage TO authenticated;
GRANT ALL ON public.shop_manager_ai_usage TO service_role;
ALTER TABLE public.shop_manager_ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own AI usage"
  ON public.shop_manager_ai_usage FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = shop_manager_ai_usage.business_id AND b.owner_id = auth.uid()
    )
  );

-- Shared updated_at trigger
CREATE OR REPLACE FUNCTION public.shop_manager_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER sm_plans_touch BEFORE UPDATE ON public.shop_manager_plans
  FOR EACH ROW EXECUTE FUNCTION public.shop_manager_touch_updated_at();
CREATE TRIGGER sm_regional_touch BEFORE UPDATE ON public.shop_manager_regional_pricing
  FOR EACH ROW EXECUTE FUNCTION public.shop_manager_touch_updated_at();
CREATE TRIGGER sm_subs_touch BEFORE UPDATE ON public.shop_manager_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.shop_manager_touch_updated_at();
CREATE TRIGGER sm_ai_usage_touch BEFORE UPDATE ON public.shop_manager_ai_usage
  FOR EACH ROW EXECUTE FUNCTION public.shop_manager_touch_updated_at();

-- 5) Seed default 4-tier ladder for a set of business kinds.
-- Callers override per-kind via admin console; this is the sensible default.
INSERT INTO public.shop_manager_plans (business_kind, tier, name, blurb, base_price_php, features, limits, ai_ceiling, sort_order)
SELECT bk.kind, t.tier, t.name, t.blurb, t.price, t.features::jsonb, t.limits::jsonb, t.ai_ceiling, t.sort_order
FROM (VALUES
  ('repair_shop'), ('fuel_station'), ('dealership'), ('parts_retailer'),
  ('tow_service'), ('service_shop'), ('detailer'), ('rental'),
  ('inspection_center'), ('accessories'), ('default')
) AS bk(kind)
CROSS JOIN (VALUES
  ('free', 'Free', 'For solo shops getting started', 0,
    '{"custom_domain":false,"ai_translate":false,"ai_doc_check":false,"ai_dvi":false,"ai_smart_search":false,"white_label":false,"priority_support":false,"custom_reports":false,"gl_drilldown":false,"multi_location":false}',
    '{"inventory_skus":100,"invoices_per_month":25,"team_seats":1,"locations":1,"listings":5,"network_sharing":"none"}',
    0, 1),
  ('starter', 'Starter', 'For growing single-shop businesses', 499,
    '{"custom_domain":false,"ai_translate":true,"ai_doc_check":true,"ai_dvi":false,"ai_smart_search":true,"white_label":false,"priority_support":false,"custom_reports":false,"gl_drilldown":false,"multi_location":false}',
    '{"inventory_skus":1000,"invoices_per_month":250,"team_seats":3,"locations":1,"listings":25,"network_sharing":"read"}',
    500, 2),
  ('pro', 'Pro', 'For established shops that need everything', 1499,
    '{"custom_domain":true,"ai_translate":true,"ai_doc_check":true,"ai_dvi":true,"ai_smart_search":true,"white_label":false,"priority_support":true,"custom_reports":false,"gl_drilldown":true,"multi_location":true}',
    '{"inventory_skus":10000,"invoices_per_month":2500,"team_seats":10,"locations":3,"listings":100,"network_sharing":"read_write"}',
    5000, 3),
  ('enterprise', 'Enterprise', 'Multi-branch and franchise operations', 4999,
    '{"custom_domain":true,"ai_translate":true,"ai_doc_check":true,"ai_dvi":true,"ai_smart_search":true,"white_label":true,"priority_support":true,"custom_reports":true,"gl_drilldown":true,"multi_location":true}',
    '{"inventory_skus":null,"invoices_per_month":null,"team_seats":null,"locations":null,"listings":null,"network_sharing":"priority"}',
    50000, 4)
) AS t(tier, name, blurb, price, features, limits, ai_ceiling, sort_order);

-- 6) Seed regional pricing (PPP multipliers). PH = base.
INSERT INTO public.shop_manager_regional_pricing (country_code, country_name, ppp_multiplier, currency, currency_symbol, fx_to_php) VALUES
  ('PH', 'Philippines', 1.000, 'PHP', '₱', 1.0),
  ('ID', 'Indonesia',   0.900, 'IDR', 'Rp', 0.0036),
  ('VN', 'Vietnam',     0.950, 'VND', '₫', 0.0023),
  ('TH', 'Thailand',    1.100, 'THB', '฿', 1.60),
  ('MY', 'Malaysia',    1.200, 'MYR', 'RM', 12.5),
  ('SG', 'Singapore',   2.000, 'SGD', 'S$', 42.0),
  ('JP', 'Japan',       2.200, 'JPY', '¥', 0.37),
  ('KR', 'South Korea', 1.800, 'KRW', '₩', 0.042),
  ('AU', 'Australia',   2.600, 'AUD', 'A$', 37.0),
  ('NZ', 'New Zealand', 2.400, 'NZD', 'NZ$', 34.0),
  ('US', 'United States', 3.000, 'USD', '$', 57.0),
  ('CA', 'Canada',      2.800, 'CAD', 'C$', 42.0),
  ('GB', 'United Kingdom', 2.700, 'GBP', '£', 72.0),
  ('EU', 'Eurozone',    2.500, 'EUR', '€', 62.0),
  ('MX', 'Mexico',      1.200, 'MXN', '$', 3.1),
  ('BR', 'Brazil',      1.300, 'BRL', 'R$', 11.0),
  ('AR', 'Argentina',   1.500, 'ARS', '$', 0.06),
  ('IN', 'India',       0.700, 'INR', '₹', 0.68),
  ('CN', 'China',       1.400, 'CNY', '¥', 7.9),
  ('AE', 'UAE',         2.500, 'AED', 'AED', 15.5),
  ('ZA', 'South Africa', 1.100, 'ZAR', 'R', 3.2),
  ('NG', 'Nigeria',     0.800, 'NGN', '₦', 0.037);


-- ============================================================================
-- SOURCE MIGRATION: 20260726172206_6d55b8f9-1c75-4b3e-825a-33a66205de65.sql
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_activities TO authenticated;
GRANT ALL ON public.lead_activities TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT SELECT ON public.organizations TO anon;
GRANT ALL ON public.organizations TO service_role;


-- ============================================================================
-- SOURCE MIGRATION: 20260727022952_6eba5acb-4c7c-43c0-8d0b-b4064c1cd289.sql
-- ============================================================================
DROP POLICY IF EXISTS "sm_profiles_update_self" ON public.profiles;
DROP POLICY IF EXISTS "sm_profiles_insert_self" ON public.profiles;


-- ============================================================================
-- SOURCE MIGRATION: 20260728125715_52a60fda-14fe-4758-bf19-22284e3e7468.sql
-- ============================================================================

-- 1. Application fields
ALTER TABLE public.partner_program_applications
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS occupation text,
  ADD COLUMN IF NOT EXISTS school_or_company text,
  ADD COLUMN IF NOT EXISTS address_line text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS payout_method text,
  ADD COLUMN IF NOT EXISTS payout_account_name text,
  ADD COLUMN IF NOT EXISTS payout_account_number text,
  ADD COLUMN IF NOT EXISTS payout_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS wants_shop_manager boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS agreed_early_release boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS agreed_early_release_at timestamptz;

-- 2. Partner settings
ALTER TABLE public.partner_program_partners
  ADD COLUMN IF NOT EXISTS shop_manager_access boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payout_account_name text,
  ADD COLUMN IF NOT EXISTS payout_account_number text,
  ADD COLUMN IF NOT EXISTS signup_bounty_php numeric NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS business_bounty_php numeric NOT NULL DEFAULT 10;

-- 3. Allow bounty event types
ALTER TABLE public.partner_program_commission_events
  DROP CONSTRAINT IF EXISTS partner_program_commission_events_event_type_check;
ALTER TABLE public.partner_program_commission_events
  ADD CONSTRAINT partner_program_commission_events_event_type_check
  CHECK (event_type = ANY (ARRAY['seller_sub','boost','verified_business','advertiser_purchase','shop_purchase','user_signup','business_signup','other']));

-- Idempotency for automated bounties
CREATE UNIQUE INDEX IF NOT EXISTS pp_commission_events_source_uniq
  ON public.partner_program_commission_events (partner_id, event_type, source_ref)
  WHERE source_ref IS NOT NULL;

-- 4. Bounty award helper
CREATE OR REPLACE FUNCTION public.pp_award_bounty(_code text, _event_type text, _source_ref text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p record;
  amt numeric;
BEGIN
  IF _code IS NULL OR btrim(_code) = '' THEN RETURN; END IF;
  SELECT id, signup_bounty_php, business_bounty_php INTO p
  FROM public.partner_program_partners
  WHERE lower(referral_code) = lower(btrim(_code)) AND active = true
  LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;
  amt := CASE WHEN _event_type = 'business_signup' THEN p.business_bounty_php ELSE p.signup_bounty_php END;
  IF amt IS NULL OR amt <= 0 THEN RETURN; END IF;
  INSERT INTO public.partner_program_commission_events
    (partner_id, event_type, amount_php, commission_php, status, source_ref, notes)
  VALUES (p.id, _event_type, 0, amt, 'pending', _source_ref,
          CASE WHEN _event_type = 'business_signup' THEN 'Business sign-up bounty' ELSE 'User sign-up bounty' END)
  ON CONFLICT DO NOTHING;
END;
$$;

-- 5. Trigger: user signup bounty
CREATE OR REPLACE FUNCTION public.pp_user_signup_bounty()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.credited_referral_code IS NOT NULL THEN
    PERFORM public.pp_award_bounty(NEW.credited_referral_code, 'user_signup', 'signup:' || NEW.user_id::text);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pp_user_signup_bounty ON public.user_referrals;
CREATE TRIGGER trg_pp_user_signup_bounty
AFTER INSERT OR UPDATE OF credited_referral_code ON public.user_referrals
FOR EACH ROW EXECUTE FUNCTION public.pp_user_signup_bounty();

-- 6. Trigger: business signup bounty
CREATE OR REPLACE FUNCTION public.pp_business_signup_bounty()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code text;
BEGIN
  IF NEW.owner_id IS NULL THEN RETURN NEW; END IF;
  SELECT credited_referral_code INTO code FROM public.user_referrals WHERE user_id = NEW.owner_id LIMIT 1;
  IF code IS NOT NULL THEN
    PERFORM public.pp_award_bounty(code, 'business_signup', 'business:' || NEW.id::text);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pp_business_signup_bounty ON public.businesses;
CREATE TRIGGER trg_pp_business_signup_bounty
AFTER INSERT ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.pp_business_signup_bounty();

-- 7. Applicants can read their own application
DROP POLICY IF EXISTS "Applicants read own partner application" ON public.partner_program_applications;
CREATE POLICY "Applicants read own partner application"
ON public.partner_program_applications
FOR SELECT TO authenticated
USING (user_id = auth.uid());
