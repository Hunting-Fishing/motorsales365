-- Phase 1: Database Cleanup

-- First, let's see what duplicates we have and clean them up
-- Remove duplicate departments (keep the ones with more members)
WITH dept_member_counts AS (
  SELECT 
    d.id,
    d.name,
    d.shop_id,
    COUNT(p.id) as member_count,
    ROW_NUMBER() OVER (PARTITION BY d.name, d.shop_id ORDER BY COUNT(p.id) DESC, d.created_at ASC) as rn
  FROM departments d
  LEFT JOIN profiles p ON p.department_id = d.id
  GROUP BY d.id, d.name, d.shop_id, d.created_at
),
departments_to_keep AS (
  SELECT id FROM dept_member_counts WHERE rn = 1
),
departments_to_delete AS (
  SELECT id FROM dept_member_counts WHERE rn > 1
)
-- Update profiles to point to the kept departments before deleting duplicates
UPDATE profiles 
SET department_id = (
  SELECT dk.id 
  FROM departments_to_keep dk
  JOIN departments d_keep ON dk.id = d_keep.id
  JOIN departments d_old ON d_old.name = d_keep.name AND d_old.shop_id = d_keep.shop_id
  WHERE d_old.id = profiles.department_id
  AND d_old.id IN (SELECT id FROM departments_to_delete)
  LIMIT 1
)
WHERE department_id IN (SELECT id FROM departments_to_delete);

-- Delete duplicate departments
DELETE FROM departments 
WHERE id IN (SELECT id FROM departments_to_delete);

-- Remove any profiles that are duplicates (same auth user_id)
WITH profile_duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY id ORDER BY created_at DESC) as rn
  FROM profiles
  WHERE id IN (
    SELECT id 
    FROM profiles 
    GROUP BY id 
    HAVING COUNT(*) > 1
  )
)
DELETE FROM profiles 
WHERE id IN (
  SELECT id 
  FROM profile_duplicates 
  WHERE rn > 1
);

-- Clear old text-based department field completely
UPDATE profiles 
SET department = NULL 
WHERE department IS NOT NULL;