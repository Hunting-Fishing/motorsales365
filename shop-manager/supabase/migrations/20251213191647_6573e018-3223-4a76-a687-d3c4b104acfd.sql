-- Insert default Kanban columns for all existing shops
INSERT INTO planner_board_columns (shop_id, board_id, column_key, column_name, column_order, color, wip_limit, is_active)
SELECT 
  s.id,
  'default',
  col.key,
  col.name,
  col.ord,
  col.color,
  col.wip,
  true
FROM shops s
CROSS JOIN (
  VALUES 
    ('backlog', 'Backlog', 0, '#94a3b8', NULL),
    ('todo', 'To Do', 1, '#3b82f6', 10),
    ('in_progress', 'In Progress', 2, '#f59e0b', 5),
    ('review', 'Review', 3, '#8b5cf6', 3),
    ('done', 'Done', 4, '#22c55e', NULL)
) AS col(key, name, ord, color, wip)
ON CONFLICT DO NOTHING;