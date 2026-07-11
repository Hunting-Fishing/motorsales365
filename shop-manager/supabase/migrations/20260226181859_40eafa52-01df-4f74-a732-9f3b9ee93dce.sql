
-- BATCH 3: Drop lingering USING(true) policies on tables that already have shop-scoped policies

-- diy_bay_rate_settings
DROP POLICY IF EXISTS "Users can view DIY bay rate settings" ON public.diy_bay_rate_settings;

-- diy_bay_rates
DROP POLICY IF EXISTS "Users can view DIY bay rates" ON public.diy_bay_rates;

-- equipment_categories
DROP POLICY IF EXISTS "Anyone can view equipment categories" ON public.equipment_categories;

-- feedback_forms
DROP POLICY IF EXISTS "Shop staff can manage feedback forms" ON public.feedback_forms;

-- fuel_delivery_compartment_history
DROP POLICY IF EXISTS "Users can view compartment history for their shop" ON public.fuel_delivery_compartment_history;

-- fuel_delivery_equipment
DROP POLICY IF EXISTS "Users can delete fuel delivery equipment" ON public.fuel_delivery_equipment;
DROP POLICY IF EXISTS "Users can update fuel delivery equipment" ON public.fuel_delivery_equipment;
DROP POLICY IF EXISTS "Users can view fuel delivery equipment" ON public.fuel_delivery_equipment;

-- fuel_delivery_equipment_filters
DROP POLICY IF EXISTS "Users can delete fuel delivery equipment filters" ON public.fuel_delivery_equipment_filters;
DROP POLICY IF EXISTS "Users can update fuel delivery equipment filters" ON public.fuel_delivery_equipment_filters;
DROP POLICY IF EXISTS "Users can view fuel delivery equipment filters" ON public.fuel_delivery_equipment_filters;

-- fuel_delivery_equipment_usage
DROP POLICY IF EXISTS "Users can delete fuel delivery equipment usage" ON public.fuel_delivery_equipment_usage;
DROP POLICY IF EXISTS "Users can update fuel delivery equipment usage" ON public.fuel_delivery_equipment_usage;
DROP POLICY IF EXISTS "Users can view fuel delivery equipment usage" ON public.fuel_delivery_equipment_usage;

-- fuel_delivery_hours
DROP POLICY IF EXISTS "Users can delete fuel delivery hours" ON public.fuel_delivery_hours;
DROP POLICY IF EXISTS "Users can update fuel delivery hours" ON public.fuel_delivery_hours;
DROP POLICY IF EXISTS "Users can view fuel delivery hours" ON public.fuel_delivery_hours;

-- fuel_delivery_labor_rates
DROP POLICY IF EXISTS "Users can delete fuel delivery labor rates" ON public.fuel_delivery_labor_rates;
DROP POLICY IF EXISTS "Users can update fuel delivery labor rates" ON public.fuel_delivery_labor_rates;
DROP POLICY IF EXISTS "Users can view fuel delivery labor rates" ON public.fuel_delivery_labor_rates;

-- fuel_delivery_quotes
DROP POLICY IF EXISTS "Users can delete quotes" ON public.fuel_delivery_quotes;
DROP POLICY IF EXISTS "Users can update quotes" ON public.fuel_delivery_quotes;
DROP POLICY IF EXISTS "Users can view quotes" ON public.fuel_delivery_quotes;

-- fuel_delivery_settings
DROP POLICY IF EXISTS "Users can update fuel delivery settings" ON public.fuel_delivery_settings;
DROP POLICY IF EXISTS "Users can view fuel delivery settings" ON public.fuel_delivery_settings;

-- fuel_delivery_special_rates
DROP POLICY IF EXISTS "Users can delete fuel delivery special rates" ON public.fuel_delivery_special_rates;
DROP POLICY IF EXISTS "Users can update fuel delivery special rates" ON public.fuel_delivery_special_rates;
DROP POLICY IF EXISTS "Users can view fuel delivery special rates" ON public.fuel_delivery_special_rates;

-- fuel_delivery_tank_fills
DROP POLICY IF EXISTS "Users can delete tank fills" ON public.fuel_delivery_tank_fills;
DROP POLICY IF EXISTS "Users can update tank fills" ON public.fuel_delivery_tank_fills;
DROP POLICY IF EXISTS "Users can view tank fills" ON public.fuel_delivery_tank_fills;

-- fuel_delivery_tank_readings
DROP POLICY IF EXISTS "Users can delete tank readings" ON public.fuel_delivery_tank_readings;
DROP POLICY IF EXISTS "Users can update tank readings" ON public.fuel_delivery_tank_readings;
DROP POLICY IF EXISTS "Users can view tank readings" ON public.fuel_delivery_tank_readings;

-- fuel_delivery_tanks
DROP POLICY IF EXISTS "Users can delete tanks" ON public.fuel_delivery_tanks;
DROP POLICY IF EXISTS "Users can update tanks" ON public.fuel_delivery_tanks;
DROP POLICY IF EXISTS "Users can view tanks" ON public.fuel_delivery_tanks;

-- fuel_delivery_tidy_tanks
DROP POLICY IF EXISTS "Users can delete tidy tanks" ON public.fuel_delivery_tidy_tanks;
DROP POLICY IF EXISTS "Users can update tidy tanks" ON public.fuel_delivery_tidy_tanks;
DROP POLICY IF EXISTS "Users can view tidy tanks" ON public.fuel_delivery_tidy_tanks;

-- fuel_delivery_zones
DROP POLICY IF EXISTS "Users can delete fuel delivery zones" ON public.fuel_delivery_zones;
DROP POLICY IF EXISTS "Users can update fuel delivery zones" ON public.fuel_delivery_zones;
DROP POLICY IF EXISTS "Users can view fuel delivery zones" ON public.fuel_delivery_zones;

-- gunsmith_job_part_orders
DROP POLICY IF EXISTS "Users can delete job part orders" ON public.gunsmith_job_part_orders;
DROP POLICY IF EXISTS "Users can update job part orders" ON public.gunsmith_job_part_orders;
DROP POLICY IF EXISTS "Users can view job part orders" ON public.gunsmith_job_part_orders;

-- gunsmith_roles
DROP POLICY IF EXISTS "Authenticated can read gunsmith_roles" ON public.gunsmith_roles;

-- gunsmith_settings
DROP POLICY IF EXISTS "Authenticated can read gunsmith_settings" ON public.gunsmith_settings;

-- gunsmith_team_members
DROP POLICY IF EXISTS "Authenticated can read gunsmith_team_members" ON public.gunsmith_team_members;

-- power_washing_communications
DROP POLICY IF EXISTS "Users can manage communications" ON public.power_washing_communications;

-- power_washing_properties
DROP POLICY IF EXISTS "Users can manage properties" ON public.power_washing_properties;

-- power_washing_subscriptions
DROP POLICY IF EXISTS "Users can manage subscriptions" ON public.power_washing_subscriptions;

-- shop_settings
DROP POLICY IF EXISTS "Users can view their shop settings" ON public.shop_settings;
DROP POLICY IF EXISTS "Anyone can view shop settings" ON public.shop_settings;
DROP POLICY IF EXISTS "Users can view shop settings" ON public.shop_settings;

-- shop_special_days
DROP POLICY IF EXISTS "Users can view shop special days" ON public.shop_special_days;
DROP POLICY IF EXISTS "Anyone can view shop special days" ON public.shop_special_days;

-- water_delivery_products
DROP POLICY IF EXISTS "Users can view water delivery products" ON public.water_delivery_products;

-- water_delivery_purchases
DROP POLICY IF EXISTS "Users can view water delivery purchases" ON public.water_delivery_purchases;

-- water_delivery_trucks
DROP POLICY IF EXISTS "Users can view water delivery trucks" ON public.water_delivery_trucks;
