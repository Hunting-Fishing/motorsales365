-- Create function to insert a new service job
CREATE OR REPLACE FUNCTION insert_service_job(
  p_subcategory_id uuid,
  p_name text,
  p_description text DEFAULT NULL,
  p_estimated_time integer DEFAULT NULL,
  p_price numeric DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_job_id uuid;
BEGIN
  INSERT INTO service_jobs (subcategory_id, name, description, estimated_time, price)
  VALUES (p_subcategory_id, p_name, p_description, p_estimated_time, p_price)
  RETURNING id INTO new_job_id;
  
  RETURN new_job_id;
END;
$$;