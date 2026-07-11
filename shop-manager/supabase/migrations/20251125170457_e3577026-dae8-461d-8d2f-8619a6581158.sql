-- Add created_by column to chat_rooms to track room ownership
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_chat_rooms_created_by ON chat_rooms(created_by);

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can view their chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can update their chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can delete their chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can view participants in their rooms" ON chat_participants;
DROP POLICY IF EXISTS "Users can add participants to rooms" ON chat_participants;

-- CREATE ROBUST RLS POLICIES FOR CHAT_ROOMS

-- INSERT: Authenticated users can create rooms and auto-track creator
CREATE POLICY "Users can create chat rooms"
ON chat_rooms FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (created_by IS NULL OR created_by = auth.uid())
);

-- SELECT: Users can view rooms they participate in or created
CREATE POLICY "Users can view their chat rooms"
ON chat_rooms FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    -- User is a participant
    EXISTS (
      SELECT 1 FROM chat_participants 
      WHERE room_id = chat_rooms.id 
      AND user_id = auth.uid()::text
    )
    -- Or user created the room
    OR created_by = auth.uid()
  )
);

-- UPDATE: Participants and creators can update rooms
CREATE POLICY "Users can update their chat rooms"
ON chat_rooms FOR UPDATE TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM chat_participants 
      WHERE room_id = chat_rooms.id 
      AND user_id = auth.uid()::text
    )
    OR created_by = auth.uid()
  )
);

-- DELETE: Only creator can delete rooms
CREATE POLICY "Users can delete their chat rooms"
ON chat_rooms FOR DELETE TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND created_by = auth.uid()
);

-- CREATE ROBUST RLS POLICIES FOR CHAT_PARTICIPANTS

-- INSERT: Users can add participants to rooms they created or participate in
CREATE POLICY "Users can add participants to their rooms"
ON chat_participants FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    -- User created the room
    EXISTS (
      SELECT 1 FROM chat_rooms 
      WHERE id = room_id 
      AND created_by = auth.uid()
    )
    -- Or user is already a participant in the room
    OR EXISTS (
      SELECT 1 FROM chat_participants cp 
      WHERE cp.room_id = chat_participants.room_id
      AND cp.user_id = auth.uid()::text
    )
  )
);

-- SELECT: Users can view participants in rooms they're part of
CREATE POLICY "Users can view participants in their rooms"
ON chat_participants FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    -- User is a participant in the room
    EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.room_id = chat_participants.room_id
      AND cp.user_id = auth.uid()::text
    )
    -- Or user created the room
    OR EXISTS (
      SELECT 1 FROM chat_rooms cr
      WHERE cr.id = chat_participants.room_id
      AND cr.created_by = auth.uid()
    )
  )
);