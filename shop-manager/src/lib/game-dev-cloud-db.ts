/**
 * Cloud database helpers for Game Development module.
 * All tables use the `gd_` prefix and shop_id-based multi-tenancy.
 * Mutations are optimistic (fire-and-forget) with error logging.
 */
import { supabase } from '@/integrations/supabase/client';

async function getShopId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  if (!uid) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('shop_id')
    .or(`id.eq.${uid},user_id.eq.${uid}`)
    .maybeSingle();

  return profile?.shop_id ?? null;
}

async function getUid(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

/** Generic upsert for any gd_ table */
export async function gdCloudUpsert(table: string, row: Record<string, any>) {
  const shopId = await getShopId();
  const uid = await getUid();
  if (!shopId || !uid) return;

  const { error } = await (supabase as any)
    .from(table)
    .upsert({ ...row, shop_id: shopId, user_id: uid }, { onConflict: 'id' });

  if (error) {
    console.error(`[GD Cloud] upsert ${table} failed:`, error.message);
  }
}

/** Generic delete for any gd_ table */
export async function gdCloudDelete(table: string, id: string) {
  const { error } = await (supabase as any).from(table).delete().eq('id', id);
  if (error) {
    console.error(`[GD Cloud] delete ${table} failed:`, error.message);
  }
}

/** Bulk delete by a column value */
export async function gdCloudDeleteWhere(table: string, column: string, value: string) {
  const { error } = await (supabase as any).from(table).delete().eq(column, value);
  if (error) {
    console.error(`[GD Cloud] deleteWhere ${table}.${column}=${value} failed:`, error.message);
  }
}

// Table-specific helpers pointing to gd_ prefixed tables

export const gdProject = {
  upsert: (row: Record<string, any>) => gdCloudUpsert('gd_projects', row),
  delete: (id: string) => gdCloudDelete('gd_projects', id),
};

export const gdBoard = {
  upsert: (row: Record<string, any>) => gdCloudUpsert('gd_boards', row),
  delete: (id: string) => gdCloudDelete('gd_boards', id),
};

export const gdBoardNode = {
  upsert: (row: Record<string, any>) => gdCloudUpsert('gd_board_nodes', row),
  delete: (id: string) => gdCloudDelete('gd_board_nodes', id),
};

export const gdBoardEdge = {
  upsert: (row: Record<string, any>) => gdCloudUpsert('gd_board_edges', row),
  delete: (id: string) => gdCloudDelete('gd_board_edges', id),
};

export const gdMilestone = {
  upsert: (row: Record<string, any>) => gdCloudUpsert('gd_milestones', row),
  delete: (id: string) => gdCloudDelete('gd_milestones', id),
};

export const gdRoadmapBoard = {
  upsert: (row: Record<string, any>) => gdCloudUpsert('gd_roadmap_boards', row),
  delete: (id: string) => gdCloudDelete('gd_roadmap_boards', id),
};

export const gdPlanTask = {
  upsert: (row: Record<string, any>) => gdCloudUpsert('gd_plan_tasks', row),
  delete: (id: string) => gdCloudDelete('gd_plan_tasks', id),
};

export const gdPlanningRecord = {
  upsert: (row: Record<string, any>) => gdCloudUpsert('gd_planning_records', row),
  delete: (id: string) => gdCloudDelete('gd_planning_records', id),
};

export const gdAssetRequirement = {
  upsert: (row: Record<string, any>) => gdCloudUpsert('gd_asset_requirements', row),
  delete: (id: string) => gdCloudDelete('gd_asset_requirements', id),
};

export const gdDesignDoc = {
  upsert: (row: Record<string, any>) => gdCloudUpsert('gd_design_docs', row),
  delete: (id: string) => gdCloudDelete('gd_design_docs', id),
};

export const gdCharacter = {
  upsert: (row: Record<string, any>) => gdCloudUpsert('gd_characters', row),
  delete: (id: string) => gdCloudDelete('gd_characters', id),
};

export const gdCharacterRelation = {
  upsert: (row: Record<string, any>) => gdCloudUpsert('gd_character_relations', row),
  delete: (id: string) => gdCloudDelete('gd_character_relations', id),
};

export const gdCharacterArc = {
  upsert: (row: Record<string, any>) => gdCloudUpsert('gd_character_arcs', row),
  delete: (id: string) => gdCloudDelete('gd_character_arcs', id),
};

export const gdFaction = {
  upsert: (row: Record<string, any>) => gdCloudUpsert('gd_factions', row),
  delete: (id: string) => gdCloudDelete('gd_factions', id),
};

export const gdStoryBeat = {
  upsert: (row: Record<string, any>) => gdCloudUpsert('gd_story_beats', row),
  delete: (id: string) => gdCloudDelete('gd_story_beats', id),
};

export const gdStoryConnection = {
  upsert: (row: Record<string, any>) => gdCloudUpsert('gd_story_connections', row),
  delete: (id: string) => gdCloudDelete('gd_story_connections', id),
};

export const gdWikiArticle = {
  upsert: (row: Record<string, any>) => gdCloudUpsert('gd_wiki_articles', row),
  delete: (id: string) => gdCloudDelete('gd_wiki_articles', id),
};

export const gdGameItem = {
  upsert: (row: Record<string, any>) => gdCloudUpsert('gd_game_items', row),
  delete: (id: string) => gdCloudDelete('gd_game_items', id),
};

export const gdLootTable = {
  upsert: (row: Record<string, any>) => gdCloudUpsert('gd_loot_tables', row),
  delete: (id: string) => gdCloudDelete('gd_loot_tables', id),
};

export const gdItemSet = {
  upsert: (row: Record<string, any>) => gdCloudUpsert('gd_item_sets', row),
  delete: (id: string) => gdCloudDelete('gd_item_sets', id),
};

export const gdCraftingRecipe = {
  upsert: (row: Record<string, any>) => gdCloudUpsert('gd_crafting_recipes', row),
  delete: (id: string) => gdCloudDelete('gd_crafting_recipes', id),
};

export const gdDialogueTree = {
  upsert: (row: Record<string, any>) => gdCloudUpsert('gd_dialogue_trees', row),
  delete: (id: string) => gdCloudDelete('gd_dialogue_trees', id),
};

export const gdDialogueNode = {
  upsert: (row: Record<string, any>) => gdCloudUpsert('gd_dialogue_nodes', row),
  delete: (id: string) => gdCloudDelete('gd_dialogue_nodes', id),
};

export const gdDialogueEdge = {
  upsert: (row: Record<string, any>) => gdCloudUpsert('gd_dialogue_edges', row),
  delete: (id: string) => gdCloudDelete('gd_dialogue_edges', id),
};

export const gdDialogueVariable = {
  upsert: (row: Record<string, any>) => gdCloudUpsert('gd_dialogue_variables', row),
  delete: (id: string) => gdCloudDelete('gd_dialogue_variables', id),
};

export const gdCrossCanvasLink = {
  upsert: (row: Record<string, any>) => gdCloudUpsert('gd_cross_canvas_links', row),
  delete: (id: string) => gdCloudDelete('gd_cross_canvas_links', id),
};

export const gdCustomDbField = {
  upsert: (row: Record<string, any>) => gdCloudUpsert('gd_custom_db_fields', row),
  delete: (id: string) => gdCloudDelete('gd_custom_db_fields', id),
};

export const gdRaid = {
  upsert: (row: Record<string, any>) => gdCloudUpsert('gd_raids', row),
  delete: (id: string) => gdCloudDelete('gd_raids', id),
};

export const gdEvent = {
  upsert: (row: Record<string, any>) => gdCloudUpsert('gd_events', row),
  delete: (id: string) => gdCloudDelete('gd_events', id),
};

export const gdEconomyCurve = {
  upsert: (row: Record<string, any>) => gdCloudUpsert('gd_economy_curves', row),
  delete: (id: string) => gdCloudDelete('gd_economy_curves', id),
};

export const gdWorldZone = {
  upsert: (row: Record<string, any>) => gdCloudUpsert('gd_world_zones', row),
  delete: (id: string) => gdCloudDelete('gd_world_zones', id),
};

export const gdPlaytestSession = {
  upsert: (row: Record<string, any>) => gdCloudUpsert('gd_playtest_sessions', row),
  delete: (id: string) => gdCloudDelete('gd_playtest_sessions', id),
};

export const gdLocaleString = {
  upsert: (row: Record<string, any>) => gdCloudUpsert('gd_locale_strings', row),
  delete: (id: string) => gdCloudDelete('gd_locale_strings', id),
};

export const gdQuest = {
  upsert: (row: Record<string, any>) => gdCloudUpsert('gd_quests', row),
  delete: (id: string) => gdCloudDelete('gd_quests', id),
};
