// Game Development Module Types
// Adapted from 138 Cosmos (GameForge) game-planner.ts

export type Engine = 'unity' | 'unreal' | 'flutter' | 'godot' | 'gamemaker' | 'defold' | 'cocos' | 'custom';
export type ProjectPhase = 'concept' | 'pre-production' | 'production' | 'post-production' | 'live';
export type PlanningStatus = 'idea' | 'planned' | 'in-progress' | 'review' | 'done' | 'blocked' | 'cut' | 'backlog';
export type Priority = 'critical' | 'high' | 'medium' | 'low' | 'backlog';

export type NodeType =
  | 'game-concept' | 'feature' | 'mechanic' | 'gameplay-loop' | 'level'
  | 'mission' | 'quest' | 'character' | 'faction' | 'item'
  | 'enemy' | 'boss' | 'ui-screen' | 'story-arc' | 'lore-entry'
  | 'progression-system' | 'monetization-concept' | 'technical-requirement'
  | 'asset-requirement' | 'task' | 'risk' | 'milestone' | 'sticky-note'
  | 'raid' | 'event';

export type RaidDifficulty = 'normal' | 'hard' | 'heroic' | 'mythic' | 'legendary';
export type EventType = 'seasonal' | 'live-ops' | 'limited-time' | 'world-event' | 'pvp-tournament' | 'community' | 'story-event' | 'holiday';
export type EventRecurrence = 'one-time' | 'daily' | 'weekly' | 'monthly' | 'seasonal' | 'annual';

export interface RaidPlan {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  difficulty: RaidDifficulty;
  player_count_min: number;
  player_count_max: number;
  estimated_duration?: string;
  boss_count: number;
  phases?: string[];
  rewards?: string[];
  mechanics?: string[];
  linked_node_ids?: string[];
  linked_milestone_id?: string;
  status: PlanningStatus;
  priority: Priority;
  tags?: string[];
}

export interface EventPlan {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  event_type: EventType;
  recurrence: EventRecurrence;
  start_date?: string;
  end_date?: string;
  rewards?: string[];
  requirements?: string[];
  mechanics?: string[];
  linked_node_ids?: string[];
  linked_milestone_id?: string;
  status: PlanningStatus;
  priority: Priority;
  tags?: string[];
}

export const RAID_DIFFICULTY_CONFIG: Record<RaidDifficulty, { label: string; color: string; emoji: string }> = {
  'normal':    { label: 'Normal',    color: '142 70% 45%', emoji: '🟢' },
  'hard':      { label: 'Hard',      color: '38 92% 55%',  emoji: '🟡' },
  'heroic':    { label: 'Heroic',    color: '265 85% 65%', emoji: '🟣' },
  'mythic':    { label: 'Mythic',    color: '0 72% 55%',   emoji: '🔴' },
  'legendary': { label: 'Legendary', color: '45 100% 50%', emoji: '⭐' },
};

export const EVENT_TYPE_CONFIG: Record<EventType, { label: string; color: string; emoji: string }> = {
  'seasonal':       { label: 'Seasonal',       color: '142 70% 45%', emoji: '🌿' },
  'live-ops':       { label: 'Live Ops',        color: '200 90% 55%', emoji: '📡' },
  'limited-time':   { label: 'Limited Time',    color: '0 72% 55%',   emoji: '⏳' },
  'world-event':    { label: 'World Event',     color: '265 85% 65%', emoji: '🌍' },
  'pvp-tournament': { label: 'PvP Tournament',  color: '15 85% 55%',  emoji: '⚔️' },
  'community':      { label: 'Community',       color: '330 70% 55%', emoji: '👥' },
  'story-event':    { label: 'Story Event',     color: '290 70% 55%', emoji: '📖' },
  'holiday':        { label: 'Holiday',         color: '45 90% 55%',  emoji: '🎉' },
};

export const EVENT_RECURRENCE_CONFIG: Record<EventRecurrence, { label: string }> = {
  'one-time':  { label: 'One-Time' },
  'daily':     { label: 'Daily' },
  'weekly':    { label: 'Weekly' },
  'monthly':   { label: 'Monthly' },
  'seasonal':  { label: 'Seasonal' },
  'annual':    { label: 'Annual' },
};

export type PlanTaskStatus = 'draft' | 'active' | 'ready' | 'done';

export interface PlanTask {
  id: string;
  project_id: string;
  roadmap_id?: string;
  title: string;
  description?: string;
  content?: string;
  status: PlanTaskStatus;
  linked_milestone_id?: string;
  linked_node_id?: string;
  linked_board_id?: string;
  tags?: string[];
  priority?: Priority;
  order_index: number;
  dependency_ids?: string[];
  start_date?: string;
  due_date?: string;
  created_at: string;
  updated_at?: string;
}

export interface Board {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  color?: string;
}

export interface CrossCanvasLink {
  id: string;
  project_id: string;
  source_board_id: string;
  source_node_id: string;
  target_board_id: string;
  target_node_id: string;
  label?: string;
}

export type EdgeType =
  | 'depends-on' | 'related-to' | 'unlocks' | 'supports'
  | 'blocked-by' | 'belongs-to' | 'influences' | 'narrative-link'
  | 'production-dependency' | 'asset-requirement';

export type AssetType =
  | 'concept-art' | 'character' | 'environment' | 'prop' | 'icon'
  | 'sprite' | 'model' | 'texture' | 'vfx' | 'animation'
  | 'sfx' | 'music' | 'voice-line';

export interface GdProject {
  id: string;
  shop_id: string;
  user_id: string;
  name: string;
  genre: string;
  platform_targets: string[];
  engine: Engine;
  target_audience: string;
  art_style: string;
  monetization_model: string;
  phase: ProjectPhase;
  team_size: number;
  status: PlanningStatus;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface BoardNode {
  id: string;
  board_id: string;
  node_type: NodeType;
  title: string;
  summary?: string;
  status: PlanningStatus;
  priority: Priority;
  color: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface BoardEdge {
  id: string;
  board_id: string;
  source_node_id: string;
  target_node_id: string;
  edge_type: EdgeType;
  label?: string;
}

export interface PlanningRecord {
  id: string;
  project_id: string;
  title: string;
  record_type: NodeType;
  summary?: string;
  status: PlanningStatus;
  priority: Priority;
  tags?: string[];
  owner?: string;
  notes?: string;
  linked_node_id?: string;
  linked_milestone_id?: string;
  custom_fields?: Record<string, string>;
  related_record_ids?: string[];
  due_date?: string;
  created_at: string;
}

export interface CustomDbField {
  id: string;
  project_id: string;
  name: string;
}

export interface RoadmapBoard {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  color?: string;
  emoji?: string;
}

export interface Milestone {
  id: string;
  project_id: string;
  roadmap_id?: string;
  title: string;
  description?: string;
  phase: ProjectPhase;
  status: PlanningStatus;
  priority: Priority;
  due_date?: string;
  order_index: number;
}

export interface DesignDoc {
  id: string;
  project_id: string;
  title: string;
  sections: GDDSection[];
}

export interface GDDComment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
  resolved?: boolean;
}

export interface GDDRevision {
  timestamp: string;
  content: string;
}

export interface GDDSection {
  id: string;
  title: string;
  content: string;
  order: number;
  linked_record_ids?: string[];
  linked_node_ids?: string[];
  linked_character_ids?: string[];
  revisions?: GDDRevision[];
  comments?: GDDComment[];
}

export interface AssetRequirement {
  id: string;
  project_id: string;
  name: string;
  asset_type: AssetType;
  description?: string;
  status: PlanningStatus;
  priority: Priority;
  linked_feature?: string;
  linked_milestone_id?: string;
}

// Character Development types
export type CharacterRole = 'protagonist' | 'antagonist' | 'ally' | 'mentor' | 'rival' | 'npc' | 'boss' | 'companion' | 'villain' | 'neutral';
export type CharacterRelationType = 'ally' | 'rival' | 'family' | 'mentor' | 'student' | 'lover' | 'enemy' | 'friend' | 'servant' | 'master' | 'betrayer' | 'unknown';
export type ArcPhase = 'introduction' | 'rising' | 'conflict' | 'transformation' | 'climax' | 'resolution' | 'aftermath';

export interface GameCharacter {
  id: string;
  project_id: string;
  name: string;
  role: CharacterRole;
  faction_id?: string;
  bio?: string;
  backstory?: string;
  personality?: string;
  motivations?: string;
  fears?: string;
  visual_notes?: string;
  voice_notes?: string;
  age?: string;
  species?: string;
  abilities?: string[];
  tags?: string[];
  position_x: number;
  position_y: number;
}

export interface CharacterRelation {
  id: string;
  project_id: string;
  source_character_id: string;
  target_character_id: string;
  relation_type: CharacterRelationType;
  description?: string;
}

export interface CharacterArcEntry {
  id: string;
  character_id: string;
  phase: ArcPhase;
  title: string;
  description?: string;
  linked_beat_id?: string;
  order_index: number;
}

export interface Faction {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  color: string;
  alignment?: string;
}

export const CHARACTER_ROLE_CONFIG: Record<CharacterRole, { label: string; color: string; emoji: string }> = {
  'protagonist':  { label: 'Protagonist',  color: '265 85% 65%', emoji: '⭐' },
  'antagonist':   { label: 'Antagonist',   color: '0 72% 55%',   emoji: '💀' },
  'ally':         { label: 'Ally',          color: '200 90% 55%', emoji: '🤝' },
  'mentor':       { label: 'Mentor',        color: '38 92% 55%',  emoji: '🧙' },
  'rival':        { label: 'Rival',         color: '15 85% 55%',  emoji: '⚔️' },
  'npc':          { label: 'NPC',           color: '220 60% 55%', emoji: '💬' },
  'boss':         { label: 'Boss',          color: '0 90% 45%',   emoji: '👑' },
  'companion':    { label: 'Companion',     color: '142 70% 45%', emoji: '🐾' },
  'villain':      { label: 'Villain',       color: '330 70% 55%', emoji: '🦹' },
  'neutral':      { label: 'Neutral',       color: '180 60% 50%', emoji: '🔵' },
};

export const RELATION_TYPE_CONFIG: Record<CharacterRelationType, { label: string; color: string }> = {
  'ally':     { label: 'Ally',      color: '200 90% 55%' },
  'rival':    { label: 'Rival',     color: '15 85% 55%' },
  'family':   { label: 'Family',    color: '330 70% 55%' },
  'mentor':   { label: 'Mentor',    color: '38 92% 55%' },
  'student':  { label: 'Student',   color: '142 70% 45%' },
  'lover':    { label: 'Lover',     color: '0 72% 55%' },
  'enemy':    { label: 'Enemy',     color: '0 90% 45%' },
  'friend':   { label: 'Friend',    color: '170 60% 50%' },
  'servant':  { label: 'Servant',   color: '220 60% 55%' },
  'master':   { label: 'Master',    color: '265 85% 65%' },
  'betrayer': { label: 'Betrayer',  color: '45 90% 50%' },
  'unknown':  { label: 'Unknown',   color: '230 18% 40%' },
};

// Wiki types
export type WikiCategory = 'lore' | 'mechanics' | 'characters' | 'world' | 'items' | 'systems' | 'meta';

export interface WikiRevision {
  timestamp: string;
  title: string;
  content: string;
}

export interface WikiArticle {
  id: string;
  project_id: string;
  title: string;
  slug: string;
  content: string;
  category: WikiCategory;
  tags?: string[];
  linked_article_ids?: string[];
  linked_node_ids?: string[];
  revisions?: WikiRevision[];
  created_at: string;
  updated_at: string;
}

export const WIKI_CATEGORY_CONFIG: Record<WikiCategory, { label: string; color: string; emoji: string; icon: string }> = {
  'lore':       { label: 'Lore',       color: '265 85% 65%', emoji: '📜', icon: 'Scroll' },
  'mechanics':  { label: 'Mechanics',  color: '200 90% 55%', emoji: '⚙️', icon: 'Cog' },
  'characters': { label: 'Characters', color: '330 70% 55%', emoji: '👤', icon: 'User' },
  'world':      { label: 'World',      color: '142 70% 45%', emoji: '🌍', icon: 'Globe' },
  'items':      { label: 'Items',      color: '45 90% 55%',  emoji: '🎒', icon: 'Package' },
  'systems':    { label: 'Systems',    color: '15 85% 55%',  emoji: '🔧', icon: 'Wrench' },
  'meta':       { label: 'Meta',       color: '220 60% 55%', emoji: '📋', icon: 'FileText' },
};

export const ARC_PHASE_CONFIG: Record<ArcPhase, { label: string; color: string; emoji: string }> = {
  'introduction':   { label: 'Introduction',   color: '200 90% 55%', emoji: '🌅' },
  'rising':         { label: 'Rising Action',   color: '142 70% 45%', emoji: '📈' },
  'conflict':       { label: 'Conflict',        color: '38 92% 55%',  emoji: '⚡' },
  'transformation': { label: 'Transformation',  color: '265 85% 65%', emoji: '🦋' },
  'climax':         { label: 'Climax',          color: '0 72% 55%',   emoji: '💥' },
  'resolution':     { label: 'Resolution',      color: '142 70% 50%', emoji: '✅' },
  'aftermath':      { label: 'Aftermath',       color: '180 60% 50%', emoji: '🌄' },
};

// Story Tracker types
export type StoryBeatType =
  | 'prologue' | 'act' | 'chapter' | 'scene' | 'plot-point'
  | 'twist' | 'climax' | 'resolution' | 'character-arc'
  | 'dialogue' | 'flashback' | 'foreshadow' | 'lore' | 'choice' | 'ending';

export type StoryConnectionType =
  | 'leads-to' | 'branches-to' | 'flashback-to' | 'foreshadows'
  | 'reveals' | 'parallels' | 'contradicts' | 'character-link'
  | 'triggers' | 'depends-on';

export interface StoryBeat {
  id: string;
  project_id: string;
  beat_type: StoryBeatType;
  title: string;
  summary?: string;
  content?: string;
  characters?: string[];
  position_x: number;
  position_y: number;
  tags?: string[];
}

export interface StoryConnection {
  id: string;
  project_id: string;
  source_beat_id: string;
  target_beat_id: string;
  connection_type: StoryConnectionType;
}

// Node type config
export const NODE_TYPE_CONFIG: Record<NodeType, { label: string; color: string; icon: string }> = {
  'game-concept':           { label: 'Game Concept',        color: '265 85% 65%', icon: 'Gamepad2' },
  'feature':                { label: 'Feature',             color: '200 90% 55%', icon: 'Puzzle' },
  'mechanic':               { label: 'Mechanic',            color: '142 70% 45%', icon: 'Cog' },
  'gameplay-loop':          { label: 'Gameplay Loop',       color: '38 92% 55%',  icon: 'RefreshCw' },
  'level':                  { label: 'Level',               color: '160 60% 45%', icon: 'Map' },
  'mission':                { label: 'Mission',             color: '25 90% 55%',  icon: 'Target' },
  'quest':                  { label: 'Quest',               color: '45 90% 55%',  icon: 'Scroll' },
  'character':              { label: 'Character',           color: '330 70% 55%', icon: 'User' },
  'faction':                { label: 'Faction',             color: '280 60% 55%', icon: 'Shield' },
  'item':                   { label: 'Item',                color: '50 80% 50%',  icon: 'Package' },
  'enemy':                  { label: 'Enemy',               color: '0 72% 55%',   icon: 'Skull' },
  'boss':                   { label: 'Boss',                color: '0 90% 45%',   icon: 'Crown' },
  'ui-screen':              { label: 'UI Screen',           color: '210 60% 55%', icon: 'Monitor' },
  'story-arc':              { label: 'Story Arc',           color: '290 70% 55%', icon: 'BookOpen' },
  'lore-entry':             { label: 'Lore Entry',          color: '270 50% 55%', icon: 'FileText' },
  'progression-system':     { label: 'Progression',         color: '170 60% 45%', icon: 'TrendingUp' },
  'monetization-concept':   { label: 'Monetization',        color: '45 100% 50%', icon: 'DollarSign' },
  'technical-requirement':  { label: 'Tech Requirement',    color: '220 60% 55%', icon: 'Cpu' },
  'asset-requirement':      { label: 'Asset Requirement',   color: '180 60% 45%', icon: 'Image' },
  'task':                   { label: 'Task',                color: '200 40% 55%', icon: 'CheckSquare' },
  'risk':                   { label: 'Risk',                color: '15 85% 55%',  icon: 'AlertTriangle' },
  'milestone':              { label: 'Milestone',           color: '265 60% 60%', icon: 'Flag' },
  'sticky-note':            { label: 'Sticky Note',         color: '55 90% 60%',  icon: 'StickyNote' },
  'raid':                   { label: 'Raid',                color: '0 80% 50%',   icon: 'Swords' },
  'event':                  { label: 'Event',               color: '38 92% 55%',  icon: 'Calendar' },
};

export const EDGE_TYPE_CONFIG: Record<EdgeType, { label: string; color: string }> = {
  'depends-on':            { label: 'Depends On',           color: '0 72% 55%' },
  'related-to':            { label: 'Related To',           color: '220 60% 55%' },
  'unlocks':               { label: 'Unlocks',              color: '142 70% 45%' },
  'supports':              { label: 'Supports',             color: '200 90% 55%' },
  'blocked-by':            { label: 'Blocked By',           color: '0 90% 45%' },
  'belongs-to':            { label: 'Belongs To',           color: '265 60% 55%' },
  'influences':            { label: 'Influences',           color: '38 92% 55%' },
  'narrative-link':        { label: 'Narrative Link',       color: '290 70% 55%' },
  'production-dependency': { label: 'Production Dep.',      color: '15 85% 55%' },
  'asset-requirement':     { label: 'Asset Requirement',    color: '180 60% 45%' },
};

// Dialogue Variable types
export type DialogueVarType = 'boolean' | 'number' | 'string';

export interface DialogueVariable {
  id: string;
  project_id: string;
  name: string;
  var_type: DialogueVarType;
  default_value: string;
  description?: string;
}

export interface VarSetAction {
  variable_id: string;
  operation: 'set' | 'increment' | 'decrement' | 'toggle';
  value: string;
}

export interface StructuredCondition {
  variable_id: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=';
  value: string;
}

// Dialogue Tree types
export type DialogueNodeType = 'npc-line' | 'player-choice' | 'condition' | 'random' | 'hub' | 'start' | 'end';

export interface DialogueNode {
  id: string;
  project_id: string;
  tree_id: string;
  node_type: DialogueNodeType;
  character_id?: string;
  text: string;
  condition?: string;
  set_variables?: VarSetAction[];
  structured_condition?: StructuredCondition;
  position_x: number;
  position_y: number;
  tags?: string[];
}

export interface DialogueEdge {
  id: string;
  tree_id: string;
  source_node_id: string;
  target_node_id: string;
  label?: string;
  condition?: string;
  structured_condition?: StructuredCondition;
}

export interface DialogueTree {
  id: string;
  project_id: string;
  name: string;
  description?: string;
}

// Localization types
export interface LocaleString {
  id: string;
  project_id: string;
  string_key: string;
  locale: string;
  value: string;
  context?: string;
}

// Item / Loot Table types
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type ItemCategory = 'weapon' | 'armor' | 'consumable' | 'material' | 'key-item' | 'currency' | 'accessory' | 'quest-item';

export interface GameItem {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  category: ItemCategory;
  rarity: ItemRarity;
  icon_url?: string;
  image_url?: string;
  stats: Record<string, number>;
  tags: string[];
  value?: number;
  stackable?: boolean;
  max_stack?: number;
  status: PlanningStatus;
  linked_node_ids?: string[];
  item_number?: number | string;
  item_type?: string;
  equip_slot?: string;
  equip_mode?: string;
  era?: string;
  origin?: string;
  lore?: string;
  effect?: string;
  play_style?: string;
  visual_prompt?: string;
  custom_fields?: Record<string, string | number>;
}

export interface LootTableEntry {
  item_id: string;
  drop_rate: number;
  min_quantity: number;
  max_quantity: number;
}

export interface LootTable {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  entries: LootTableEntry[];
}

export const ITEM_RARITY_CONFIG: Record<ItemRarity, { label: string; color: string; emoji: string }> = {
  'common':    { label: 'Common',    color: '220 10% 60%',  emoji: '⚪' },
  'uncommon':  { label: 'Uncommon',  color: '142 70% 45%',  emoji: '🟢' },
  'rare':      { label: 'Rare',      color: '200 90% 55%',  emoji: '🔵' },
  'epic':      { label: 'Epic',      color: '265 85% 65%',  emoji: '🟣' },
  'legendary': { label: 'Legendary', color: '45 100% 50%',  emoji: '🟡' },
  'mythic':    { label: 'Mythic',    color: '0 72% 55%',    emoji: '🔴' },
};

export const ITEM_CATEGORY_CONFIG: Record<ItemCategory, { label: string; emoji: string }> = {
  'weapon':     { label: 'Weapon',     emoji: '⚔️' },
  'armor':      { label: 'Armor',      emoji: '🛡️' },
  'consumable': { label: 'Consumable', emoji: '🧪' },
  'material':   { label: 'Material',   emoji: '🪨' },
  'key-item':   { label: 'Key Item',   emoji: '🔑' },
  'currency':   { label: 'Currency',   emoji: '💰' },
  'accessory':  { label: 'Accessory',  emoji: '💍' },
  'quest-item': { label: 'Quest Item', emoji: '📜' },
};

// Item Set & Crafting types
export interface ItemSetBonus {
  pieces_required: number;
  description: string;
  stats: Record<string, number>;
}

export interface ItemSet {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  item_ids: string[];
  bonuses: ItemSetBonus[];
}

export interface CraftingIngredient {
  item_id: string;
  quantity: number;
}

export interface CraftingRecipe {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  ingredients: CraftingIngredient[];
  output_item_id: string;
  output_quantity: number;
  crafting_time?: number;
  skill_requirements?: Record<string, number>;
  tags?: string[];
}

// Quest types
export type QuestType = 'main' | 'side' | 'daily' | 'weekly' | 'hidden' | 'chain';
export type ObjectiveType = 'kill' | 'collect' | 'deliver' | 'explore' | 'interact' | 'escort';
export type PrerequisiteType = 'complete' | 'in-progress' | 'item' | 'level';
export type RewardType = 'xp' | 'item' | 'currency' | 'reputation';

export interface QuestObjective {
  id: string;
  description: string;
  type: ObjectiveType;
  target_count: number;
  optional: boolean;
}

export interface QuestPrerequisite {
  quest_id?: string;
  type: PrerequisiteType;
  value?: string;
}

export interface QuestReward {
  type: RewardType;
  amount: number;
  item_id?: string;
  label?: string;
}

export interface Quest {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  quest_type: QuestType;
  objectives: QuestObjective[];
  prerequisites: QuestPrerequisite[];
  rewards: QuestReward[];
  linked_character_ids: string[];
  linked_zone_id?: string;
  linked_milestone_id?: string;
  chain_order: number;
  parent_quest_id?: string;
  branch_label?: string;
  status: PlanningStatus;
  priority: Priority;
  tags: string[];
  estimated_duration?: string;
}

export const QUEST_TYPE_CONFIG: Record<QuestType, { label: string; color: string; emoji: string }> = {
  'main':   { label: 'Main',   color: '265 85% 65%', emoji: '⭐' },
  'side':   { label: 'Side',   color: '200 90% 55%', emoji: '📋' },
  'daily':  { label: 'Daily',  color: '142 70% 45%', emoji: '📅' },
  'weekly': { label: 'Weekly', color: '38 92% 55%',  emoji: '📆' },
  'hidden': { label: 'Hidden', color: '0 72% 55%',   emoji: '🔍' },
  'chain':  { label: 'Chain',  color: '330 70% 55%', emoji: '🔗' },
};

export const OBJECTIVE_TYPE_CONFIG: Record<ObjectiveType, { label: string; emoji: string }> = {
  'kill':     { label: 'Kill',     emoji: '⚔️' },
  'collect':  { label: 'Collect',  emoji: '🎒' },
  'deliver':  { label: 'Deliver',  emoji: '📦' },
  'explore':  { label: 'Explore',  emoji: '🗺️' },
  'interact': { label: 'Interact', emoji: '💬' },
  'escort':   { label: 'Escort',   emoji: '🛡️' },
};

// Economy Simulation types
export type CurveType = 'xp' | 'currency' | 'drop-rate' | 'currency-flow';

export interface EconomyCurvePoint {
  level: number;
  value: number;
}

export interface EconomyCurve {
  id: string;
  project_id: string;
  name: string;
  curve_type: CurveType;
  data_points: EconomyCurvePoint[];
  description?: string;
}

// Level/World Editor types
export type ZoneType = 'overworld' | 'dungeon' | 'town' | 'arena' | 'hub';

export interface ZoneEncounter {
  name: string;
  enemy_ids: string[];
  position: { x: number; y: number };
  difficulty: string;
}

export interface WorldZone {
  id: string;
  project_id: string;
  name: string;
  zone_type: ZoneType;
  description?: string;
  grid_data: Record<string, any>;
  encounters: ZoneEncounter[];
  connected_zone_ids: string[];
  tags: string[];
  status: PlanningStatus;
  priority: Priority;
}

export const ZONE_TYPE_CONFIG: Record<ZoneType, { label: string; color: string; emoji: string }> = {
  'overworld': { label: 'Overworld', color: '142 70% 45%', emoji: '🌍' },
  'dungeon':   { label: 'Dungeon',   color: '0 72% 55%',   emoji: '🏰' },
  'town':      { label: 'Town',      color: '200 90% 55%', emoji: '🏘️' },
  'arena':     { label: 'Arena',     color: '38 92% 55%',  emoji: '⚔️' },
  'hub':       { label: 'Hub',       color: '265 85% 65%', emoji: '🔮' },
};

// Playtesting Journal types
export type PlaytestStatus = 'planned' | 'in-progress' | 'completed' | 'cancelled';
export type FeedbackCategory = 'bug' | 'suggestion' | 'praise' | 'ux-issue' | 'balance';
export type FeedbackSeverity = 'critical' | 'major' | 'minor' | 'cosmetic';

export interface PlaytestFeedback {
  category: FeedbackCategory;
  text: string;
  severity: FeedbackSeverity;
}

export interface PlaytestActionItem {
  text: string;
  assignee?: string;
  status: 'open' | 'done';
  linked_task_id?: string;
}

export interface PlaytestSession {
  id: string;
  project_id: string;
  title: string;
  session_date?: string;
  duration_minutes?: number;
  tester_name?: string;
  build_version?: string;
  notes?: string;
  feedback: PlaytestFeedback[];
  action_items: PlaytestActionItem[];
  tags: string[];
  status: PlaytestStatus;
}

export const FEEDBACK_CATEGORY_CONFIG: Record<FeedbackCategory, { label: string; color: string; emoji: string }> = {
  'bug':        { label: 'Bug',        color: '0 72% 55%',   emoji: '🐛' },
  'suggestion': { label: 'Suggestion', color: '200 90% 55%', emoji: '💡' },
  'praise':     { label: 'Praise',     color: '142 70% 45%', emoji: '👍' },
  'ux-issue':   { label: 'UX Issue',   color: '38 92% 55%',  emoji: '🖱️' },
  'balance':    { label: 'Balance',    color: '265 85% 65%', emoji: '⚖️' },
};

export const DIALOGUE_NODE_CONFIG: Record<DialogueNodeType, { label: string; color: string; emoji: string }> = {
  'start':          { label: 'Start',          color: '142 70% 45%', emoji: '▶️' },
  'npc-line':       { label: 'NPC Line',       color: '200 90% 55%', emoji: '💬' },
  'player-choice':  { label: 'Player Choice',  color: '38 92% 55%',  emoji: '🔀' },
  'condition':      { label: 'Condition',       color: '265 85% 65%', emoji: '❓' },
  'random':         { label: 'Random',          color: '330 70% 55%', emoji: '🎲' },
  'hub':            { label: 'Hub',             color: '170 60% 50%', emoji: '🔄' },
  'end':            { label: 'End',             color: '0 72% 55%',   emoji: '🏁' },
};
