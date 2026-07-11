-- Adjust RLS policies for chat_participants to allow room creators to add participants

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can participate in chats" ON chat_participants;

-- Allow users to view their own participation rows
CREATE POLICY "Users can view their participation"
ON chat_participants
FOR SELECT
TO authenticated
USING (user_id = auth.uid()::text);

-- Allow authenticated users to add participants to chats
-- This enables room creators to add other users to a room
CREATE POLICY "Users can be added to chats"
ON chat_participants
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to update their own participation (e.g. change settings later)
CREATE POLICY "Users can update their participation"
ON chat_participants
FOR UPDATE
TO authenticated
USING (user_id = auth.uid()::text);

-- Allow users to leave chats (delete their own participation row)
CREATE POLICY "Users can leave chats"
ON chat_participants
FOR DELETE
TO authenticated
USING (user_id = auth.uid()::text);