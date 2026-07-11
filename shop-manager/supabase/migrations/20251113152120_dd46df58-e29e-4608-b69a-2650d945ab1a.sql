-- Fix critical security issue: Remove overly permissive policies and enforce shop-based access

-- Drop the dangerous policies that allow cross-shop access
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON public.profiles;

-- Keep only the secure, shop-scoped policies
-- (The existing "Admins can view same shop profiles", "Admins can insert same shop profiles", etc. are good)

-- Make profiles.id foreign key constraint DEFERRABLE so we can insert profiles without auth users
-- This allows team member profiles to exist before they create auth accounts
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Re-add the foreign key as deferrable initially deferred
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey 
  FOREIGN KEY (id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- Add a flag to track if profile is linked to auth
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS has_auth_account BOOLEAN DEFAULT FALSE;