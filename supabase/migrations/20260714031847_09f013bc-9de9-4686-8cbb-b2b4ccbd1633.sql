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