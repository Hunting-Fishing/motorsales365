-- Shop Manager isolated schema import (chunk 01/10: schema + enums + sequences)
CREATE SCHEMA IF NOT EXISTS shop_manager;
GRANT USAGE ON SCHEMA shop_manager TO authenticated, service_role, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA shop_manager GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA shop_manager GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA shop_manager GRANT USAGE, SELECT ON SEQUENCES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA shop_manager GRANT EXECUTE ON FUNCTIONS TO authenticated, service_role;

CREATE TYPE shop_manager.app_role AS ENUM ('owner', 'admin', 'manager', 'parts_manager', 'service_advisor', 'technician', 'reception', 'other_staff', 'customer', 'marketing', 'deckhand', 'boson', 'mate', 'captain', 'chief_engineer', 'marine_engineer', 'fishing_master', 'crane_operator', 'rigger', 'diver', 'dispatch', 'truck_driver', 'office_admin', 'operations_manager', 'yard', 'yard_manager', 'welder', 'mechanic_manager', 'yard_manager_assistant', 'mechanic_manager_assistant', 'developer');
CREATE TYPE shop_manager.approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE shop_manager.equipment_status AS ENUM ('operational', 'maintenance', 'down', 'retired');
CREATE TYPE shop_manager.equipment_type AS ENUM ('marine', 'forklift', 'semi', 'small_engine', 'other', 'fleet_vehicle', 'courtesy_car', 'rental_vehicle', 'service_vehicle', 'heavy_truck', 'excavator', 'loader', 'dozer', 'crane', 'vessel', 'outboard', 'diagnostic', 'lifting', 'air_tools', 'hand_tools', 'electrical', 'generator', 'fire_extinguisher', 'life_raft', 'life_ring', 'epirb', 'survival_suit', 'flare', 'first_aid_kit', 'safety_harness', 'life_jacket', 'immersion_suit', 'fuel_truck');
CREATE TYPE shop_manager.forklift_item_status AS ENUM ('good', 'attention', 'bad', 'na');
CREATE TYPE shop_manager.form_field_type AS ENUM ('text', 'textarea', 'number', 'select', 'checkbox', 'radio', 'date', 'email', 'phone', 'file', 'signature');
CREATE TYPE shop_manager.gunsmith_role_type AS ENUM ('shop_owner', 'master_gunsmith', 'gunsmith', 'apprentice', 'counter_staff', 'parts_manager', 'manager', 'sales', 'reception', 'shipping');
CREATE TYPE shop_manager.job_line_status AS ENUM ('pending', 'signed-onto-task', 'in-progress', 'waiting-for-parts', 'paused', 'awaiting-approval', 'quality-check', 'completed', 'on-hold', 'ready-for-delivery', 'needs-road-test', 'tech-support', 'warranty', 'sublet', 'customer-auth-required', 'parts-ordered', 'parts-arrived', 'rework-required');
CREATE TYPE shop_manager.maintenance_request_status AS ENUM ('pending', 'approved', 'in_progress', 'completed', 'rejected');
CREATE TYPE shop_manager.permission_type AS ENUM ('create', 'read', 'update', 'delete');
CREATE TYPE shop_manager.product_type AS ENUM ('affiliate', 'suggested');
CREATE TYPE shop_manager.report_type AS ENUM ('daily', 'weekly', 'monthly');
CREATE TYPE shop_manager.resource_type AS ENUM ('users', 'roles', 'settings', 'billing', 'work_orders', 'inventory', 'appointments', 'reports', 'customers');
CREATE TYPE shop_manager.role_action_type AS ENUM ('added', 'removed', 'modified');
CREATE TYPE shop_manager.tool_condition AS ENUM ('new', 'excellent', 'good', 'fair', 'poor', 'unusable');
CREATE TYPE shop_manager.tool_status AS ENUM ('available', 'in_use', 'maintenance', 'broken', 'lost', 'retired');
CREATE TYPE shop_manager.welding_ap_status AS ENUM ('pending', 'partial', 'paid');
CREATE TYPE shop_manager.welding_customer_interaction_type AS ENUM ('email', 'phone_call', 'site_visit', 'quote_request', 'deposit', 'payment', 'follow_up', 'conversation', 'other');
CREATE TYPE shop_manager.welding_invoice_status AS ENUM ('draft', 'sent', 'unpaid', 'partial', 'paid', 'overdue');
CREATE TYPE shop_manager.welding_po_status AS ENUM ('draft', 'ordered', 'shipped', 'received', 'cancelled');
CREATE TYPE shop_manager.welding_quote_status AS ENUM ('new', 'reviewed', 'quoted', 'accepted', 'declined', 'draft', 'sent', 'approved', 'rejected');
CREATE TYPE shop_manager.welding_schedule_entry_type AS ENUM ('day_off', 'vacation', 'install_day', 'on_site', 'shop_day', 'booking', 'measurement');

CREATE SEQUENCE IF NOT EXISTS shop_manager.feature_request_number_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1 NO CYCLE;