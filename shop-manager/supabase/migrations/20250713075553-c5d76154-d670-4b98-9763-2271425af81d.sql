-- Add Stripe integration and fix review system
-- Create storage bucket for review images
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES ('review-images', 'review-images', true, ARRAY['image/jpeg', 'image/png', 'image/webp'], 5242880); -- 5MB limit

-- Create storage policies for review images
CREATE POLICY "Review images are publicly viewable" ON storage.objects
FOR SELECT USING (bucket_id = 'review-images');

CREATE POLICY "Authenticated users can upload review images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'review-images' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own review images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'review-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add missing reviewer_name column to product_reviews
ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS reviewer_name TEXT;

-- Update existing reviews to have a reviewer name
UPDATE product_reviews SET reviewer_name = 'Anonymous' WHERE reviewer_name IS NULL;

-- Create verification_service table for verified purchases
CREATE TABLE IF NOT EXISTS verification_service (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL,
  order_id UUID NOT NULL,
  is_verified BOOLEAN DEFAULT true,
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, product_id, order_id)
);

-- Enable RLS on verification_service
ALTER TABLE verification_service ENABLE ROW LEVEL SECURITY;

-- Create policies for verification_service
CREATE POLICY "Users can view their own verifications" ON verification_service
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can manage verifications" ON verification_service
FOR ALL USING (auth.role() = 'service_role');

-- Create function to check verified purchase
CREATE OR REPLACE FUNCTION check_verified_purchase(p_user_id UUID, p_product_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_verified BOOLEAN := false;
BEGIN
  -- Check if user has purchased this product
  SELECT EXISTS (
    SELECT 1 FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE o.user_id = p_user_id 
    AND oi.product_id = p_product_id
    AND o.status IN ('completed', 'delivered')
  ) INTO is_verified;
  
  RETURN is_verified;
END;
$$;

-- Create payments table for better order tracking
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  invoice_id UUID,
  amount NUMERIC(10,2) NOT NULL,
  payment_type TEXT NOT NULL DEFAULT 'card',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method_id UUID,
  transaction_id TEXT,
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies for payments
CREATE POLICY "Users can view their own payments" ON payments
FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "System can manage payments" ON payments
FOR ALL USING (auth.role() = 'service_role');

-- Create payment_methods table for storing customer payment methods
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  stripe_payment_method_id TEXT UNIQUE,
  type TEXT NOT NULL DEFAULT 'card',
  card_brand TEXT,
  card_last_four TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on payment_methods
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Create policies for payment_methods
CREATE POLICY "Users can view their own payment methods" ON payment_methods
FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Users can manage their own payment methods" ON payment_methods
FOR ALL USING (customer_id = auth.uid());

-- Add updated_at trigger for payments table
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_shopping_tables_timestamp();

-- Add updated_at trigger for payment_methods table  
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_shopping_tables_timestamp();