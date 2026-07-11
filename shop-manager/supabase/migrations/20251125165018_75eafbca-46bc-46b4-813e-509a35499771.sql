-- Fix RLS policy for chat_rooms to explicitly check authentication
DROP POLICY IF EXISTS "Users can create chat rooms" ON chat_rooms;

CREATE POLICY "Users can create chat rooms"
ON chat_rooms
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Also add a helpful comment
COMMENT ON POLICY "Users can create chat rooms" ON chat_rooms IS 
'Allows any authenticated user to create a new chat room. The user will be added as a participant separately.';