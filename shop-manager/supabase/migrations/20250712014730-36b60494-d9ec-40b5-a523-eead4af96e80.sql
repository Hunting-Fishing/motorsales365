-- Create repair_plans table
CREATE TABLE public.repair_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'in-progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scheduled_date DATE,
  completed_date DATE,
  estimated_duration INTEGER, -- in hours
  actual_duration INTEGER, -- in hours
  assigned_technician TEXT,
  parts_required TEXT[],
  cost_estimate NUMERIC(10,2),
  customer_approved BOOLEAN DEFAULT false,
  notes TEXT,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE
);

-- Create repair_plan_tasks table
CREATE TABLE public.repair_plan_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repair_plan_id UUID NOT NULL REFERENCES public.repair_plans(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  estimated_hours NUMERIC(4,2) NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  assigned_to TEXT,
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  sequence_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product_price_history table for tracking price changes
CREATE TABLE public.product_price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  price NUMERIC(10,2) NOT NULL,
  sale_price NUMERIC(10,2),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  changed_by UUID REFERENCES auth.users(id),
  notes TEXT
);

-- Enable RLS on repair_plans
ALTER TABLE public.repair_plans ENABLE ROW LEVEL SECURITY;

-- RLS policies for repair_plans
CREATE POLICY "Users can view repair plans from their shop" 
ON public.repair_plans FOR SELECT 
USING (shop_id IN (
  SELECT profiles.shop_id 
  FROM profiles 
  WHERE profiles.id = auth.uid()
));

CREATE POLICY "Users can insert repair plans into their shop" 
ON public.repair_plans FOR INSERT 
WITH CHECK (shop_id IN (
  SELECT profiles.shop_id 
  FROM profiles 
  WHERE profiles.id = auth.uid()
));

CREATE POLICY "Users can update repair plans in their shop" 
ON public.repair_plans FOR UPDATE 
USING (shop_id IN (
  SELECT profiles.shop_id 
  FROM profiles 
  WHERE profiles.id = auth.uid()
));

CREATE POLICY "Users can delete repair plans from their shop" 
ON public.repair_plans FOR DELETE 
USING (shop_id IN (
  SELECT profiles.shop_id 
  FROM profiles 
  WHERE profiles.id = auth.uid()
));

-- Enable RLS on repair_plan_tasks
ALTER TABLE public.repair_plan_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for repair_plan_tasks
CREATE POLICY "Users can view repair plan tasks from their shop" 
ON public.repair_plan_tasks FOR SELECT 
USING (repair_plan_id IN (
  SELECT repair_plans.id 
  FROM repair_plans 
  WHERE repair_plans.shop_id IN (
    SELECT profiles.shop_id 
    FROM profiles 
    WHERE profiles.id = auth.uid()
  )
));

CREATE POLICY "Users can insert repair plan tasks into their shop" 
ON public.repair_plan_tasks FOR INSERT 
WITH CHECK (repair_plan_id IN (
  SELECT repair_plans.id 
  FROM repair_plans 
  WHERE repair_plans.shop_id IN (
    SELECT profiles.shop_id 
    FROM profiles 
    WHERE profiles.id = auth.uid()
  )
));

CREATE POLICY "Users can update repair plan tasks in their shop" 
ON public.repair_plan_tasks FOR UPDATE 
USING (repair_plan_id IN (
  SELECT repair_plans.id 
  FROM repair_plans 
  WHERE repair_plans.shop_id IN (
    SELECT profiles.shop_id 
    FROM profiles 
    WHERE profiles.id = auth.uid()
  )
));

CREATE POLICY "Users can delete repair plan tasks from their shop" 
ON public.repair_plan_tasks FOR DELETE 
USING (repair_plan_id IN (
  SELECT repair_plans.id 
  FROM repair_plans 
  WHERE repair_plans.shop_id IN (
    SELECT profiles.shop_id 
    FROM profiles 
    WHERE profiles.id = auth.uid()
  )
));

-- Enable RLS on product_price_history
ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_price_history
CREATE POLICY "Users can view product price history from their shop" 
ON public.product_price_history FOR SELECT 
USING (product_id IN (
  SELECT products.id 
  FROM products 
  WHERE products.shop_id IN (
    SELECT profiles.shop_id 
    FROM profiles 
    WHERE profiles.id = auth.uid()
  )
));

CREATE POLICY "Users can insert product price history for their shop" 
ON public.product_price_history FOR INSERT 
WITH CHECK (product_id IN (
  SELECT products.id 
  FROM products 
  WHERE products.shop_id IN (
    SELECT profiles.shop_id 
    FROM profiles 
    WHERE profiles.id = auth.uid()
  )
));

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_repair_plans_updated_at
BEFORE UPDATE ON public.repair_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_repair_plan_tasks_updated_at
BEFORE UPDATE ON public.repair_plan_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();