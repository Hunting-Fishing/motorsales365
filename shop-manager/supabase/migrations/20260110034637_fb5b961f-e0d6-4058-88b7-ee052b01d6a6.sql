-- Add user_id column to link fuel delivery customers to auth users
ALTER TABLE fuel_delivery_customers 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_fuel_delivery_customers_user_id 
ON fuel_delivery_customers(user_id);

-- Create fuel_delivery_requests table for customer-initiated delivery requests
CREATE TABLE IF NOT EXISTS fuel_delivery_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id),
  customer_id uuid NOT NULL REFERENCES fuel_delivery_customers(id) ON DELETE CASCADE,
  location_id uuid REFERENCES fuel_delivery_locations(id) ON DELETE SET NULL,
  requested_date date,
  requested_time_window text, -- 'morning', 'afternoon', 'evening', 'any'
  fuel_type text,
  estimated_gallons numeric,
  urgency text DEFAULT 'normal', -- 'normal', 'urgent', 'emergency'
  notes text,
  status text DEFAULT 'pending', -- 'pending', 'approved', 'scheduled', 'completed', 'cancelled'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on fuel_delivery_requests
ALTER TABLE fuel_delivery_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Customers can view their own requests
CREATE POLICY "Customers can view own requests" 
ON fuel_delivery_requests FOR SELECT 
USING (
  customer_id IN (
    SELECT id FROM fuel_delivery_customers WHERE user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.shop_id = fuel_delivery_requests.shop_id
  )
);

-- Policy: Customers can create requests for themselves
CREATE POLICY "Customers can create requests" 
ON fuel_delivery_requests FOR INSERT 
WITH CHECK (
  customer_id IN (
    SELECT id FROM fuel_delivery_customers WHERE user_id = auth.uid()
  )
);

-- Policy: Staff can manage all requests for their shop
CREATE POLICY "Staff can manage requests" 
ON fuel_delivery_requests FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.shop_id = fuel_delivery_requests.shop_id
  )
);

-- Policy: Customers can view their own fuel_delivery_customers record
CREATE POLICY "Customers can view their own record" 
ON fuel_delivery_customers FOR SELECT 
USING (user_id = auth.uid());

-- Policy: Customers can update their own record
CREATE POLICY "Customers can update their own record" 
ON fuel_delivery_customers FOR UPDATE 
USING (user_id = auth.uid());

-- Policy: Anyone can insert (for registration) - shop_id will be validated
CREATE POLICY "Allow customer self-registration" 
ON fuel_delivery_customers FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Policy: Customers can view their own locations
CREATE POLICY "Customers can view own locations" 
ON fuel_delivery_locations FOR SELECT 
USING (
  customer_id IN (
    SELECT id FROM fuel_delivery_customers WHERE user_id = auth.uid()
  )
);

-- Policy: Customers can manage their own locations
CREATE POLICY "Customers can manage own locations" 
ON fuel_delivery_locations FOR ALL
USING (
  customer_id IN (
    SELECT id FROM fuel_delivery_customers WHERE user_id = auth.uid()
  )
);

-- Add trigger for updated_at on fuel_delivery_requests
CREATE TRIGGER update_fuel_delivery_requests_updated_at
BEFORE UPDATE ON fuel_delivery_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();