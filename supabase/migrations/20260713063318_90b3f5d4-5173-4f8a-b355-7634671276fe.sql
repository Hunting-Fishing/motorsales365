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