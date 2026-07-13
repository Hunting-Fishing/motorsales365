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