-- Clean up duplicate departments in one go
DELETE FROM departments 
WHERE id IN (
  WITH dept_member_counts AS (
    SELECT 
      d.id,
      ROW_NUMBER() OVER (PARTITION BY d.name, d.shop_id ORDER BY COUNT(p.id) DESC, d.created_at ASC) as rn
    FROM departments d
    LEFT JOIN profiles p ON p.department_id = d.id
    GROUP BY d.id, d.name, d.shop_id, d.created_at
  )
  SELECT id 
  FROM dept_member_counts 
  WHERE rn > 1
);