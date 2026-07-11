-- Fix Brian's profile/auth user ID mismatch
-- His auth.users.id is a306082e-225e-41d5-bb9c-cae7406362ee
-- But his profile was created with 386db180-5c4b-4983-8327-e7a3c5dbfa12

-- Step 1: Store Brian's permissions temporarily
CREATE TEMP TABLE temp_brian_permissions AS
SELECT module, actions, shop_id, created_by, notes
FROM user_permissions
WHERE user_id = '386db180-5c4b-4983-8327-e7a3c5dbfa12';

-- Step 2: Store Brian's roles temporarily  
CREATE TEMP TABLE temp_brian_roles AS
SELECT role_id
FROM user_roles
WHERE user_id = '386db180-5c4b-4983-8327-e7a3c5dbfa12';

-- Step 3: Store Brian's profile data temporarily
CREATE TEMP TABLE temp_brian_profile AS
SELECT first_name, last_name, email, shop_id, phone, job_title, department, department_id, notification_preferences, has_auth_account, middle_name
FROM profiles
WHERE id = '386db180-5c4b-4983-8327-e7a3c5dbfa12';

-- Step 4: Delete old permissions
DELETE FROM user_permissions WHERE user_id = '386db180-5c4b-4983-8327-e7a3c5dbfa12';

-- Step 5: Delete old roles
DELETE FROM user_roles WHERE user_id = '386db180-5c4b-4983-8327-e7a3c5dbfa12';

-- Step 6: Delete old profile
DELETE FROM profiles WHERE id = '386db180-5c4b-4983-8327-e7a3c5dbfa12';

-- Step 7: Create new profile with correct auth user ID
INSERT INTO profiles (id, first_name, last_name, email, shop_id, phone, job_title, department, department_id, notification_preferences, has_auth_account, middle_name, created_at, updated_at)
SELECT 
  'a306082e-225e-41d5-bb9c-cae7406362ee',
  first_name, last_name, email, shop_id, phone, job_title, department, department_id, notification_preferences, TRUE, middle_name,
  NOW(), NOW()
FROM temp_brian_profile;

-- Step 8: Recreate permissions with correct user ID
INSERT INTO user_permissions (user_id, module, actions, shop_id, created_by, notes, created_at, updated_at)
SELECT 
  'a306082e-225e-41d5-bb9c-cae7406362ee',
  module, actions, shop_id, created_by, notes,
  NOW(), NOW()
FROM temp_brian_permissions;

-- Step 9: Recreate roles with correct user ID
INSERT INTO user_roles (user_id, role_id)
SELECT 
  'a306082e-225e-41d5-bb9c-cae7406362ee',
  role_id
FROM temp_brian_roles;

-- Cleanup temp tables
DROP TABLE temp_brian_permissions;
DROP TABLE temp_brian_roles;
DROP TABLE temp_brian_profile;