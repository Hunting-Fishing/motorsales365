-- Enable public read access to vehicle_makes table for all authenticated users
CREATE POLICY "Allow public read access to vehicle makes" 
ON vehicle_makes 
FOR SELECT 
USING (true);

-- Enable public read access to vehicle_models table for all authenticated users  
CREATE POLICY "Allow public read access to vehicle models" 
ON vehicle_models 
FOR SELECT 
USING (true);