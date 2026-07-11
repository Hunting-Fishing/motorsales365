-- Phase 13: Fix Critical Shopping Issues & Missing Features

-- Add reviewer_name to product_reviews table
ALTER TABLE public.product_reviews 
ADD COLUMN IF NOT EXISTS reviewer_name TEXT;

-- Add name field to products table (for backward compatibility with wishlist service)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Update existing products to populate name from title
UPDATE public.products 
SET name = title 
WHERE name IS NULL;

-- Add payment method tracking to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES payment_methods(id),
ADD COLUMN IF NOT EXISTS shipping_address_id UUID REFERENCES customer_addresses(id),
ADD COLUMN IF NOT EXISTS billing_address_id UUID REFERENCES customer_addresses(id),
ADD COLUMN IF NOT EXISTS order_number TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS tracking_number TEXT,
ADD COLUMN IF NOT EXISTS estimated_delivery DATE,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Create order_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create order_status_history table
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  notes TEXT,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_rating ON product_reviews(product_id, rating);
CREATE INDEX IF NOT EXISTS idx_product_reviews_approved ON product_reviews(is_approved, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Enable RLS on new tables
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for order_items
CREATE POLICY "Users can view their own order items" ON order_items
FOR SELECT USING (
  order_id IN (
    SELECT id FROM orders WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert order items for their orders" ON order_items
FOR INSERT WITH CHECK (
  order_id IN (
    SELECT id FROM orders WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all order items" ON order_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('admin', 'owner')
  )
);

-- RLS policies for order_status_history
CREATE POLICY "Users can view their order status history" ON order_status_history
FOR SELECT USING (
  order_id IN (
    SELECT id FROM orders WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Staff can insert order status updates" ON order_status_history
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('admin', 'owner', 'staff')
  )
);

CREATE POLICY "Admins can manage all order status history" ON order_status_history
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('admin', 'owner')
  )
);

-- Function to update product rating when reviews change
CREATE OR REPLACE FUNCTION update_product_rating_on_review()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate average rating and review count for the product
  UPDATE products SET
    average_rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM product_reviews 
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id) 
      AND is_approved = true
    ),
    review_count = (
      SELECT COUNT(*)
      FROM product_reviews 
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id) 
      AND is_approved = true
    )
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for product rating updates
DROP TRIGGER IF EXISTS trigger_update_product_rating ON product_reviews;
CREATE TRIGGER trigger_update_product_rating
  AFTER INSERT OR UPDATE OR DELETE ON product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_product_rating_on_review();

-- Function to track order status changes
CREATE OR REPLACE FUNCTION track_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (order_id, status, changed_by)
    VALUES (NEW.id, NEW.status, auth.uid());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for order status tracking
DROP TRIGGER IF EXISTS trigger_track_order_status ON orders;
CREATE TRIGGER trigger_track_order_status
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION track_order_status_change();

-- Function to handle inventory deduction on order creation
CREATE OR REPLACE FUNCTION handle_inventory_on_order()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
BEGIN
  -- Only process if order status is 'confirmed' or 'paid'
  IF NEW.status IN ('confirmed', 'paid') AND (OLD.status IS NULL OR OLD.status NOT IN ('confirmed', 'paid')) THEN
    -- Deduct inventory for each order item
    FOR item IN 
      SELECT oi.product_id, oi.quantity 
      FROM order_items oi 
      WHERE oi.order_id = NEW.id
    LOOP
      -- Check if we have enough inventory
      IF NOT EXISTS (
        SELECT 1 FROM inventory_items ii
        WHERE ii.product_id = item.product_id 
        AND ii.quantity >= item.quantity
      ) THEN
        RAISE EXCEPTION 'Insufficient inventory for product %', item.product_id;
      END IF;
      
      -- Deduct inventory
      UPDATE inventory_items 
      SET quantity = quantity - item.quantity,
          updated_at = now()
      WHERE product_id = item.product_id;
      
      -- Record inventory transaction
      INSERT INTO inventory_transactions (
        inventory_item_id,
        quantity,
        transaction_type,
        reference_type,
        reference_id,
        notes,
        performed_by
      ) SELECT 
        ii.id,
        -item.quantity,
        'sale',
        'order',
        NEW.id,
        'Inventory deducted for order',
        NEW.user_id
      FROM inventory_items ii
      WHERE ii.product_id = item.product_id;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for inventory management
DROP TRIGGER IF EXISTS trigger_handle_inventory_on_order ON orders;
CREATE TRIGGER trigger_handle_inventory_on_order
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_inventory_on_order();

-- Update timestamps trigger for new tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_order_items_updated_at
  BEFORE UPDATE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();