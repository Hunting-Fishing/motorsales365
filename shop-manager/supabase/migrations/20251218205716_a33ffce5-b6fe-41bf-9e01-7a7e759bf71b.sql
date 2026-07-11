-- Delete duplicate planner_board_columns keeping oldest by created_at
DELETE FROM planner_board_columns a
USING planner_board_columns b
WHERE a.shop_id = b.shop_id 
  AND a.board_id IS NOT DISTINCT FROM b.board_id
  AND a.column_key = b.column_key
  AND a.created_at > b.created_at;

-- Add unique constraint to prevent future duplicates
ALTER TABLE planner_board_columns 
ADD CONSTRAINT unique_shop_board_column 
UNIQUE (shop_id, board_id, column_key);