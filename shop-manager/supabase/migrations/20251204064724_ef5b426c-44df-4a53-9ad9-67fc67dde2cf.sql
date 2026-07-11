-- Add 'na' status to forklift_item_status enum
ALTER TYPE forklift_item_status ADD VALUE IF NOT EXISTS 'na';