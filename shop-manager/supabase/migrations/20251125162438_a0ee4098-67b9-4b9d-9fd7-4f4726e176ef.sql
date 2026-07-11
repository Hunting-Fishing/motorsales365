-- Drop existing restrictive policies for chat
DROP POLICY IF EXISTS "Staff access only" ON chat_rooms;
DROP POLICY IF EXISTS "Staff access only" ON chat_messages;

-- Create proper RLS policies for chat_rooms
-- Allow authenticated users to view rooms they're participants in
CREATE POLICY "Users can view their chat rooms"
ON chat_rooms
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_participants.room_id = chat_rooms.id
    AND chat_participants.user_id = auth.uid()::text
  )
);

-- Allow authenticated users to create chat rooms
CREATE POLICY "Users can create chat rooms"
ON chat_rooms
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update rooms they're participants in
CREATE POLICY "Users can update their chat rooms"
ON chat_rooms
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_participants.room_id = chat_rooms.id
    AND chat_participants.user_id = auth.uid()::text
  )
);

-- Create proper RLS policies for chat_messages
-- Allow users to view messages in rooms they're participants in
CREATE POLICY "Users can view messages in their rooms"
ON chat_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_participants.room_id = chat_messages.room_id
    AND chat_participants.user_id = auth.uid()::text
  )
);

-- Allow users to insert messages in rooms they're participants in
CREATE POLICY "Users can send messages in their rooms"
ON chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_participants.room_id = chat_messages.room_id
    AND chat_participants.user_id = auth.uid()::text
  )
);

-- Allow users to update their own messages
CREATE POLICY "Users can update their own messages"
ON chat_messages
FOR UPDATE
TO authenticated
USING (sender_id = auth.uid()::text);