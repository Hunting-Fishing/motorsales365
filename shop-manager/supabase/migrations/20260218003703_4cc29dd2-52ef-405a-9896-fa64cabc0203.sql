
-- =====================================================
-- BATCH 1: Fix permissive RLS policies on shop_id tables
-- Replace USING(true) with shop_id scoping via get_current_user_shop_id()
-- =====================================================

-- Helper: ensure the function exists
CREATE OR REPLACE FUNCTION public.get_current_user_shop_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT shop_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid() LIMIT 1;
$$;

-- =====================================================
-- WATER DELIVERY TABLES (33 tables)
-- =====================================================

-- water_delivery_customers
DROP POLICY IF EXISTS "Users can view water customers" ON public.water_delivery_customers;
DROP POLICY IF EXISTS "Users can insert water customers" ON public.water_delivery_customers;
DROP POLICY IF EXISTS "Users can update water customers" ON public.water_delivery_customers;
DROP POLICY IF EXISTS "Users can delete water customers" ON public.water_delivery_customers;
CREATE POLICY "Shop users can view water customers" ON public.water_delivery_customers FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert water customers" ON public.water_delivery_customers FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update water customers" ON public.water_delivery_customers FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete water customers" ON public.water_delivery_customers FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- water_delivery_orders
DROP POLICY IF EXISTS "Users can view water orders" ON public.water_delivery_orders;
DROP POLICY IF EXISTS "Users can insert water orders" ON public.water_delivery_orders;
DROP POLICY IF EXISTS "Users can update water orders" ON public.water_delivery_orders;
DROP POLICY IF EXISTS "Users can delete water orders" ON public.water_delivery_orders;
CREATE POLICY "Shop users can view water orders" ON public.water_delivery_orders FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert water orders" ON public.water_delivery_orders FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update water orders" ON public.water_delivery_orders FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete water orders" ON public.water_delivery_orders FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- water_delivery_invoices
DROP POLICY IF EXISTS "Users can view water invoices" ON public.water_delivery_invoices;
DROP POLICY IF EXISTS "Users can insert water invoices" ON public.water_delivery_invoices;
DROP POLICY IF EXISTS "Users can update water invoices" ON public.water_delivery_invoices;
DROP POLICY IF EXISTS "Users can delete water invoices" ON public.water_delivery_invoices;
CREATE POLICY "Shop users can view water invoices" ON public.water_delivery_invoices FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert water invoices" ON public.water_delivery_invoices FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update water invoices" ON public.water_delivery_invoices FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete water invoices" ON public.water_delivery_invoices FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- water_delivery_payments
DROP POLICY IF EXISTS "Users can view water payments" ON public.water_delivery_payments;
DROP POLICY IF EXISTS "Users can insert water payments" ON public.water_delivery_payments;
DROP POLICY IF EXISTS "Users can update water payments" ON public.water_delivery_payments;
DROP POLICY IF EXISTS "Users can delete water payments" ON public.water_delivery_payments;
CREATE POLICY "Shop users can view water payments" ON public.water_delivery_payments FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert water payments" ON public.water_delivery_payments FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update water payments" ON public.water_delivery_payments FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete water payments" ON public.water_delivery_payments FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- water_delivery_trucks
DROP POLICY IF EXISTS "Users can view water trucks" ON public.water_delivery_trucks;
DROP POLICY IF EXISTS "Users can insert water trucks" ON public.water_delivery_trucks;
DROP POLICY IF EXISTS "Users can update water trucks" ON public.water_delivery_trucks;
DROP POLICY IF EXISTS "Users can delete water trucks" ON public.water_delivery_trucks;
CREATE POLICY "Shop users can view water trucks" ON public.water_delivery_trucks FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert water trucks" ON public.water_delivery_trucks FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update water trucks" ON public.water_delivery_trucks FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete water trucks" ON public.water_delivery_trucks FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- water_delivery_drivers
DROP POLICY IF EXISTS "Users can view water drivers" ON public.water_delivery_drivers;
DROP POLICY IF EXISTS "Users can insert water drivers" ON public.water_delivery_drivers;
DROP POLICY IF EXISTS "Users can update water drivers" ON public.water_delivery_drivers;
DROP POLICY IF EXISTS "Users can delete water drivers" ON public.water_delivery_drivers;
CREATE POLICY "Shop users can view water drivers" ON public.water_delivery_drivers FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert water drivers" ON public.water_delivery_drivers FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update water drivers" ON public.water_delivery_drivers FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete water drivers" ON public.water_delivery_drivers FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- water_delivery_routes
DROP POLICY IF EXISTS "Users can view water routes" ON public.water_delivery_routes;
DROP POLICY IF EXISTS "Users can insert water routes" ON public.water_delivery_routes;
DROP POLICY IF EXISTS "Users can update water routes" ON public.water_delivery_routes;
DROP POLICY IF EXISTS "Users can delete water routes" ON public.water_delivery_routes;
CREATE POLICY "Shop users can view water routes" ON public.water_delivery_routes FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert water routes" ON public.water_delivery_routes FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update water routes" ON public.water_delivery_routes FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete water routes" ON public.water_delivery_routes FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- water_delivery_route_stops
DROP POLICY IF EXISTS "Users can view water route stops" ON public.water_delivery_route_stops;
DROP POLICY IF EXISTS "Users can insert water route stops" ON public.water_delivery_route_stops;
DROP POLICY IF EXISTS "Users can update water route stops" ON public.water_delivery_route_stops;
DROP POLICY IF EXISTS "Users can delete water route stops" ON public.water_delivery_route_stops;
CREATE POLICY "Shop users can view water route stops" ON public.water_delivery_route_stops FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert water route stops" ON public.water_delivery_route_stops FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update water route stops" ON public.water_delivery_route_stops FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete water route stops" ON public.water_delivery_route_stops FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- water_delivery_products
DROP POLICY IF EXISTS "Users can view water products" ON public.water_delivery_products;
DROP POLICY IF EXISTS "Users can insert water products" ON public.water_delivery_products;
DROP POLICY IF EXISTS "Users can update water products" ON public.water_delivery_products;
DROP POLICY IF EXISTS "Users can delete water products" ON public.water_delivery_products;
CREATE POLICY "Shop users can view water products" ON public.water_delivery_products FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert water products" ON public.water_delivery_products FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update water products" ON public.water_delivery_products FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete water products" ON public.water_delivery_products FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- water_delivery_tanks
DROP POLICY IF EXISTS "Users can view water tanks" ON public.water_delivery_tanks;
DROP POLICY IF EXISTS "Users can insert water tanks" ON public.water_delivery_tanks;
DROP POLICY IF EXISTS "Users can update water tanks" ON public.water_delivery_tanks;
DROP POLICY IF EXISTS "Users can delete water tanks" ON public.water_delivery_tanks;
CREATE POLICY "Shop users can view water tanks" ON public.water_delivery_tanks FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert water tanks" ON public.water_delivery_tanks FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update water tanks" ON public.water_delivery_tanks FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete water tanks" ON public.water_delivery_tanks FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- water_delivery_locations
DROP POLICY IF EXISTS "Users can view water locations" ON public.water_delivery_locations;
DROP POLICY IF EXISTS "Users can insert water locations" ON public.water_delivery_locations;
DROP POLICY IF EXISTS "Users can update water locations" ON public.water_delivery_locations;
DROP POLICY IF EXISTS "Users can delete water locations" ON public.water_delivery_locations;
CREATE POLICY "Shop users can view water locations" ON public.water_delivery_locations FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert water locations" ON public.water_delivery_locations FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update water locations" ON public.water_delivery_locations FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete water locations" ON public.water_delivery_locations FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- water_delivery_vehicles
DROP POLICY IF EXISTS "Users can view water vehicles" ON public.water_delivery_vehicles;
DROP POLICY IF EXISTS "Users can insert water vehicles" ON public.water_delivery_vehicles;
DROP POLICY IF EXISTS "Users can update water vehicles" ON public.water_delivery_vehicles;
DROP POLICY IF EXISTS "Users can delete water vehicles" ON public.water_delivery_vehicles;
CREATE POLICY "Shop users can view water vehicles" ON public.water_delivery_vehicles FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert water vehicles" ON public.water_delivery_vehicles FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update water vehicles" ON public.water_delivery_vehicles FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete water vehicles" ON public.water_delivery_vehicles FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- water_delivery_inventory
DROP POLICY IF EXISTS "Users can view water inventory" ON public.water_delivery_inventory;
DROP POLICY IF EXISTS "Users can insert water inventory" ON public.water_delivery_inventory;
DROP POLICY IF EXISTS "Users can update water inventory" ON public.water_delivery_inventory;
CREATE POLICY "Shop users can view water inventory" ON public.water_delivery_inventory FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert water inventory" ON public.water_delivery_inventory FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update water inventory" ON public.water_delivery_inventory FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- water_delivery_quotes
DROP POLICY IF EXISTS "Users can view water quotes" ON public.water_delivery_quotes;
DROP POLICY IF EXISTS "Users can insert water quotes" ON public.water_delivery_quotes;
DROP POLICY IF EXISTS "Users can update water quotes" ON public.water_delivery_quotes;
DROP POLICY IF EXISTS "Users can delete water quotes" ON public.water_delivery_quotes;
CREATE POLICY "Shop users can view water quotes" ON public.water_delivery_quotes FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert water quotes" ON public.water_delivery_quotes FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update water quotes" ON public.water_delivery_quotes FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete water quotes" ON public.water_delivery_quotes FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- water_delivery_settings
DROP POLICY IF EXISTS "Users can view water settings" ON public.water_delivery_settings;
DROP POLICY IF EXISTS "Users can insert water settings" ON public.water_delivery_settings;
DROP POLICY IF EXISTS "Users can update water settings" ON public.water_delivery_settings;
CREATE POLICY "Shop users can view water settings" ON public.water_delivery_settings FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert water settings" ON public.water_delivery_settings FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update water settings" ON public.water_delivery_settings FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- water_delivery_yards
DROP POLICY IF EXISTS "Users can view water yards" ON public.water_delivery_yards;
DROP POLICY IF EXISTS "Users can insert water yards" ON public.water_delivery_yards;
DROP POLICY IF EXISTS "Users can update water yards" ON public.water_delivery_yards;
DROP POLICY IF EXISTS "Users can delete water yards" ON public.water_delivery_yards;
CREATE POLICY "Shop users can view water yards" ON public.water_delivery_yards FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert water yards" ON public.water_delivery_yards FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update water yards" ON public.water_delivery_yards FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete water yards" ON public.water_delivery_yards FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- water_delivery_zones
DROP POLICY IF EXISTS "Users can view water zones" ON public.water_delivery_zones;
DROP POLICY IF EXISTS "Users can insert water zones" ON public.water_delivery_zones;
DROP POLICY IF EXISTS "Users can update water zones" ON public.water_delivery_zones;
DROP POLICY IF EXISTS "Users can delete water zones" ON public.water_delivery_zones;
CREATE POLICY "Shop users can view water zones" ON public.water_delivery_zones FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert water zones" ON public.water_delivery_zones FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update water zones" ON public.water_delivery_zones FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete water zones" ON public.water_delivery_zones FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- water_delivery_completions
DROP POLICY IF EXISTS "Users can view water completions" ON public.water_delivery_completions;
DROP POLICY IF EXISTS "Users can insert water completions" ON public.water_delivery_completions;
CREATE POLICY "Shop users can view water completions" ON public.water_delivery_completions FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert water completions" ON public.water_delivery_completions FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());

-- water_delivery_requests
DROP POLICY IF EXISTS "Users can view water requests" ON public.water_delivery_requests;
DROP POLICY IF EXISTS "Users can insert water requests" ON public.water_delivery_requests;
DROP POLICY IF EXISTS "Users can update water requests" ON public.water_delivery_requests;
CREATE POLICY "Shop users can view water requests" ON public.water_delivery_requests FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert water requests" ON public.water_delivery_requests FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update water requests" ON public.water_delivery_requests FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- water_delivery_purchases
DROP POLICY IF EXISTS "Users can view water purchases" ON public.water_delivery_purchases;
DROP POLICY IF EXISTS "Users can insert water purchases" ON public.water_delivery_purchases;
DROP POLICY IF EXISTS "Users can update water purchases" ON public.water_delivery_purchases;
CREATE POLICY "Shop users can view water purchases" ON public.water_delivery_purchases FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert water purchases" ON public.water_delivery_purchases FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update water purchases" ON public.water_delivery_purchases FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- water_delivery_hours
DROP POLICY IF EXISTS "Users can view water hours" ON public.water_delivery_hours;
DROP POLICY IF EXISTS "Users can insert water hours" ON public.water_delivery_hours;
DROP POLICY IF EXISTS "Users can update water hours" ON public.water_delivery_hours;
CREATE POLICY "Shop users can view water hours" ON public.water_delivery_hours FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert water hours" ON public.water_delivery_hours FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update water hours" ON public.water_delivery_hours FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- water_delivery_labor_rates
DROP POLICY IF EXISTS "Users can view water labor rates" ON public.water_delivery_labor_rates;
DROP POLICY IF EXISTS "Users can insert water labor rates" ON public.water_delivery_labor_rates;
DROP POLICY IF EXISTS "Users can update water labor rates" ON public.water_delivery_labor_rates;
DROP POLICY IF EXISTS "Users can delete water labor rates" ON public.water_delivery_labor_rates;
CREATE POLICY "Shop users can view water labor rates" ON public.water_delivery_labor_rates FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert water labor rates" ON public.water_delivery_labor_rates FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update water labor rates" ON public.water_delivery_labor_rates FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete water labor rates" ON public.water_delivery_labor_rates FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- water_delivery_special_rates
DROP POLICY IF EXISTS "Users can view water special rates" ON public.water_delivery_special_rates;
DROP POLICY IF EXISTS "Users can insert water special rates" ON public.water_delivery_special_rates;
DROP POLICY IF EXISTS "Users can update water special rates" ON public.water_delivery_special_rates;
DROP POLICY IF EXISTS "Users can delete water special rates" ON public.water_delivery_special_rates;
CREATE POLICY "Shop users can view water special rates" ON public.water_delivery_special_rates FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert water special rates" ON public.water_delivery_special_rates FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update water special rates" ON public.water_delivery_special_rates FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete water special rates" ON public.water_delivery_special_rates FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- water_delivery_price_history
DROP POLICY IF EXISTS "Users can view water price history" ON public.water_delivery_price_history;
DROP POLICY IF EXISTS "Users can insert water price history" ON public.water_delivery_price_history;
CREATE POLICY "Shop users can view water price history" ON public.water_delivery_price_history FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert water price history" ON public.water_delivery_price_history FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());

-- water_delivery_customer_vehicles
DROP POLICY IF EXISTS "Users can view water customer vehicles" ON public.water_delivery_customer_vehicles;
DROP POLICY IF EXISTS "Users can insert water customer vehicles" ON public.water_delivery_customer_vehicles;
DROP POLICY IF EXISTS "Users can update water customer vehicles" ON public.water_delivery_customer_vehicles;
DROP POLICY IF EXISTS "Users can delete water customer vehicles" ON public.water_delivery_customer_vehicles;
CREATE POLICY "Shop users can view water customer vehicles" ON public.water_delivery_customer_vehicles FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert water customer vehicles" ON public.water_delivery_customer_vehicles FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update water customer vehicles" ON public.water_delivery_customer_vehicles FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete water customer vehicles" ON public.water_delivery_customer_vehicles FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- water_delivery_tank_fills
DROP POLICY IF EXISTS "Users can view water tank fills" ON public.water_delivery_tank_fills;
DROP POLICY IF EXISTS "Users can insert water tank fills" ON public.water_delivery_tank_fills;
CREATE POLICY "Shop users can view water tank fills" ON public.water_delivery_tank_fills FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert water tank fills" ON public.water_delivery_tank_fills FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());

-- water_delivery_tank_readings
DROP POLICY IF EXISTS "Users can view water tank readings" ON public.water_delivery_tank_readings;
DROP POLICY IF EXISTS "Users can insert water tank readings" ON public.water_delivery_tank_readings;
CREATE POLICY "Shop users can view water tank readings" ON public.water_delivery_tank_readings FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert water tank readings" ON public.water_delivery_tank_readings FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());

-- water_delivery_tidy_tanks
DROP POLICY IF EXISTS "Users can view water tidy tanks" ON public.water_delivery_tidy_tanks;
DROP POLICY IF EXISTS "Users can insert water tidy tanks" ON public.water_delivery_tidy_tanks;
DROP POLICY IF EXISTS "Users can update water tidy tanks" ON public.water_delivery_tidy_tanks;
DROP POLICY IF EXISTS "Users can delete water tidy tanks" ON public.water_delivery_tidy_tanks;
CREATE POLICY "Shop users can view water tidy tanks" ON public.water_delivery_tidy_tanks FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert water tidy tanks" ON public.water_delivery_tidy_tanks FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update water tidy tanks" ON public.water_delivery_tidy_tanks FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete water tidy tanks" ON public.water_delivery_tidy_tanks FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- water_delivery_truck_compartments
DROP POLICY IF EXISTS "Users can view water truck compartments" ON public.water_delivery_truck_compartments;
DROP POLICY IF EXISTS "Users can insert water truck compartments" ON public.water_delivery_truck_compartments;
DROP POLICY IF EXISTS "Users can update water truck compartments" ON public.water_delivery_truck_compartments;
DROP POLICY IF EXISTS "Users can delete water truck compartments" ON public.water_delivery_truck_compartments;
CREATE POLICY "Shop users can view water truck compartments" ON public.water_delivery_truck_compartments FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert water truck compartments" ON public.water_delivery_truck_compartments FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update water truck compartments" ON public.water_delivery_truck_compartments FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete water truck compartments" ON public.water_delivery_truck_compartments FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- water_delivery_compartment_history
DROP POLICY IF EXISTS "Users can view water compartment history" ON public.water_delivery_compartment_history;
DROP POLICY IF EXISTS "Users can insert water compartment history" ON public.water_delivery_compartment_history;
CREATE POLICY "Shop users can view water compartment history" ON public.water_delivery_compartment_history FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert water compartment history" ON public.water_delivery_compartment_history FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());

-- water_delivery_equipment
DROP POLICY IF EXISTS "Users can view water equipment" ON public.water_delivery_equipment;
DROP POLICY IF EXISTS "Users can insert water equipment" ON public.water_delivery_equipment;
DROP POLICY IF EXISTS "Users can update water equipment" ON public.water_delivery_equipment;
DROP POLICY IF EXISTS "Users can delete water equipment" ON public.water_delivery_equipment;
CREATE POLICY "Shop users can view water equipment" ON public.water_delivery_equipment FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert water equipment" ON public.water_delivery_equipment FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update water equipment" ON public.water_delivery_equipment FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete water equipment" ON public.water_delivery_equipment FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- water_delivery_equipment_filters
DROP POLICY IF EXISTS "Users can view water filters" ON public.water_delivery_equipment_filters;
DROP POLICY IF EXISTS "Users can insert water filters" ON public.water_delivery_equipment_filters;
DROP POLICY IF EXISTS "Users can update water filters" ON public.water_delivery_equipment_filters;
DROP POLICY IF EXISTS "Users can delete water filters" ON public.water_delivery_equipment_filters;
CREATE POLICY "Shop users can view water filters" ON public.water_delivery_equipment_filters FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert water filters" ON public.water_delivery_equipment_filters FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update water filters" ON public.water_delivery_equipment_filters FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete water filters" ON public.water_delivery_equipment_filters FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- water_delivery_equipment_usage
DROP POLICY IF EXISTS "Users can view water equipment usage" ON public.water_delivery_equipment_usage;
DROP POLICY IF EXISTS "Users can insert water equipment usage" ON public.water_delivery_equipment_usage;
CREATE POLICY "Shop users can view water equipment usage" ON public.water_delivery_equipment_usage FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert water equipment usage" ON public.water_delivery_equipment_usage FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());

-- =====================================================
-- FUEL DELIVERY TABLES
-- =====================================================

-- fuel_delivery_compartment_history
DROP POLICY IF EXISTS "Users can view fuel compartment history" ON public.fuel_delivery_compartment_history;
DROP POLICY IF EXISTS "Users can insert fuel compartment history" ON public.fuel_delivery_compartment_history;
CREATE POLICY "Shop users can view fuel compartment history" ON public.fuel_delivery_compartment_history FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert fuel compartment history" ON public.fuel_delivery_compartment_history FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());

-- fuel_delivery_equipment
DROP POLICY IF EXISTS "Users can view fuel equipment" ON public.fuel_delivery_equipment;
DROP POLICY IF EXISTS "Users can insert fuel equipment" ON public.fuel_delivery_equipment;
DROP POLICY IF EXISTS "Users can update fuel equipment" ON public.fuel_delivery_equipment;
DROP POLICY IF EXISTS "Users can delete fuel equipment" ON public.fuel_delivery_equipment;
CREATE POLICY "Shop users can view fuel equipment" ON public.fuel_delivery_equipment FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert fuel equipment" ON public.fuel_delivery_equipment FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update fuel equipment" ON public.fuel_delivery_equipment FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete fuel equipment" ON public.fuel_delivery_equipment FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- fuel_delivery_equipment_filters
DROP POLICY IF EXISTS "Users can view fuel filters" ON public.fuel_delivery_equipment_filters;
DROP POLICY IF EXISTS "Users can insert fuel filters" ON public.fuel_delivery_equipment_filters;
DROP POLICY IF EXISTS "Users can update fuel filters" ON public.fuel_delivery_equipment_filters;
DROP POLICY IF EXISTS "Users can delete fuel filters" ON public.fuel_delivery_equipment_filters;
CREATE POLICY "Shop users can view fuel filters" ON public.fuel_delivery_equipment_filters FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert fuel filters" ON public.fuel_delivery_equipment_filters FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update fuel filters" ON public.fuel_delivery_equipment_filters FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete fuel filters" ON public.fuel_delivery_equipment_filters FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- fuel_delivery_equipment_usage
DROP POLICY IF EXISTS "Users can view fuel equipment usage" ON public.fuel_delivery_equipment_usage;
DROP POLICY IF EXISTS "Users can insert fuel equipment usage" ON public.fuel_delivery_equipment_usage;
CREATE POLICY "Shop users can view fuel equipment usage" ON public.fuel_delivery_equipment_usage FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert fuel equipment usage" ON public.fuel_delivery_equipment_usage FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());

-- fuel_delivery_hours
DROP POLICY IF EXISTS "Users can view fuel hours" ON public.fuel_delivery_hours;
DROP POLICY IF EXISTS "Users can insert fuel hours" ON public.fuel_delivery_hours;
DROP POLICY IF EXISTS "Users can update fuel hours" ON public.fuel_delivery_hours;
CREATE POLICY "Shop users can view fuel hours" ON public.fuel_delivery_hours FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert fuel hours" ON public.fuel_delivery_hours FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update fuel hours" ON public.fuel_delivery_hours FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- fuel_delivery_labor_rates
DROP POLICY IF EXISTS "Users can view fuel labor rates" ON public.fuel_delivery_labor_rates;
DROP POLICY IF EXISTS "Users can insert fuel labor rates" ON public.fuel_delivery_labor_rates;
DROP POLICY IF EXISTS "Users can update fuel labor rates" ON public.fuel_delivery_labor_rates;
DROP POLICY IF EXISTS "Users can delete fuel labor rates" ON public.fuel_delivery_labor_rates;
CREATE POLICY "Shop users can view fuel labor rates" ON public.fuel_delivery_labor_rates FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert fuel labor rates" ON public.fuel_delivery_labor_rates FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update fuel labor rates" ON public.fuel_delivery_labor_rates FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete fuel labor rates" ON public.fuel_delivery_labor_rates FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- fuel_delivery_quotes
DROP POLICY IF EXISTS "Users can view fuel quotes" ON public.fuel_delivery_quotes;
DROP POLICY IF EXISTS "Users can insert fuel quotes" ON public.fuel_delivery_quotes;
DROP POLICY IF EXISTS "Users can update fuel quotes" ON public.fuel_delivery_quotes;
DROP POLICY IF EXISTS "Users can delete fuel quotes" ON public.fuel_delivery_quotes;
CREATE POLICY "Shop users can view fuel quotes" ON public.fuel_delivery_quotes FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert fuel quotes" ON public.fuel_delivery_quotes FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update fuel quotes" ON public.fuel_delivery_quotes FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete fuel quotes" ON public.fuel_delivery_quotes FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- fuel_delivery_settings
DROP POLICY IF EXISTS "Users can view fuel settings" ON public.fuel_delivery_settings;
DROP POLICY IF EXISTS "Users can insert fuel settings" ON public.fuel_delivery_settings;
DROP POLICY IF EXISTS "Users can update fuel settings" ON public.fuel_delivery_settings;
CREATE POLICY "Shop users can view fuel settings" ON public.fuel_delivery_settings FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert fuel settings" ON public.fuel_delivery_settings FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update fuel settings" ON public.fuel_delivery_settings FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- fuel_delivery_special_rates
DROP POLICY IF EXISTS "Users can view fuel special rates" ON public.fuel_delivery_special_rates;
DROP POLICY IF EXISTS "Users can insert fuel special rates" ON public.fuel_delivery_special_rates;
DROP POLICY IF EXISTS "Users can update fuel special rates" ON public.fuel_delivery_special_rates;
DROP POLICY IF EXISTS "Users can delete fuel special rates" ON public.fuel_delivery_special_rates;
CREATE POLICY "Shop users can view fuel special rates" ON public.fuel_delivery_special_rates FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert fuel special rates" ON public.fuel_delivery_special_rates FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update fuel special rates" ON public.fuel_delivery_special_rates FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete fuel special rates" ON public.fuel_delivery_special_rates FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- fuel_delivery_tank_fills
DROP POLICY IF EXISTS "Users can view fuel tank fills" ON public.fuel_delivery_tank_fills;
DROP POLICY IF EXISTS "Users can insert fuel tank fills" ON public.fuel_delivery_tank_fills;
CREATE POLICY "Shop users can view fuel tank fills" ON public.fuel_delivery_tank_fills FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert fuel tank fills" ON public.fuel_delivery_tank_fills FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());

-- fuel_delivery_tank_readings
DROP POLICY IF EXISTS "Users can view fuel tank readings" ON public.fuel_delivery_tank_readings;
DROP POLICY IF EXISTS "Users can insert fuel tank readings" ON public.fuel_delivery_tank_readings;
CREATE POLICY "Shop users can view fuel tank readings" ON public.fuel_delivery_tank_readings FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert fuel tank readings" ON public.fuel_delivery_tank_readings FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());

-- fuel_delivery_tanks
DROP POLICY IF EXISTS "Users can view fuel tanks" ON public.fuel_delivery_tanks;
DROP POLICY IF EXISTS "Users can insert fuel tanks" ON public.fuel_delivery_tanks;
DROP POLICY IF EXISTS "Users can update fuel tanks" ON public.fuel_delivery_tanks;
DROP POLICY IF EXISTS "Users can delete fuel tanks" ON public.fuel_delivery_tanks;
CREATE POLICY "Shop users can view fuel tanks" ON public.fuel_delivery_tanks FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert fuel tanks" ON public.fuel_delivery_tanks FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update fuel tanks" ON public.fuel_delivery_tanks FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete fuel tanks" ON public.fuel_delivery_tanks FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- fuel_delivery_tidy_tanks
DROP POLICY IF EXISTS "Users can view fuel tidy tanks" ON public.fuel_delivery_tidy_tanks;
DROP POLICY IF EXISTS "Users can insert fuel tidy tanks" ON public.fuel_delivery_tidy_tanks;
DROP POLICY IF EXISTS "Users can update fuel tidy tanks" ON public.fuel_delivery_tidy_tanks;
DROP POLICY IF EXISTS "Users can delete fuel tidy tanks" ON public.fuel_delivery_tidy_tanks;
CREATE POLICY "Shop users can view fuel tidy tanks" ON public.fuel_delivery_tidy_tanks FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert fuel tidy tanks" ON public.fuel_delivery_tidy_tanks FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update fuel tidy tanks" ON public.fuel_delivery_tidy_tanks FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete fuel tidy tanks" ON public.fuel_delivery_tidy_tanks FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- fuel_delivery_zones
DROP POLICY IF EXISTS "Users can view fuel zones" ON public.fuel_delivery_zones;
DROP POLICY IF EXISTS "Users can insert fuel zones" ON public.fuel_delivery_zones;
DROP POLICY IF EXISTS "Users can update fuel zones" ON public.fuel_delivery_zones;
DROP POLICY IF EXISTS "Users can delete fuel zones" ON public.fuel_delivery_zones;
CREATE POLICY "Shop users can view fuel zones" ON public.fuel_delivery_zones FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert fuel zones" ON public.fuel_delivery_zones FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update fuel zones" ON public.fuel_delivery_zones FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete fuel zones" ON public.fuel_delivery_zones FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- =====================================================
-- GUNSMITH TABLES
-- =====================================================

-- gunsmith_job_part_orders
DROP POLICY IF EXISTS "Users can view gunsmith part orders" ON public.gunsmith_job_part_orders;
DROP POLICY IF EXISTS "Users can insert gunsmith part orders" ON public.gunsmith_job_part_orders;
DROP POLICY IF EXISTS "Users can update gunsmith part orders" ON public.gunsmith_job_part_orders;
DROP POLICY IF EXISTS "Users can delete gunsmith part orders" ON public.gunsmith_job_part_orders;
CREATE POLICY "Shop users can view gunsmith part orders" ON public.gunsmith_job_part_orders FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert gunsmith part orders" ON public.gunsmith_job_part_orders FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update gunsmith part orders" ON public.gunsmith_job_part_orders FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete gunsmith part orders" ON public.gunsmith_job_part_orders FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- gunsmith_roles
DROP POLICY IF EXISTS "Users can view gunsmith roles" ON public.gunsmith_roles;
DROP POLICY IF EXISTS "Users can manage gunsmith roles" ON public.gunsmith_roles;
CREATE POLICY "Shop users can view gunsmith roles" ON public.gunsmith_roles FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can manage gunsmith roles" ON public.gunsmith_roles FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());

-- gunsmith_settings
DROP POLICY IF EXISTS "Users can view gunsmith settings" ON public.gunsmith_settings;
DROP POLICY IF EXISTS "Users can insert gunsmith settings" ON public.gunsmith_settings;
DROP POLICY IF EXISTS "Users can update gunsmith settings" ON public.gunsmith_settings;
CREATE POLICY "Shop users can view gunsmith settings" ON public.gunsmith_settings FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert gunsmith settings" ON public.gunsmith_settings FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update gunsmith settings" ON public.gunsmith_settings FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- gunsmith_team_members
DROP POLICY IF EXISTS "Users can view gunsmith team" ON public.gunsmith_team_members;
DROP POLICY IF EXISTS "Users can manage gunsmith team" ON public.gunsmith_team_members;
CREATE POLICY "Shop users can view gunsmith team" ON public.gunsmith_team_members FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can manage gunsmith team" ON public.gunsmith_team_members FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());

-- =====================================================
-- POWER WASHING TABLES
-- =====================================================

-- power_washing_communications
DROP POLICY IF EXISTS "Users can view power washing communications" ON public.power_washing_communications;
DROP POLICY IF EXISTS "Users can insert power washing communications" ON public.power_washing_communications;
CREATE POLICY "Shop users can view pw communications" ON public.power_washing_communications FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert pw communications" ON public.power_washing_communications FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());

-- power_washing_properties
DROP POLICY IF EXISTS "Users can view power washing properties" ON public.power_washing_properties;
DROP POLICY IF EXISTS "Users can insert power washing properties" ON public.power_washing_properties;
DROP POLICY IF EXISTS "Users can update power washing properties" ON public.power_washing_properties;
DROP POLICY IF EXISTS "Users can delete power washing properties" ON public.power_washing_properties;
CREATE POLICY "Shop users can view pw properties" ON public.power_washing_properties FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert pw properties" ON public.power_washing_properties FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update pw properties" ON public.power_washing_properties FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete pw properties" ON public.power_washing_properties FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- power_washing_quotes
DROP POLICY IF EXISTS "Users can view power washing quotes" ON public.power_washing_quotes;
DROP POLICY IF EXISTS "Users can insert power washing quotes" ON public.power_washing_quotes;
DROP POLICY IF EXISTS "Users can update power washing quotes" ON public.power_washing_quotes;
DROP POLICY IF EXISTS "Users can delete power washing quotes" ON public.power_washing_quotes;
CREATE POLICY "Shop users can view pw quotes" ON public.power_washing_quotes FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert pw quotes" ON public.power_washing_quotes FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update pw quotes" ON public.power_washing_quotes FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete pw quotes" ON public.power_washing_quotes FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- power_washing_subscriptions
DROP POLICY IF EXISTS "Users can view power washing subscriptions" ON public.power_washing_subscriptions;
DROP POLICY IF EXISTS "Users can insert power washing subscriptions" ON public.power_washing_subscriptions;
DROP POLICY IF EXISTS "Users can update power washing subscriptions" ON public.power_washing_subscriptions;
DROP POLICY IF EXISTS "Users can delete power washing subscriptions" ON public.power_washing_subscriptions;
CREATE POLICY "Shop users can view pw subscriptions" ON public.power_washing_subscriptions FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert pw subscriptions" ON public.power_washing_subscriptions FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update pw subscriptions" ON public.power_washing_subscriptions FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete pw subscriptions" ON public.power_washing_subscriptions FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- =====================================================
-- SHARED / OTHER CRITICAL TABLES
-- =====================================================

-- shop_settings
DROP POLICY IF EXISTS "Users can view shop settings" ON public.shop_settings;
DROP POLICY IF EXISTS "Users can insert shop settings" ON public.shop_settings;
DROP POLICY IF EXISTS "Users can update shop settings" ON public.shop_settings;
CREATE POLICY "Shop users can view shop settings" ON public.shop_settings FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert shop settings" ON public.shop_settings FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update shop settings" ON public.shop_settings FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- shop_hours
DROP POLICY IF EXISTS "Users can view shop hours" ON public.shop_hours;
DROP POLICY IF EXISTS "Users can insert shop hours" ON public.shop_hours;
DROP POLICY IF EXISTS "Users can update shop hours" ON public.shop_hours;
DROP POLICY IF EXISTS "Users can delete shop hours" ON public.shop_hours;
CREATE POLICY "Shop users can view shop hours" ON public.shop_hours FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert shop hours" ON public.shop_hours FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update shop hours" ON public.shop_hours FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete shop hours" ON public.shop_hours FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- shop_special_days
DROP POLICY IF EXISTS "Users can view special days" ON public.shop_special_days;
DROP POLICY IF EXISTS "Users can insert special days" ON public.shop_special_days;
DROP POLICY IF EXISTS "Users can update special days" ON public.shop_special_days;
DROP POLICY IF EXISTS "Users can delete special days" ON public.shop_special_days;
CREATE POLICY "Shop users can view special days" ON public.shop_special_days FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert special days" ON public.shop_special_days FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update special days" ON public.shop_special_days FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete special days" ON public.shop_special_days FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- notification_templates
DROP POLICY IF EXISTS "Users can view notification templates" ON public.notification_templates;
DROP POLICY IF EXISTS "Users can insert notification templates" ON public.notification_templates;
DROP POLICY IF EXISTS "Users can update notification templates" ON public.notification_templates;
DROP POLICY IF EXISTS "Users can delete notification templates" ON public.notification_templates;
CREATE POLICY "Shop users can view notification templates" ON public.notification_templates FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert notification templates" ON public.notification_templates FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update notification templates" ON public.notification_templates FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete notification templates" ON public.notification_templates FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- email_sequences
DROP POLICY IF EXISTS "Users can view email sequences" ON public.email_sequences;
DROP POLICY IF EXISTS "Users can insert email sequences" ON public.email_sequences;
DROP POLICY IF EXISTS "Users can update email sequences" ON public.email_sequences;
DROP POLICY IF EXISTS "Users can delete email sequences" ON public.email_sequences;
CREATE POLICY "Shop users can view email sequences" ON public.email_sequences FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert email sequences" ON public.email_sequences FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update email sequences" ON public.email_sequences FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete email sequences" ON public.email_sequences FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- equipment_categories
DROP POLICY IF EXISTS "Users can view equipment categories" ON public.equipment_categories;
DROP POLICY IF EXISTS "Users can insert equipment categories" ON public.equipment_categories;
DROP POLICY IF EXISTS "Users can update equipment categories" ON public.equipment_categories;
DROP POLICY IF EXISTS "Users can delete equipment categories" ON public.equipment_categories;
CREATE POLICY "Shop users can view equipment categories" ON public.equipment_categories FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert equipment categories" ON public.equipment_categories FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update equipment categories" ON public.equipment_categories FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete equipment categories" ON public.equipment_categories FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- inspection_form_templates
DROP POLICY IF EXISTS "Users can view inspection templates" ON public.inspection_form_templates;
DROP POLICY IF EXISTS "Users can insert inspection templates" ON public.inspection_form_templates;
DROP POLICY IF EXISTS "Users can update inspection templates" ON public.inspection_form_templates;
DROP POLICY IF EXISTS "Users can delete inspection templates" ON public.inspection_form_templates;
CREATE POLICY "Shop users can view inspection templates" ON public.inspection_form_templates FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert inspection templates" ON public.inspection_form_templates FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update inspection templates" ON public.inspection_form_templates FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete inspection templates" ON public.inspection_form_templates FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- maintenance_budgets
DROP POLICY IF EXISTS "Users can view maintenance budgets" ON public.maintenance_budgets;
DROP POLICY IF EXISTS "Users can insert maintenance budgets" ON public.maintenance_budgets;
DROP POLICY IF EXISTS "Users can update maintenance budgets" ON public.maintenance_budgets;
DROP POLICY IF EXISTS "Users can delete maintenance budgets" ON public.maintenance_budgets;
CREATE POLICY "Shop users can view maintenance budgets" ON public.maintenance_budgets FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert maintenance budgets" ON public.maintenance_budgets FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update maintenance budgets" ON public.maintenance_budgets FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete maintenance budgets" ON public.maintenance_budgets FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- module_work_types
DROP POLICY IF EXISTS "Users can view module work types" ON public.module_work_types;
DROP POLICY IF EXISTS "Users can insert module work types" ON public.module_work_types;
DROP POLICY IF EXISTS "Users can update module work types" ON public.module_work_types;
DROP POLICY IF EXISTS "Users can delete module work types" ON public.module_work_types;
CREATE POLICY "Shop users can view module work types" ON public.module_work_types FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert module work types" ON public.module_work_types FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update module work types" ON public.module_work_types FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete module work types" ON public.module_work_types FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- schedule_notifications
DROP POLICY IF EXISTS "Users can view schedule notifications" ON public.schedule_notifications;
DROP POLICY IF EXISTS "Users can insert schedule notifications" ON public.schedule_notifications;
DROP POLICY IF EXISTS "Users can update schedule notifications" ON public.schedule_notifications;
CREATE POLICY "Shop users can view schedule notifications" ON public.schedule_notifications FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert schedule notifications" ON public.schedule_notifications FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update schedule notifications" ON public.schedule_notifications FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- customer_uploaded_forms
DROP POLICY IF EXISTS "Users can view customer uploaded forms" ON public.customer_uploaded_forms;
DROP POLICY IF EXISTS "Users can insert customer uploaded forms" ON public.customer_uploaded_forms;
DROP POLICY IF EXISTS "Users can update customer uploaded forms" ON public.customer_uploaded_forms;
DROP POLICY IF EXISTS "Users can delete customer uploaded forms" ON public.customer_uploaded_forms;
CREATE POLICY "Shop users can view customer uploaded forms" ON public.customer_uploaded_forms FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert customer uploaded forms" ON public.customer_uploaded_forms FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update customer uploaded forms" ON public.customer_uploaded_forms FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete customer uploaded forms" ON public.customer_uploaded_forms FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- feedback_forms
DROP POLICY IF EXISTS "Users can view feedback forms" ON public.feedback_forms;
DROP POLICY IF EXISTS "Users can insert feedback forms" ON public.feedback_forms;
DROP POLICY IF EXISTS "Users can update feedback forms" ON public.feedback_forms;
CREATE POLICY "Shop users can view feedback forms" ON public.feedback_forms FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert feedback forms" ON public.feedback_forms FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update feedback forms" ON public.feedback_forms FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- public_applications
DROP POLICY IF EXISTS "Users can view applications" ON public.public_applications;
DROP POLICY IF EXISTS "Users can insert applications" ON public.public_applications;
DROP POLICY IF EXISTS "Users can update applications" ON public.public_applications;
CREATE POLICY "Shop users can view applications" ON public.public_applications FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert applications" ON public.public_applications FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update applications" ON public.public_applications FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- work_type_requests
DROP POLICY IF EXISTS "Users can view work type requests" ON public.work_type_requests;
DROP POLICY IF EXISTS "Users can insert work type requests" ON public.work_type_requests;
DROP POLICY IF EXISTS "Users can update work type requests" ON public.work_type_requests;
CREATE POLICY "Shop users can view work type requests" ON public.work_type_requests FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert work type requests" ON public.work_type_requests FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update work type requests" ON public.work_type_requests FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- diy_bay_rate_settings
DROP POLICY IF EXISTS "Allow authenticated users to select rate settings" ON public.diy_bay_rate_settings;
DROP POLICY IF EXISTS "Allow authenticated users to insert rate settings" ON public.diy_bay_rate_settings;
DROP POLICY IF EXISTS "Allow authenticated users to update rate settings" ON public.diy_bay_rate_settings;
CREATE POLICY "Shop users can view diy bay rate settings" ON public.diy_bay_rate_settings FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert diy bay rate settings" ON public.diy_bay_rate_settings FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update diy bay rate settings" ON public.diy_bay_rate_settings FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- diy_bay_rates
DROP POLICY IF EXISTS "Allow authenticated users to select rates" ON public.diy_bay_rates;
DROP POLICY IF EXISTS "Allow authenticated users to insert rates" ON public.diy_bay_rates;
DROP POLICY IF EXISTS "Allow authenticated users to update rates" ON public.diy_bay_rates;
DROP POLICY IF EXISTS "Allow authenticated users to delete rates" ON public.diy_bay_rates;
CREATE POLICY "Shop users can view diy bay rates" ON public.diy_bay_rates FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert diy bay rates" ON public.diy_bay_rates FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can update diy bay rates" ON public.diy_bay_rates FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can delete diy bay rates" ON public.diy_bay_rates FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- api_usage_logs
DROP POLICY IF EXISTS "Service role can insert usage logs" ON public.api_usage_logs;
CREATE POLICY "Shop users can view api usage logs" ON public.api_usage_logs FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can insert api usage logs" ON public.api_usage_logs FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());

-- api_usage_summary
DROP POLICY IF EXISTS "Service role can manage usage summaries" ON public.api_usage_summary;
CREATE POLICY "Shop users can view api usage summary" ON public.api_usage_summary FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Shop users can manage api usage summary" ON public.api_usage_summary FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());
