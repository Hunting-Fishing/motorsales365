-- Fix infinite recursion in chat_participants RLS policies
-- Create security definer functions to bypass RLS when checking permissions

-- Function to check if a user is a participant in a room
CREATE OR REPLACE FUNCTION public.is_room_participant(_user_id uuid, _room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_participants
    WHERE room_id = _room_id
      AND user_id = _user_id::text
  )
$$;

-- Function to check if a user created a room
CREATE OR REPLACE FUNCTION public.is_room_creator(_user_id uuid, _room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_rooms
    WHERE id = _room_id
      AND created_by = _user_id
  )
$$;

-- Drop problematic policies
DROP POLICY IF EXISTS "Users can view their chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can update their chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can add participants to their rooms" ON chat_participants;
DROP POLICY IF EXISTS "Users can view participants in their rooms" ON chat_participants;

-- Recreate chat_rooms SELECT policy using security definer function
CREATE POLICY "Users can view their chat rooms"
ON chat_rooms FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    public.is_room_participant(auth.uid(), id)
    OR created_by = auth.uid()
  )
);

-- Recreate chat_rooms UPDATE policy using security definer function
CREATE POLICY "Users can update their chat rooms"
ON chat_rooms FOR UPDATE TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    public.is_room_participant(auth.uid(), id)
    OR created_by = auth.uid()
  )
);

-- Recreate chat_participants INSERT policy using security definer functions
CREATE POLICY "Users can add participants to their rooms"
ON chat_participants FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    public.is_room_creator(auth.uid(), room_id)
    OR public.is_room_participant(auth.uid(), room_id)
  )
);

-- Recreate chat_participants SELECT policy using security definer functions
CREATE POLICY "Users can view participants in their rooms"
ON chat_participants FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    public.is_room_participant(auth.uid(), room_id)
    OR public.is_room_creator(auth.uid(), room_id)
  )
);