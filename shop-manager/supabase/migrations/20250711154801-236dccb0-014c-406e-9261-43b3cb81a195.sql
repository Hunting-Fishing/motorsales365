-- RLS Policies for team management tables
CREATE POLICY "Users can view team departments from their shop" 
ON public.team_departments FOR SELECT 
USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert team departments for their shop" 
ON public.team_departments FOR INSERT 
WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update team departments from their shop" 
ON public.team_departments FOR UPDATE 
USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete team departments from their shop" 
ON public.team_departments FOR DELETE 
USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- Team locations policies
CREATE POLICY "Users can view team locations from their shop" 
ON public.team_locations FOR SELECT 
USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert team locations for their shop" 
ON public.team_locations FOR INSERT 
WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update team locations from their shop" 
ON public.team_locations FOR UPDATE 
USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete team locations from their shop" 
ON public.team_locations FOR DELETE 
USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- Team certifications policies
CREATE POLICY "Users can view team certifications from their shop" 
ON public.team_certifications FOR SELECT 
USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert team certifications for their shop" 
ON public.team_certifications FOR INSERT 
WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update team certifications from their shop" 
ON public.team_certifications FOR UPDATE 
USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete team certifications from their shop" 
ON public.team_certifications FOR DELETE 
USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- Feedback categories policies
CREATE POLICY "Users can view feedback categories from their shop" 
ON public.feedback_categories FOR SELECT 
USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert feedback categories for their shop" 
ON public.feedback_categories FOR INSERT 
WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update feedback categories from their shop" 
ON public.feedback_categories FOR UPDATE 
USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete feedback categories from their shop" 
ON public.feedback_categories FOR DELETE 
USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- System alerts policies
CREATE POLICY "Users can view system alerts from their shop" 
ON public.system_alerts FOR SELECT 
USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert system alerts for their shop" 
ON public.system_alerts FOR INSERT 
WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update system alerts from their shop" 
ON public.system_alerts FOR UPDATE 
USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete system alerts from their shop" 
ON public.system_alerts FOR DELETE 
USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- Alert rules policies
CREATE POLICY "Users can view alert rules from their shop" 
ON public.alert_rules FOR SELECT 
USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert alert rules for their shop" 
ON public.alert_rules FOR INSERT 
WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update alert rules from their shop" 
ON public.alert_rules FOR UPDATE 
USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete alert rules from their shop" 
ON public.alert_rules FOR DELETE 
USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- Tool categories policies (public access)
CREATE POLICY "Everyone can view tool categories" 
ON public.tool_categories FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage tool categories" 
ON public.tool_categories FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Create update triggers
CREATE OR REPLACE FUNCTION public.update_call_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_call_logs_updated_at
  BEFORE UPDATE ON public.call_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_call_logs_updated_at();

CREATE OR REPLACE FUNCTION public.update_repair_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_repair_plans_updated_at
  BEFORE UPDATE ON public.repair_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_repair_plans_updated_at();

CREATE TRIGGER update_repair_plan_tasks_updated_at
  BEFORE UPDATE ON public.repair_plan_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_repair_plans_updated_at();

CREATE TRIGGER update_maintenance_schedules_updated_at
  BEFORE UPDATE ON public.maintenance_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_repair_plans_updated_at();

CREATE TRIGGER update_work_order_checklists_updated_at
  BEFORE UPDATE ON public.work_order_checklists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_repair_plans_updated_at();

CREATE TRIGGER update_checklist_items_updated_at
  BEFORE UPDATE ON public.checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_repair_plans_updated_at();

CREATE TRIGGER update_team_departments_updated_at
  BEFORE UPDATE ON public.team_departments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_repair_plans_updated_at();

CREATE TRIGGER update_team_locations_updated_at
  BEFORE UPDATE ON public.team_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_repair_plans_updated_at();

CREATE TRIGGER update_team_certifications_updated_at
  BEFORE UPDATE ON public.team_certifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_repair_plans_updated_at();

CREATE TRIGGER update_feedback_categories_updated_at
  BEFORE UPDATE ON public.feedback_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_repair_plans_updated_at();

CREATE TRIGGER update_system_alerts_updated_at
  BEFORE UPDATE ON public.system_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_repair_plans_updated_at();

CREATE TRIGGER update_alert_rules_updated_at
  BEFORE UPDATE ON public.alert_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_repair_plans_updated_at();

CREATE TRIGGER update_tool_categories_updated_at
  BEFORE UPDATE ON public.tool_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_repair_plans_updated_at();