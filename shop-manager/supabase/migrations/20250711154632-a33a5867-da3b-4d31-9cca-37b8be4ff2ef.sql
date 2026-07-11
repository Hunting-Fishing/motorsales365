-- RLS Policies for call_logs
CREATE POLICY "Users can view call logs from their shop" 
ON public.call_logs FOR SELECT 
USING (
  customer_id IN (
    SELECT id FROM customers WHERE shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  )
  OR work_order_id IN (
    SELECT id FROM work_orders WHERE customer_id IN (
      SELECT id FROM customers WHERE shop_id IN (
        SELECT shop_id FROM profiles WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can insert call logs for their shop" 
ON public.call_logs FOR INSERT 
WITH CHECK (
  customer_id IN (
    SELECT id FROM customers WHERE shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  )
  OR work_order_id IN (
    SELECT id FROM work_orders WHERE customer_id IN (
      SELECT id FROM customers WHERE shop_id IN (
        SELECT shop_id FROM profiles WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can update call logs from their shop" 
ON public.call_logs FOR UPDATE 
USING (
  customer_id IN (
    SELECT id FROM customers WHERE shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  )
  OR work_order_id IN (
    SELECT id FROM work_orders WHERE customer_id IN (
      SELECT id FROM customers WHERE shop_id IN (
        SELECT shop_id FROM profiles WHERE id = auth.uid()
      )
    )
  )
);

-- RLS Policies for repair_plans
CREATE POLICY "Users can view repair plans from their shop" 
ON public.repair_plans FOR SELECT 
USING (
  customer_id IN (
    SELECT id FROM customers WHERE shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can insert repair plans for their shop" 
ON public.repair_plans FOR INSERT 
WITH CHECK (
  customer_id IN (
    SELECT id FROM customers WHERE shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update repair plans from their shop" 
ON public.repair_plans FOR UPDATE 
USING (
  customer_id IN (
    SELECT id FROM customers WHERE shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete repair plans from their shop" 
ON public.repair_plans FOR DELETE 
USING (
  customer_id IN (
    SELECT id FROM customers WHERE shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  )
);

-- RLS Policies for repair_plan_tasks (inherit from repair_plans)
CREATE POLICY "Users can view repair plan tasks from their shop" 
ON public.repair_plan_tasks FOR SELECT 
USING (
  repair_plan_id IN (
    SELECT id FROM repair_plans WHERE customer_id IN (
      SELECT id FROM customers WHERE shop_id IN (
        SELECT shop_id FROM profiles WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can insert repair plan tasks for their shop" 
ON public.repair_plan_tasks FOR INSERT 
WITH CHECK (
  repair_plan_id IN (
    SELECT id FROM repair_plans WHERE customer_id IN (
      SELECT id FROM customers WHERE shop_id IN (
        SELECT shop_id FROM profiles WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can update repair plan tasks from their shop" 
ON public.repair_plan_tasks FOR UPDATE 
USING (
  repair_plan_id IN (
    SELECT id FROM repair_plans WHERE customer_id IN (
      SELECT id FROM customers WHERE shop_id IN (
        SELECT shop_id FROM profiles WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can delete repair plan tasks from their shop" 
ON public.repair_plan_tasks FOR DELETE 
USING (
  repair_plan_id IN (
    SELECT id FROM repair_plans WHERE customer_id IN (
      SELECT id FROM customers WHERE shop_id IN (
        SELECT shop_id FROM profiles WHERE id = auth.uid()
      )
    )
  )
);

-- RLS Policies for maintenance_schedules
CREATE POLICY "Users can view maintenance schedules from their shop" 
ON public.maintenance_schedules FOR SELECT 
USING (
  customer_id IN (
    SELECT id FROM customers WHERE shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can insert maintenance schedules for their shop" 
ON public.maintenance_schedules FOR INSERT 
WITH CHECK (
  customer_id IN (
    SELECT id FROM customers WHERE shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update maintenance schedules from their shop" 
ON public.maintenance_schedules FOR UPDATE 
USING (
  customer_id IN (
    SELECT id FROM customers WHERE shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete maintenance schedules from their shop" 
ON public.maintenance_schedules FOR DELETE 
USING (
  customer_id IN (
    SELECT id FROM customers WHERE shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  )
);

-- RLS Policies for work_order_checklists
CREATE POLICY "Users can view work order checklists from their shop" 
ON public.work_order_checklists FOR SELECT 
USING (
  work_order_id IN (
    SELECT id FROM work_orders WHERE customer_id IN (
      SELECT id FROM customers WHERE shop_id IN (
        SELECT shop_id FROM profiles WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can insert work order checklists for their shop" 
ON public.work_order_checklists FOR INSERT 
WITH CHECK (
  work_order_id IN (
    SELECT id FROM work_orders WHERE customer_id IN (
      SELECT id FROM customers WHERE shop_id IN (
        SELECT shop_id FROM profiles WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can update work order checklists from their shop" 
ON public.work_order_checklists FOR UPDATE 
USING (
  work_order_id IN (
    SELECT id FROM work_orders WHERE customer_id IN (
      SELECT id FROM customers WHERE shop_id IN (
        SELECT shop_id FROM profiles WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can delete work order checklists from their shop" 
ON public.work_order_checklists FOR DELETE 
USING (
  work_order_id IN (
    SELECT id FROM work_orders WHERE customer_id IN (
      SELECT id FROM customers WHERE shop_id IN (
        SELECT shop_id FROM profiles WHERE id = auth.uid()
      )
    )
  )
);

-- RLS Policies for checklist_items
CREATE POLICY "Users can view checklist items from their shop" 
ON public.checklist_items FOR SELECT 
USING (
  checklist_id IN (
    SELECT id FROM work_order_checklists WHERE work_order_id IN (
      SELECT id FROM work_orders WHERE customer_id IN (
        SELECT id FROM customers WHERE shop_id IN (
          SELECT shop_id FROM profiles WHERE id = auth.uid()
        )
      )
    )
  )
);

CREATE POLICY "Users can insert checklist items for their shop" 
ON public.checklist_items FOR INSERT 
WITH CHECK (
  checklist_id IN (
    SELECT id FROM work_order_checklists WHERE work_order_id IN (
      SELECT id FROM work_orders WHERE customer_id IN (
        SELECT id FROM customers WHERE shop_id IN (
          SELECT shop_id FROM profiles WHERE id = auth.uid()
        )
      )
    )
  )
);

CREATE POLICY "Users can update checklist items from their shop" 
ON public.checklist_items FOR UPDATE 
USING (
  checklist_id IN (
    SELECT id FROM work_order_checklists WHERE work_order_id IN (
      SELECT id FROM work_orders WHERE customer_id IN (
        SELECT id FROM customers WHERE shop_id IN (
          SELECT shop_id FROM profiles WHERE id = auth.uid()
        )
      )
    )
  )
);

CREATE POLICY "Users can delete checklist items from their shop" 
ON public.checklist_items FOR DELETE 
USING (
  checklist_id IN (
    SELECT id FROM work_order_checklists WHERE work_order_id IN (
      SELECT id FROM work_orders WHERE customer_id IN (
        SELECT id FROM customers WHERE shop_id IN (
          SELECT shop_id FROM profiles WHERE id = auth.uid()
        )
      )
    )
  )
);