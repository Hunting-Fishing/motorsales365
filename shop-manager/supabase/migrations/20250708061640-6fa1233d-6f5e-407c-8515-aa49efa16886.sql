-- Phase 1: Database Cleanup - Step by step approach

-- Step 1: Clear old text-based department field
UPDATE profiles 
SET department = NULL 
WHERE department IS NOT NULL;

-- Step 2: Create a temporary table to identify duplicate departments
CREATE TEMP TABLE dept_duplicates AS
WITH dept_member_counts AS (
  SELECT 
    d.id,
    d.name,
    d.shop_id,
    COUNT(p.id) as member_count,
    d.created_at,
    ROW_NUMBER() OVER (PARTITION BY d.name, d.shop_id ORDER BY COUNT(p.id) DESC, d.created_at ASC) as rn
  FROM departments d
  LEFT JOIN profiles p ON p.department_id = d.id
  GROUP BY d.id, d.name, d.shop_id, d.created_at
)
SELECT 
  id,
  name,
  shop_id,
  CASE WHEN rn = 1 THEN 'keep' ELSE 'delete' END as action
FROM dept_member_counts;

-- Step 3: Update profiles pointing to duplicate departments to point to the kept ones
UPDATE profiles 
SET department_id = (
  SELECT keep_dept.id 
  FROM dept_duplicates keep_dept
  JOIN dept_duplicates del_dept ON keep_dept.name = del_dept.name 
    AND keep_dept.shop_id = del_dept.shop_id
  WHERE keep_dept.action = 'keep' 
    AND del_dept.action = 'delete'
    AND del_dept.id = profiles.department_id
  LIMIT 1
)
WHERE department_id IN (SELECT id FROM dept_duplicates WHERE action = 'delete');