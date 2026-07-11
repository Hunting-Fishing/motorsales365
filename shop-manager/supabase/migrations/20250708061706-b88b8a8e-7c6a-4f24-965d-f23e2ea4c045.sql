-- Complete the cleanup by deleting duplicate departments
DELETE FROM departments 
WHERE id IN (SELECT id FROM dept_duplicates WHERE action = 'delete');