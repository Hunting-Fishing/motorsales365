-- Update profiles to link to actual department IDs instead of text-based department
-- First, let's update profiles to have proper department_id based on their text department value

-- Update existing profiles to link to departments by matching department names
UPDATE profiles 
SET department_id = (
  SELECT d.id 
  FROM departments d 
  WHERE LOWER(d.name) = LOWER(profiles.department) 
  AND d.shop_id = profiles.shop_id
  LIMIT 1
)
WHERE department IS NOT NULL 
AND department_id IS NULL;

-- For profiles with 'Executive' department, map them to 'Management' department
UPDATE profiles 
SET department_id = (
  SELECT d.id 
  FROM departments d 
  WHERE d.name = 'Management' 
  AND d.shop_id = profiles.shop_id
  LIMIT 1
)
WHERE department = 'Executive' 
AND department_id IS NULL;

-- Clear the old text-based department field since we now use department_id
UPDATE profiles 
SET department = NULL
WHERE department_id IS NOT NULL;