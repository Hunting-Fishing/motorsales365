
-- Create quotes table
CREATE TABLE public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_number TEXT UNIQUE,
  customer_id UUID REFERENCES public.customers(id),
  vehicle_id UUID REFERENCES public.vehicles(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'expired', 'converted')),
  subtotal NUMERIC(10,2) DEFAULT 0,
  tax_rate NUMERIC(5,4) DEFAULT 0.08,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) DEFAULT 0,
  expiry_date DATE,
  notes TEXT,
  terms_conditions TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  converted_at TIMESTAMP WITH TIME ZONE,
  converted_to_work_order_id UUID REFERENCES public.work_orders(id)
);

-- Create quote items table
CREATE TABLE public.quote_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  item_type TEXT NOT NULL DEFAULT 'service' CHECK (item_type IN ('service', 'part', 'labor')),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conversion audit table
CREATE TABLE public.conversion_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_type TEXT NOT NULL CHECK (source_type IN ('quote', 'work_order')),
  source_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('work_order', 'invoice')),
  target_id UUID NOT NULL,
  converted_by UUID REFERENCES auth.users(id),
  conversion_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_quotes_customer_id ON public.quotes(customer_id);
CREATE INDEX idx_quotes_status ON public.quotes(status);
CREATE INDEX idx_quotes_quote_number ON public.quotes(quote_number);
CREATE INDEX idx_quote_items_quote_id ON public.quote_items(quote_id);
CREATE INDEX idx_conversion_audit_source ON public.conversion_audit(source_type, source_id);
CREATE INDEX idx_conversion_audit_target ON public.conversion_audit(target_type, target_id);

-- Create function to generate quote numbers
CREATE OR REPLACE FUNCTION public.generate_quote_number(p_shop_id UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  settings_data JSONB;
  prefix_val TEXT;
  separator_val TEXT;
  current_num INTEGER;
  number_length_val INTEGER;
  include_year_val BOOLEAN;
  include_month_val BOOLEAN;
  custom_format_val TEXT;
  year_part TEXT := '';
  month_part TEXT := '';
  number_part TEXT;
  final_number TEXT;
BEGIN
  -- Get or create numbering settings for quotes
  SELECT settings_value INTO settings_data
  FROM company_settings
  WHERE shop_id = COALESCE(p_shop_id, (SELECT id FROM shops LIMIT 1)) 
    AND settings_key = 'quote_numbering';
  
  -- If no settings found, create defaults
  IF settings_data IS NULL THEN
    settings_data := jsonb_build_object(
      'prefix', 'QT',
      'separator', '-',
      'current_number', 1000,
      'number_length', 4,
      'include_year', false,
      'include_month', false,
      'custom_format', '{prefix}{separator}{number}'
    );
    
    -- Insert default settings
    INSERT INTO company_settings (shop_id, settings_key, settings_value)
    VALUES (COALESCE(p_shop_id, (SELECT id FROM shops LIMIT 1)), 'quote_numbering', settings_data);
  END IF;
  
  -- Extract values
  prefix_val := settings_data->>'prefix';
  separator_val := settings_data->>'separator';
  current_num := (settings_data->>'current_number')::INTEGER;
  number_length_val := (settings_data->>'number_length')::INTEGER;
  include_year_val := (settings_data->>'include_year')::BOOLEAN;
  include_month_val := (settings_data->>'include_month')::BOOLEAN;
  custom_format_val := settings_data->>'custom_format';
  
  -- Increment the number
  current_num := current_num + 1;
  
  -- Update the current number in settings
  UPDATE company_settings
  SET settings_value = jsonb_set(settings_data, '{current_number}', to_jsonb(current_num))
  WHERE shop_id = COALESCE(p_shop_id, (SELECT id FROM shops LIMIT 1)) 
    AND settings_key = 'quote_numbering';
  
  -- Format number with leading zeros
  number_part := lpad(current_num::TEXT, number_length_val, '0');
  
  -- Add year/month if required
  IF include_year_val THEN
    year_part := EXTRACT(YEAR FROM now())::TEXT;
  END IF;
  
  IF include_month_val THEN
    month_part := lpad(EXTRACT(MONTH FROM now())::TEXT, 2, '0');
  END IF;
  
  -- Build final number using custom format
  final_number := custom_format_val;
  final_number := replace(final_number, '{prefix}', COALESCE(prefix_val, ''));
  final_number := replace(final_number, '{separator}', COALESCE(separator_val, ''));
  final_number := replace(final_number, '{year}', year_part);
  final_number := replace(final_number, '{month}', month_part);
  final_number := replace(final_number, '{number}', number_part);
  
  RETURN final_number;
END;
$$;

-- Create trigger to auto-generate quote numbers
CREATE OR REPLACE FUNCTION public.set_quote_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.quote_number IS NULL THEN
    NEW.quote_number := generate_quote_number();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_quote_number
  BEFORE INSERT ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_quote_number();

-- Create function to convert quote to work order
CREATE OR REPLACE FUNCTION public.convert_quote_to_work_order(
  p_quote_id UUID,
  p_converted_by UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  quote_record public.quotes;
  new_work_order_id UUID;
  quote_item RECORD;
BEGIN
  -- Get the quote
  SELECT * INTO quote_record FROM public.quotes WHERE id = p_quote_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote with ID % not found', p_quote_id;
  END IF;
  
  IF quote_record.status != 'approved' THEN
    RAISE EXCEPTION 'Quote must be approved before conversion to work order';
  END IF;
  
  -- Create work order
  INSERT INTO public.work_orders (
    customer_id,
    vehicle_id,
    status,
    description,
    total_cost,
    created_by
  ) VALUES (
    quote_record.customer_id,
    quote_record.vehicle_id,
    'pending',
    'Converted from Quote #' || quote_record.quote_number || CASE WHEN p_notes IS NOT NULL THEN ' - ' || p_notes ELSE '' END,
    quote_record.total_amount,
    p_converted_by
  ) RETURNING id INTO new_work_order_id;
  
  -- Convert quote items to job lines
  FOR quote_item IN 
    SELECT * FROM public.quote_items 
    WHERE quote_id = p_quote_id 
    ORDER BY display_order, created_at
  LOOP
    INSERT INTO public.work_order_job_lines (
      work_order_id,
      name,
      description,
      category,
      estimated_hours,
      labor_rate,
      total_amount,
      status,
      display_order
    ) VALUES (
      new_work_order_id,
      quote_item.name,
      quote_item.description,
      quote_item.category,
      CASE WHEN quote_item.item_type = 'labor' THEN quote_item.quantity ELSE 0 END,
      CASE WHEN quote_item.item_type = 'labor' THEN quote_item.unit_price ELSE 0 END,
      quote_item.total_price,
      'pending',
      quote_item.display_order
    );
  END LOOP;
  
  -- Update quote status
  UPDATE public.quotes
  SET 
    status = 'converted',
    converted_at = now(),
    converted_to_work_order_id = new_work_order_id,
    updated_at = now()
  WHERE id = p_quote_id;
  
  -- Log conversion
  INSERT INTO public.conversion_audit (
    source_type,
    source_id,
    target_type,
    target_id,
    converted_by,
    conversion_notes
  ) VALUES (
    'quote',
    p_quote_id,
    'work_order',
    new_work_order_id,
    p_converted_by,
    p_notes
  );
  
  RETURN new_work_order_id;
END;
$$;

-- Create function to convert work order to invoice
CREATE OR REPLACE FUNCTION public.convert_work_order_to_invoice(
  p_work_order_id UUID,
  p_converted_by UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  work_order_record public.work_orders;
  new_invoice_id UUID;
  job_line RECORD;
  part RECORD;
  subtotal NUMERIC := 0;
  tax_amount NUMERIC := 0;
  total_amount NUMERIC := 0;
  tax_rate NUMERIC := 0.08;
BEGIN
  -- Get the work order with customer details
  SELECT wo.*, c.first_name, c.last_name, c.email, c.phone, c.address, c.city, c.state, c.postal_code
  INTO work_order_record
  FROM public.work_orders wo
  LEFT JOIN public.customers c ON wo.customer_id = c.id
  WHERE wo.id = p_work_order_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Work order with ID % not found', p_work_order_id;
  END IF;
  
  IF work_order_record.status != 'completed' THEN
    RAISE EXCEPTION 'Work order must be completed before conversion to invoice';
  END IF;
  
  -- Calculate totals from job lines
  SELECT COALESCE(SUM(total_amount), 0) INTO subtotal
  FROM public.work_order_job_lines
  WHERE work_order_id = p_work_order_id;
  
  -- Add parts costs
  SELECT COALESCE(SUM(customer_price * quantity), 0) INTO subtotal
  FROM public.work_order_parts
  WHERE work_order_id = p_work_order_id;
  
  tax_amount := subtotal * tax_rate;
  total_amount := subtotal + tax_amount;
  
  -- Create invoice
  INSERT INTO public.invoices (
    customer_id,
    work_order_id,
    customer,
    customer_email,
    customer_address,
    status,
    date,
    due_date,
    subtotal,
    tax,
    total,
    notes,
    description,
    created_by
  ) VALUES (
    work_order_record.customer_id,
    p_work_order_id,
    COALESCE(work_order_record.first_name || ' ' || work_order_record.last_name, 'Unknown Customer'),
    work_order_record.email,
    COALESCE(work_order_record.address || ', ' || work_order_record.city || ', ' || work_order_record.state || ' ' || work_order_record.postal_code, ''),
    'pending',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    subtotal,
    tax_amount,
    total_amount,
    CASE WHEN p_notes IS NOT NULL THEN p_notes ELSE 'Invoice generated from Work Order #' || work_order_record.id END,
    'Services and parts from Work Order #' || work_order_record.id,
    p_converted_by
  ) RETURNING id INTO new_invoice_id;
  
  -- Update work order
  UPDATE public.work_orders
  SET 
    invoice_id = new_invoice_id::TEXT,
    invoiced_at = now(),
    updated_at = now()
  WHERE id = p_work_order_id;
  
  -- Log conversion
  INSERT INTO public.conversion_audit (
    source_type,
    source_id,
    target_type,
    target_id,
    converted_by,
    conversion_notes
  ) VALUES (
    'work_order',
    p_work_order_id,
    'invoice',
    new_invoice_id,
    p_converted_by,
    p_notes
  );
  
  RETURN new_invoice_id;
END;
$$;

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION public.update_quotes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_quotes_updated_at();

CREATE TRIGGER trigger_update_quote_items_updated_at
  BEFORE UPDATE ON public.quote_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversion_audit ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic - adjust based on your auth setup)
CREATE POLICY "Users can view quotes" ON public.quotes FOR SELECT USING (true);
CREATE POLICY "Users can insert quotes" ON public.quotes FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update quotes" ON public.quotes FOR UPDATE USING (true);
CREATE POLICY "Users can delete quotes" ON public.quotes FOR DELETE USING (true);

CREATE POLICY "Users can view quote items" ON public.quote_items FOR SELECT USING (true);
CREATE POLICY "Users can insert quote items" ON public.quote_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update quote items" ON public.quote_items FOR UPDATE USING (true);
CREATE POLICY "Users can delete quote items" ON public.quote_items FOR DELETE USING (true);

CREATE POLICY "Users can view conversion audit" ON public.conversion_audit FOR SELECT USING (true);
CREATE POLICY "Users can insert conversion audit" ON public.conversion_audit FOR INSERT WITH CHECK (true);
