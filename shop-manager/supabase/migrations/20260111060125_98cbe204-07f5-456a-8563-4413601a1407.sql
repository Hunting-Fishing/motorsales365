
-- Add missing foreign key constraints to fuel_delivery_orders
ALTER TABLE fuel_delivery_orders
ADD CONSTRAINT fuel_delivery_orders_driver_id_fkey
FOREIGN KEY (driver_id) REFERENCES fuel_delivery_drivers(id) ON DELETE SET NULL;

ALTER TABLE fuel_delivery_orders
ADD CONSTRAINT fuel_delivery_orders_truck_id_fkey
FOREIGN KEY (truck_id) REFERENCES fuel_delivery_trucks(id) ON DELETE SET NULL;
