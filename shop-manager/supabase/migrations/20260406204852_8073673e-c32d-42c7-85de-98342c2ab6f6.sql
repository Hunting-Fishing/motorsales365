
-- =============================================
-- GAME DEVELOPMENT MODULE - ALL TABLES (gd_ prefix)
-- =============================================

-- 1. gd_projects
CREATE TABLE public.gd_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  genre TEXT NOT NULL DEFAULT 'action',
  engine TEXT NOT NULL DEFAULT 'unity',
  art_style TEXT NOT NULL DEFAULT '3d-realistic',
  phase TEXT NOT NULL DEFAULT 'concept',
  status TEXT NOT NULL DEFAULT 'active',
  platform_targets JSONB NOT NULL DEFAULT '[]'::jsonb,
  monetization_model TEXT NOT NULL DEFAULT 'premium',
  target_audience TEXT NOT NULL DEFAULT 'everyone',
  team_size INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gd_projects ENABLE ROW LEVEL SECURITY;

-- 2. gd_boards
CREATE TABLE public.gd_boards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT
);
ALTER TABLE public.gd_boards ENABLE ROW LEVEL SECURITY;

-- 3. gd_board_nodes
CREATE TABLE public.gd_board_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  board_id UUID NOT NULL REFERENCES public.gd_boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  node_type TEXT NOT NULL DEFAULT 'task',
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  color TEXT NOT NULL DEFAULT '#3b82f6',
  position_x DOUBLE PRECISION NOT NULL DEFAULT 0,
  position_y DOUBLE PRECISION NOT NULL DEFAULT 0,
  width DOUBLE PRECISION NOT NULL DEFAULT 200,
  height DOUBLE PRECISION NOT NULL DEFAULT 100,
  metadata JSONB,
  tags JSONB
);
ALTER TABLE public.gd_board_nodes ENABLE ROW LEVEL SECURITY;

-- 4. gd_board_edges
CREATE TABLE public.gd_board_edges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  board_id UUID NOT NULL REFERENCES public.gd_boards(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL,
  target_node_id UUID NOT NULL,
  edge_type TEXT NOT NULL DEFAULT 'default',
  label TEXT
);
ALTER TABLE public.gd_board_edges ENABLE ROW LEVEL SECURITY;

-- 5. gd_milestones
CREATE TABLE public.gd_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  roadmap_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  phase TEXT NOT NULL DEFAULT 'planning',
  status TEXT NOT NULL DEFAULT 'not-started',
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date TEXT,
  order_index INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.gd_milestones ENABLE ROW LEVEL SECURITY;

-- 6. gd_roadmap_boards
CREATE TABLE public.gd_roadmap_boards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  emoji TEXT
);
ALTER TABLE public.gd_roadmap_boards ENABLE ROW LEVEL SECURITY;

-- 7. gd_plan_tasks
CREATE TABLE public.gd_plan_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  roadmap_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  due_date TEXT,
  start_date TEXT,
  tags JSONB,
  dependency_ids JSONB,
  linked_board_id UUID,
  linked_milestone_id UUID,
  linked_node_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);
ALTER TABLE public.gd_plan_tasks ENABLE ROW LEVEL SECURITY;

-- 8. gd_planning_records
CREATE TABLE public.gd_planning_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  notes TEXT,
  record_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  owner TEXT,
  due_date TEXT,
  tags JSONB,
  custom_fields JSONB,
  related_record_ids JSONB,
  linked_milestone_id UUID,
  linked_node_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gd_planning_records ENABLE ROW LEVEL SECURITY;

-- 9. gd_asset_requirements
CREATE TABLE public.gd_asset_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  asset_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'needed',
  priority TEXT NOT NULL DEFAULT 'medium',
  linked_feature TEXT,
  linked_milestone_id UUID
);
ALTER TABLE public.gd_asset_requirements ENABLE ROW LEVEL SECURITY;

-- 10. gd_design_docs
CREATE TABLE public.gd_design_docs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb
);
ALTER TABLE public.gd_design_docs ENABLE ROW LEVEL SECURITY;

-- 11. gd_characters
CREATE TABLE public.gd_characters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'npc',
  bio TEXT,
  backstory TEXT,
  personality TEXT,
  motivations TEXT,
  fears TEXT,
  age TEXT,
  species TEXT,
  faction_id UUID,
  abilities JSONB,
  tags JSONB,
  visual_notes TEXT,
  voice_notes TEXT,
  position_x DOUBLE PRECISION NOT NULL DEFAULT 0,
  position_y DOUBLE PRECISION NOT NULL DEFAULT 0
);
ALTER TABLE public.gd_characters ENABLE ROW LEVEL SECURITY;

-- 12. gd_character_relations
CREATE TABLE public.gd_character_relations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  source_character_id UUID NOT NULL,
  target_character_id UUID NOT NULL,
  relation_type TEXT NOT NULL DEFAULT 'ally',
  description TEXT
);
ALTER TABLE public.gd_character_relations ENABLE ROW LEVEL SECURITY;

-- 13. gd_character_arcs
CREATE TABLE public.gd_character_arcs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  character_id UUID NOT NULL REFERENCES public.gd_characters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  phase TEXT NOT NULL DEFAULT 'setup',
  order_index INTEGER NOT NULL DEFAULT 0,
  linked_beat_id UUID
);
ALTER TABLE public.gd_character_arcs ENABLE ROW LEVEL SECURITY;

-- 14. gd_factions
CREATE TABLE public.gd_factions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  alignment TEXT,
  color TEXT NOT NULL DEFAULT '#6366f1'
);
ALTER TABLE public.gd_factions ENABLE ROW LEVEL SECURITY;

-- 15. gd_story_beats
CREATE TABLE public.gd_story_beats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  beat_type TEXT NOT NULL,
  characters JSONB,
  tags JSONB,
  position_x DOUBLE PRECISION NOT NULL DEFAULT 0,
  position_y DOUBLE PRECISION NOT NULL DEFAULT 0
);
ALTER TABLE public.gd_story_beats ENABLE ROW LEVEL SECURITY;

-- 16. gd_story_connections
CREATE TABLE public.gd_story_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  source_beat_id UUID NOT NULL,
  target_beat_id UUID NOT NULL,
  connection_type TEXT NOT NULL DEFAULT 'leads-to'
);
ALTER TABLE public.gd_story_connections ENABLE ROW LEVEL SECURITY;

-- 17. gd_wiki_articles
CREATE TABLE public.gd_wiki_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  tags JSONB,
  linked_article_ids JSONB,
  linked_node_ids JSONB,
  revisions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gd_wiki_articles ENABLE ROW LEVEL SECURITY;

-- 18. gd_game_items
CREATE TABLE public.gd_game_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'misc',
  rarity TEXT NOT NULL DEFAULT 'common',
  status TEXT NOT NULL DEFAULT 'draft',
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  value INTEGER,
  stackable BOOLEAN,
  max_stack INTEGER,
  effect TEXT,
  lore TEXT,
  item_type TEXT,
  item_number TEXT,
  equip_slot TEXT,
  equip_mode TEXT,
  era TEXT,
  origin TEXT,
  play_style TEXT,
  icon_url TEXT,
  image_url TEXT,
  visual_prompt TEXT,
  custom_fields JSONB,
  linked_node_ids JSONB
);
ALTER TABLE public.gd_game_items ENABLE ROW LEVEL SECURITY;

-- 19. gd_loot_tables
CREATE TABLE public.gd_loot_tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  entries JSONB NOT NULL DEFAULT '[]'::jsonb
);
ALTER TABLE public.gd_loot_tables ENABLE ROW LEVEL SECURITY;

-- 20. gd_item_sets
CREATE TABLE public.gd_item_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  item_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  bonuses JSONB NOT NULL DEFAULT '[]'::jsonb
);
ALTER TABLE public.gd_item_sets ENABLE ROW LEVEL SECURITY;

-- 21. gd_crafting_recipes
CREATE TABLE public.gd_crafting_recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  output_item_id TEXT NOT NULL DEFAULT '',
  output_quantity INTEGER NOT NULL DEFAULT 1,
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  crafting_time INTEGER,
  skill_requirements JSONB,
  tags JSONB
);
ALTER TABLE public.gd_crafting_recipes ENABLE ROW LEVEL SECURITY;

-- 22. gd_economy_curves
CREATE TABLE public.gd_economy_curves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  curve_type TEXT NOT NULL DEFAULT 'linear',
  data_points JSONB NOT NULL DEFAULT '[]'::jsonb
);
ALTER TABLE public.gd_economy_curves ENABLE ROW LEVEL SECURITY;

-- 23. gd_dialogue_trees
CREATE TABLE public.gd_dialogue_trees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT
);
ALTER TABLE public.gd_dialogue_trees ENABLE ROW LEVEL SECURITY;

-- 24. gd_dialogue_nodes
CREATE TABLE public.gd_dialogue_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  tree_id UUID NOT NULL REFERENCES public.gd_dialogue_trees(id) ON DELETE CASCADE,
  text TEXT NOT NULL DEFAULT '',
  node_type TEXT NOT NULL DEFAULT 'dialogue',
  character_id UUID,
  condition TEXT,
  tags JSONB,
  position_x DOUBLE PRECISION NOT NULL DEFAULT 0,
  position_y DOUBLE PRECISION NOT NULL DEFAULT 0
);
ALTER TABLE public.gd_dialogue_nodes ENABLE ROW LEVEL SECURITY;

-- 25. gd_dialogue_edges
CREATE TABLE public.gd_dialogue_edges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  tree_id UUID NOT NULL REFERENCES public.gd_dialogue_trees(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL,
  target_node_id UUID NOT NULL,
  label TEXT,
  condition TEXT
);
ALTER TABLE public.gd_dialogue_edges ENABLE ROW LEVEL SECURITY;

-- 26. gd_dialogue_variables
CREATE TABLE public.gd_dialogue_variables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  var_type TEXT NOT NULL DEFAULT 'string',
  default_value TEXT NOT NULL DEFAULT ''
);
ALTER TABLE public.gd_dialogue_variables ENABLE ROW LEVEL SECURITY;

-- 27. gd_raids
CREATE TABLE public.gd_raids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  difficulty TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'draft',
  priority TEXT NOT NULL DEFAULT 'medium',
  boss_count INTEGER NOT NULL DEFAULT 1,
  player_count_min INTEGER NOT NULL DEFAULT 1,
  player_count_max INTEGER NOT NULL DEFAULT 4,
  estimated_duration TEXT,
  phases JSONB,
  mechanics JSONB,
  rewards JSONB,
  tags JSONB,
  linked_milestone_id UUID,
  linked_node_ids JSONB
);
ALTER TABLE public.gd_raids ENABLE ROW LEVEL SECURITY;

-- 28. gd_events
CREATE TABLE public.gd_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'seasonal',
  status TEXT NOT NULL DEFAULT 'draft',
  priority TEXT NOT NULL DEFAULT 'medium',
  recurrence TEXT NOT NULL DEFAULT 'none',
  start_date TEXT,
  end_date TEXT,
  mechanics JSONB,
  rewards JSONB,
  requirements JSONB,
  tags JSONB,
  linked_milestone_id UUID,
  linked_node_ids JSONB
);
ALTER TABLE public.gd_events ENABLE ROW LEVEL SECURITY;

-- 29. gd_quests
CREATE TABLE public.gd_quests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  quest_type TEXT NOT NULL DEFAULT 'main',
  status TEXT NOT NULL DEFAULT 'draft',
  priority TEXT NOT NULL DEFAULT 'medium',
  chain_order INTEGER NOT NULL DEFAULT 0,
  branch_label TEXT,
  parent_quest_id UUID,
  objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
  prerequisites JSONB NOT NULL DEFAULT '[]'::jsonb,
  rewards JSONB NOT NULL DEFAULT '[]'::jsonb,
  linked_character_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  linked_milestone_id UUID,
  linked_zone_id UUID,
  estimated_duration TEXT,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb
);
ALTER TABLE public.gd_quests ENABLE ROW LEVEL SECURITY;

-- 30. gd_world_zones
CREATE TABLE public.gd_world_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  zone_type TEXT NOT NULL DEFAULT 'overworld',
  status TEXT NOT NULL DEFAULT 'draft',
  priority TEXT NOT NULL DEFAULT 'medium',
  grid_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  encounters JSONB NOT NULL DEFAULT '[]'::jsonb,
  connected_zone_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb
);
ALTER TABLE public.gd_world_zones ENABLE ROW LEVEL SECURITY;

-- 31. gd_playtest_sessions
CREATE TABLE public.gd_playtest_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  session_date TEXT,
  duration_minutes INTEGER,
  build_version TEXT,
  tester_name TEXT,
  notes TEXT,
  feedback JSONB NOT NULL DEFAULT '[]'::jsonb,
  action_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb
);
ALTER TABLE public.gd_playtest_sessions ENABLE ROW LEVEL SECURITY;

-- 32. gd_cross_canvas_links
CREATE TABLE public.gd_cross_canvas_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  source_board_id UUID NOT NULL,
  source_node_id UUID NOT NULL,
  target_board_id UUID NOT NULL,
  target_node_id UUID NOT NULL,
  label TEXT
);
ALTER TABLE public.gd_cross_canvas_links ENABLE ROW LEVEL SECURITY;

-- 33. gd_custom_db_fields
CREATE TABLE public.gd_custom_db_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);
ALTER TABLE public.gd_custom_db_fields ENABLE ROW LEVEL SECURITY;

-- 34. gd_entity_snapshots
CREATE TABLE public.gd_entity_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  branch_name TEXT NOT NULL DEFAULT 'main',
  description TEXT,
  snapshot_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.gd_entity_snapshots ENABLE ROW LEVEL SECURITY;

-- 35. gd_locale_strings
CREATE TABLE public.gd_locale_strings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  string_key TEXT NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  locale TEXT NOT NULL DEFAULT 'en',
  context TEXT
);
ALTER TABLE public.gd_locale_strings ENABLE ROW LEVEL SECURITY;

-- 36. gd_comments
CREATE TABLE public.gd_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  parent_id UUID REFERENCES public.gd_comments(id) ON DELETE CASCADE,
  mentions JSONB,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gd_comments ENABLE ROW LEVEL SECURITY;

-- 37. gd_api_keys
CREATE TABLE public.gd_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default',
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gd_api_keys ENABLE ROW LEVEL SECURITY;

-- 38. gd_webhooks
CREATE TABLE public.gd_webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  events JSONB NOT NULL DEFAULT '[]'::jsonb,
  secret TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  last_status INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gd_webhooks ENABLE ROW LEVEL SECURITY;

-- 39. gd_webhook_logs
CREATE TABLE public.gd_webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id UUID NOT NULL REFERENCES public.gd_webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_status INTEGER,
  response_body TEXT,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gd_webhook_logs ENABLE ROW LEVEL SECURITY;

-- 40. gd_chat_conversations
CREATE TABLE public.gd_chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gd_chat_conversations ENABLE ROW LEVEL SECURITY;

-- 41. gd_chat_messages
CREATE TABLE public.gd_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.gd_chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gd_chat_messages ENABLE ROW LEVEL SECURITY;

-- 42. gd_chat_import_files
CREATE TABLE public.gd_chat_import_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  extracted_entities JSONB,
  entity_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gd_chat_import_files ENABLE ROW LEVEL SECURITY;

-- 43. gd_media_files
CREATE TABLE public.gd_media_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  entity_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gd_media_files ENABLE ROW LEVEL SECURITY;

-- 44. gd_generated_assets
CREATE TABLE public.gd_generated_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  image_url TEXT NOT NULL,
  style_preset TEXT NOT NULL DEFAULT 'fantasy',
  linked_entity_id TEXT,
  linked_entity_type TEXT,
  character_set_id UUID,
  parent_image_id UUID REFERENCES public.gd_generated_assets(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gd_generated_assets ENABLE ROW LEVEL SECURITY;

-- 45. gd_character_assemblies
CREATE TABLE public.gd_character_assemblies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.gd_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Assembly',
  slots_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gd_character_assemblies ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES (shop-scoped)
-- =============================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'gd_projects','gd_boards','gd_board_nodes','gd_board_edges',
      'gd_milestones','gd_roadmap_boards','gd_plan_tasks','gd_planning_records',
      'gd_asset_requirements','gd_design_docs',
      'gd_characters','gd_character_relations','gd_character_arcs','gd_factions',
      'gd_story_beats','gd_story_connections',
      'gd_wiki_articles',
      'gd_game_items','gd_loot_tables','gd_item_sets','gd_crafting_recipes','gd_economy_curves',
      'gd_dialogue_trees','gd_dialogue_nodes','gd_dialogue_edges','gd_dialogue_variables',
      'gd_raids','gd_events','gd_quests','gd_world_zones','gd_playtest_sessions',
      'gd_cross_canvas_links','gd_custom_db_fields','gd_entity_snapshots',
      'gd_locale_strings','gd_comments',
      'gd_api_keys','gd_webhooks',
      'gd_chat_conversations','gd_chat_import_files','gd_media_files',
      'gd_generated_assets','gd_character_assemblies'
    ])
  LOOP
    EXECUTE format(
      'CREATE POLICY "Shop isolation select on %1$s" ON public.%1$s FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id())',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "Shop isolation insert on %1$s" ON public.%1$s FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id())',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "Shop isolation update on %1$s" ON public.%1$s FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id())',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "Shop isolation delete on %1$s" ON public.%1$s FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id())',
      tbl
    );
  END LOOP;
END $$;

-- Webhook logs: scoped via parent webhook
CREATE POLICY "Shop isolation select on gd_webhook_logs" ON public.gd_webhook_logs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.gd_webhooks w WHERE w.id = webhook_id AND w.shop_id = public.get_current_user_shop_id()));
CREATE POLICY "Shop isolation insert on gd_webhook_logs" ON public.gd_webhook_logs
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.gd_webhooks w WHERE w.id = webhook_id AND w.shop_id = public.get_current_user_shop_id()));
CREATE POLICY "Shop isolation delete on gd_webhook_logs" ON public.gd_webhook_logs
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.gd_webhooks w WHERE w.id = webhook_id AND w.shop_id = public.get_current_user_shop_id()));

-- Chat messages: scoped via parent conversation
CREATE POLICY "Shop isolation select on gd_chat_messages" ON public.gd_chat_messages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.gd_chat_conversations c WHERE c.id = conversation_id AND c.shop_id = public.get_current_user_shop_id()));
CREATE POLICY "Shop isolation insert on gd_chat_messages" ON public.gd_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.gd_chat_conversations c WHERE c.id = conversation_id AND c.shop_id = public.get_current_user_shop_id()));
CREATE POLICY "Shop isolation delete on gd_chat_messages" ON public.gd_chat_messages
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.gd_chat_conversations c WHERE c.id = conversation_id AND c.shop_id = public.get_current_user_shop_id()));

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_gd_projects_shop ON public.gd_projects(shop_id);
CREATE INDEX idx_gd_boards_project ON public.gd_boards(project_id);
CREATE INDEX idx_gd_board_nodes_board ON public.gd_board_nodes(board_id);
CREATE INDEX idx_gd_board_edges_board ON public.gd_board_edges(board_id);
CREATE INDEX idx_gd_milestones_project ON public.gd_milestones(project_id);
CREATE INDEX idx_gd_plan_tasks_project ON public.gd_plan_tasks(project_id);
CREATE INDEX idx_gd_characters_project ON public.gd_characters(project_id);
CREATE INDEX idx_gd_story_beats_project ON public.gd_story_beats(project_id);
CREATE INDEX idx_gd_game_items_project ON public.gd_game_items(project_id);
CREATE INDEX idx_gd_dialogue_nodes_tree ON public.gd_dialogue_nodes(tree_id);
CREATE INDEX idx_gd_quests_project ON public.gd_quests(project_id);
CREATE INDEX idx_gd_wiki_articles_project ON public.gd_wiki_articles(project_id);
CREATE INDEX idx_gd_comments_entity ON public.gd_comments(entity_id, entity_type);
CREATE INDEX idx_gd_generated_assets_project ON public.gd_generated_assets(project_id);
