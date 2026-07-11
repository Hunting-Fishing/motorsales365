/**
 * Game Development Module — Zustand Store
 * Adapted from 138 Cosmos app-store.ts with shop_id multi-tenancy.
 * No seed/demo data — starts empty and loads from cloud.
 */
import { create } from 'zustand';
import {
  gdProject, gdBoard, gdBoardNode, gdBoardEdge,
  gdMilestone, gdRoadmapBoard, gdPlanTask,
  gdPlanningRecord, gdAssetRequirement, gdDesignDoc,
  gdCharacter, gdCharacterRelation, gdCharacterArc,
  gdFaction, gdStoryBeat, gdStoryConnection, gdWikiArticle,
  gdGameItem, gdLootTable, gdItemSet, gdCraftingRecipe,
  gdDialogueTree, gdDialogueNode, gdDialogueEdge, gdDialogueVariable,
  gdCrossCanvasLink, gdCustomDbField, gdRaid, gdEvent,
  gdEconomyCurve, gdWorldZone, gdPlaytestSession,
  gdCloudDeleteWhere, gdLocaleString, gdQuest,
} from '@/lib/game-dev-cloud-db';
import type {
  GdProject, Board, BoardNode, BoardEdge, CrossCanvasLink, PlanningRecord, Milestone,
  AssetRequirement, DesignDoc, StoryBeat, StoryConnection,
  GameCharacter, CharacterRelation, CharacterArcEntry, Faction,
  RaidPlan, EventPlan, WikiArticle, PlanTask, RoadmapBoard,
  GameItem, LootTable, CustomDbField, ItemSet, CraftingRecipe,
  DialogueTree, DialogueNode, DialogueEdge, DialogueVariable,
  EconomyCurve, WorldZone, PlaytestSession, LocaleString, Quest,
} from '@/types/game-development';

let counter = 100;
const genId = () => `gd-${Date.now()}-${counter++}`;

interface GameDevState {
  // Data
  projects: GdProject[];
  boards: Board[];
  crossCanvasLinks: CrossCanvasLink[];
  boardNodes: BoardNode[];
  boardEdges: BoardEdge[];
  planningRecords: PlanningRecord[];
  milestones: Milestone[];
  assetRequirements: AssetRequirement[];
  designDocs: DesignDoc[];
  storyBeats: StoryBeat[];
  storyConnections: StoryConnection[];
  characters: GameCharacter[];
  characterRelations: CharacterRelation[];
  characterArcs: CharacterArcEntry[];
  factions: Faction[];
  raids: RaidPlan[];
  events: EventPlan[];
  wikiArticles: WikiArticle[];
  planTasks: PlanTask[];
  roadmapBoards: RoadmapBoard[];
  gameItems: GameItem[];
  lootTables: LootTable[];
  customDbFields: CustomDbField[];
  itemSets: ItemSet[];
  craftingRecipes: CraftingRecipe[];
  dialogueTrees: DialogueTree[];
  dialogueNodes: DialogueNode[];
  dialogueEdges: DialogueEdge[];
  dialogueVariables: DialogueVariable[];
  economyCurves: EconomyCurve[];
  worldZones: WorldZone[];
  playtestSessions: PlaytestSession[];
  localeStrings: LocaleString[];
  quests: Quest[];

  // UI State
  activeProjectId: string | null;
  activeBoardId: string | null;
  activeRoadmapId: string | null;

  // Actions — Navigation
  setActiveProject: (id: string | null) => void;
  setActiveBoard: (id: string | null) => void;
  setActiveRoadmap: (id: string | null) => void;

  // Bulk load from cloud
  loadFromCloud: (data: Partial<GameDevState>) => void;

  // CRUD Actions
  addProject: (p: Omit<GdProject, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'shop_id'>) => string;
  updateProject: (id: string, data: Partial<GdProject>) => void;
  removeProject: (id: string) => void;
  duplicateProject: (id: string) => string;

  addBoard: (b: Omit<Board, 'id'>) => string;
  updateBoard: (id: string, data: Partial<Board>) => void;
  removeBoard: (id: string) => void;

  addRoadmapBoard: (b: Omit<RoadmapBoard, 'id'>) => string;
  updateRoadmapBoard: (id: string, data: Partial<RoadmapBoard>) => void;
  removeRoadmapBoard: (id: string) => void;

  addBoardNode: (node: Omit<BoardNode, 'id'>) => string;
  updateBoardNode: (id: string, data: Partial<BoardNode>) => void;
  removeBoardNode: (id: string) => void;

  addBoardEdge: (edge: Omit<BoardEdge, 'id'>) => string;
  updateBoardEdge: (id: string, data: Partial<BoardEdge>) => void;
  removeBoardEdge: (id: string) => void;

  addCrossCanvasLink: (link: Omit<CrossCanvasLink, 'id'>) => string;
  removeCrossCanvasLink: (id: string) => void;

  addPlanningRecord: (r: Omit<PlanningRecord, 'id' | 'created_at'>) => string;
  updatePlanningRecord: (id: string, data: Partial<PlanningRecord>) => void;
  removePlanningRecord: (id: string) => void;

  addMilestone: (m: Omit<Milestone, 'id'>) => string;
  updateMilestone: (id: string, data: Partial<Milestone>) => void;

  addAssetRequirement: (a: Omit<AssetRequirement, 'id'>) => string;
  updateAssetRequirement: (id: string, data: Partial<AssetRequirement>) => void;
  removeAssetRequirement: (id: string) => void;

  addStoryBeat: (b: Omit<StoryBeat, 'id'>) => string;
  updateStoryBeat: (id: string, data: Partial<StoryBeat>) => void;
  removeStoryBeat: (id: string) => void;
  addStoryConnection: (c: Omit<StoryConnection, 'id'>) => string;
  removeStoryConnection: (id: string) => void;

  addCharacter: (c: Omit<GameCharacter, 'id'>) => string;
  updateCharacter: (id: string, data: Partial<GameCharacter>) => void;
  removeCharacter: (id: string) => void;
  addCharacterRelation: (r: Omit<CharacterRelation, 'id'>) => string;
  removeCharacterRelation: (id: string) => void;
  addCharacterArc: (a: Omit<CharacterArcEntry, 'id'>) => string;
  updateCharacterArc: (id: string, data: Partial<CharacterArcEntry>) => void;
  removeCharacterArc: (id: string) => void;
  addFaction: (f: Omit<Faction, 'id'>) => string;
  updateFaction: (id: string, data: Partial<Faction>) => void;
  removeFaction: (id: string) => void;

  addRaid: (r: Omit<RaidPlan, 'id'>) => string;
  updateRaid: (id: string, data: Partial<RaidPlan>) => void;
  removeRaid: (id: string) => void;
  addEvent: (e: Omit<EventPlan, 'id'>) => string;
  updateEvent: (id: string, data: Partial<EventPlan>) => void;
  removeEvent: (id: string) => void;

  addWikiArticle: (a: Omit<WikiArticle, 'id' | 'created_at' | 'updated_at'>) => string;
  updateWikiArticle: (id: string, data: Partial<WikiArticle>) => void;
  removeWikiArticle: (id: string) => void;

  addPlanTask: (t: Omit<PlanTask, 'id' | 'created_at'>) => string;
  updatePlanTask: (id: string, data: Partial<PlanTask>) => void;
  removePlanTask: (id: string) => void;

  addGameItem: (item: Omit<GameItem, 'id'>) => string;
  updateGameItem: (id: string, data: Partial<GameItem>) => void;
  removeGameItem: (id: string) => void;
  addLootTable: (table: Omit<LootTable, 'id'>) => string;
  updateLootTable: (id: string, data: Partial<LootTable>) => void;
  removeLootTable: (id: string) => void;
  addCustomDbField: (f: Omit<CustomDbField, 'id'>) => string;
  removeCustomDbField: (id: string) => void;

  addItemSet: (s: Omit<ItemSet, 'id'>) => string;
  updateItemSet: (id: string, data: Partial<ItemSet>) => void;
  removeItemSet: (id: string) => void;
  addCraftingRecipe: (r: Omit<CraftingRecipe, 'id'>) => string;
  updateCraftingRecipe: (id: string, data: Partial<CraftingRecipe>) => void;
  removeCraftingRecipe: (id: string) => void;

  addDialogueTree: (t: Omit<DialogueTree, 'id'>) => string;
  updateDialogueTree: (id: string, data: Partial<DialogueTree>) => void;
  removeDialogueTree: (id: string) => void;
  addDialogueNode: (n: Omit<DialogueNode, 'id'>) => string;
  updateDialogueNode: (id: string, data: Partial<DialogueNode>) => void;
  removeDialogueNode: (id: string) => void;
  addDialogueEdge: (e: Omit<DialogueEdge, 'id'>) => string;
  removeDialogueEdge: (id: string) => void;
  addDialogueVariable: (v: Omit<DialogueVariable, 'id'>) => string;
  updateDialogueVariable: (id: string, data: Partial<DialogueVariable>) => void;
  removeDialogueVariable: (id: string) => void;

  addEconomyCurve: (c: Omit<EconomyCurve, 'id'>) => string;
  updateEconomyCurve: (id: string, data: Partial<EconomyCurve>) => void;
  removeEconomyCurve: (id: string) => void;

  addWorldZone: (z: Omit<WorldZone, 'id'>) => string;
  updateWorldZone: (id: string, data: Partial<WorldZone>) => void;
  removeWorldZone: (id: string) => void;

  addPlaytestSession: (s: Omit<PlaytestSession, 'id'>) => string;
  updatePlaytestSession: (id: string, data: Partial<PlaytestSession>) => void;
  removePlaytestSession: (id: string) => void;

  addLocaleString: (ls: Omit<LocaleString, 'id'>) => string;
  updateLocaleString: (id: string, data: Partial<LocaleString>) => void;
  removeLocaleString: (id: string) => void;

  addQuest: (q: Omit<Quest, 'id'>) => string;
  updateQuest: (id: string, data: Partial<Quest>) => void;
  removeQuest: (id: string) => void;
}

export const useGameDevStore = create<GameDevState>()((set, get) => ({
  // Empty initial state — data loaded from cloud
  projects: [],
  boards: [],
  crossCanvasLinks: [],
  boardNodes: [],
  boardEdges: [],
  planningRecords: [],
  milestones: [],
  assetRequirements: [],
  designDocs: [],
  storyBeats: [],
  storyConnections: [],
  characters: [],
  characterRelations: [],
  characterArcs: [],
  factions: [],
  raids: [],
  events: [],
  wikiArticles: [],
  planTasks: [],
  roadmapBoards: [],
  gameItems: [],
  lootTables: [],
  customDbFields: [],
  itemSets: [],
  craftingRecipes: [],
  dialogueTrees: [],
  dialogueNodes: [],
  dialogueEdges: [],
  dialogueVariables: [],
  economyCurves: [],
  worldZones: [],
  playtestSessions: [],
  localeStrings: [],
  quests: [],
  activeProjectId: null,
  activeBoardId: null,
  activeRoadmapId: null,

  // Navigation
  setActiveProject: (id) => set({ activeProjectId: id }),
  setActiveBoard: (id) => set({ activeBoardId: id }),
  setActiveRoadmap: (id) => set({ activeRoadmapId: id }),

  // Bulk load
  loadFromCloud: (data) => set(data),

  // Project CRUD
  addProject: (p) => {
    const id = genId();
    const now = new Date().toISOString();
    const project: GdProject = { ...p, id, user_id: '', shop_id: '', created_at: now, updated_at: now };
    const boardId = genId();
    const board = { id: boardId, project_id: id, name: 'Core Systems' };
    set(s => ({ projects: [...s.projects, project], boards: [...s.boards, board] }));
    gdProject.upsert({ ...project, platform_targets: JSON.stringify(project.platform_targets) });
    gdBoard.upsert(board);
    return id;
  },
  updateProject: (id, data) => {
    set(s => ({ projects: s.projects.map(p => p.id === id ? { ...p, ...data, updated_at: new Date().toISOString() } : p) }));
    const updated = get().projects.find(p => p.id === id);
    if (updated) gdProject.upsert({ ...updated, platform_targets: JSON.stringify(updated.platform_targets) });
  },
  removeProject: (id) => {
    const boardIds = get().boards.filter(b => b.project_id === id).map(b => b.id);
    set(s => {
      const newActiveId = s.activeProjectId === id ? (s.projects.find(p => p.id !== id)?.id ?? null) : s.activeProjectId;
      return {
        projects: s.projects.filter(p => p.id !== id),
        boards: s.boards.filter(b => b.project_id !== id),
        boardNodes: s.boardNodes.filter(n => !boardIds.includes(n.board_id)),
        boardEdges: s.boardEdges.filter(e => !boardIds.includes(e.board_id)),
        planningRecords: s.planningRecords.filter(r => r.project_id !== id),
        milestones: s.milestones.filter(m => m.project_id !== id),
        assetRequirements: s.assetRequirements.filter(a => a.project_id !== id),
        storyBeats: s.storyBeats.filter(b => b.project_id !== id),
        storyConnections: s.storyConnections.filter(c => c.project_id !== id),
        characters: s.characters.filter(c => c.project_id !== id),
        characterRelations: s.characterRelations.filter(r => r.project_id !== id),
        characterArcs: s.characterArcs.filter(a => {
          const charIds = s.characters.filter(c => c.project_id === id).map(c => c.id);
          return !charIds.includes(a.character_id);
        }),
        factions: s.factions.filter(f => f.project_id !== id),
        raids: s.raids.filter(r => r.project_id !== id),
        events: s.events.filter(e => e.project_id !== id),
        wikiArticles: s.wikiArticles.filter(a => a.project_id !== id),
        planTasks: s.planTasks.filter(t => t.project_id !== id),
        roadmapBoards: s.roadmapBoards.filter(r => r.project_id !== id),
        gameItems: s.gameItems.filter(i => i.project_id !== id),
        lootTables: s.lootTables.filter(lt => lt.project_id !== id),
        itemSets: s.itemSets.filter(is => is.project_id !== id),
        craftingRecipes: s.craftingRecipes.filter(cr => cr.project_id !== id),
        crossCanvasLinks: s.crossCanvasLinks.filter(l => l.project_id !== id),
        customDbFields: s.customDbFields.filter(f => f.project_id !== id),
        dialogueTrees: s.dialogueTrees.filter(t => t.project_id !== id),
        dialogueNodes: s.dialogueNodes.filter(n => n.project_id !== id),
        dialogueEdges: s.dialogueEdges.filter(e => {
          const treeIds = s.dialogueTrees.filter(t => t.project_id === id).map(t => t.id);
          return !treeIds.includes(e.tree_id);
        }),
        quests: s.quests.filter(q => q.project_id !== id),
        activeProjectId: newActiveId,
        activeBoardId: s.activeProjectId === id ? null : s.activeBoardId,
        activeRoadmapId: s.activeProjectId === id ? null : s.activeRoadmapId,
      };
    });
    gdProject.delete(id);
    gdCloudDeleteWhere('gd_boards', 'project_id', id);
    boardIds.forEach(bid => {
      gdCloudDeleteWhere('gd_board_nodes', 'board_id', bid);
      gdCloudDeleteWhere('gd_board_edges', 'board_id', bid);
    });
    gdCloudDeleteWhere('gd_milestones', 'project_id', id);
    gdCloudDeleteWhere('gd_roadmap_boards', 'project_id', id);
    gdCloudDeleteWhere('gd_plan_tasks', 'project_id', id);
    gdCloudDeleteWhere('gd_planning_records', 'project_id', id);
    gdCloudDeleteWhere('gd_asset_requirements', 'project_id', id);
    gdCloudDeleteWhere('gd_design_docs', 'project_id', id);
    gdCloudDeleteWhere('gd_characters', 'project_id', id);
    gdCloudDeleteWhere('gd_character_relations', 'project_id', id);
    gdCloudDeleteWhere('gd_factions', 'project_id', id);
    gdCloudDeleteWhere('gd_story_beats', 'project_id', id);
    gdCloudDeleteWhere('gd_story_connections', 'project_id', id);
    gdCloudDeleteWhere('gd_wiki_articles', 'project_id', id);
    gdCloudDeleteWhere('gd_game_items', 'project_id', id);
    gdCloudDeleteWhere('gd_loot_tables', 'project_id', id);
    gdCloudDeleteWhere('gd_item_sets', 'project_id', id);
    gdCloudDeleteWhere('gd_crafting_recipes', 'project_id', id);
    gdCloudDeleteWhere('gd_dialogue_trees', 'project_id', id);
    gdCloudDeleteWhere('gd_dialogue_nodes', 'project_id', id);
    gdCloudDeleteWhere('gd_cross_canvas_links', 'project_id', id);
    gdCloudDeleteWhere('gd_custom_db_fields', 'project_id', id);
    gdCloudDeleteWhere('gd_raids', 'project_id', id);
    gdCloudDeleteWhere('gd_events', 'project_id', id);
    gdCloudDeleteWhere('gd_quests', 'project_id', id);
  },

  duplicateProject: (id) => {
    const s = get();
    const project = s.projects.find(p => p.id === id);
    if (!project) return '';
    const newProjectId = genId();
    const idMap = new Map<string, string>();
    const mapId = (oldId: string) => { if (!idMap.has(oldId)) idMap.set(oldId, genId()); return idMap.get(oldId)!; };
    const ts = new Date().toISOString();
    const newProject = { ...project, id: newProjectId, name: `${project.name} (Copy)`, created_at: ts, updated_at: ts };
    const newBoards = s.boards.filter(b => b.project_id === id).map(b => ({ ...b, id: mapId(b.id), project_id: newProjectId }));
    const oldBoardIds = s.boards.filter(b => b.project_id === id).map(b => b.id);
    const newNodes = s.boardNodes.filter(n => oldBoardIds.includes(n.board_id)).map(n => ({ ...n, id: mapId(n.id), board_id: mapId(n.board_id) }));
    const newEdges = s.boardEdges.filter(e => oldBoardIds.includes(e.board_id)).map(e => ({ ...e, id: mapId(e.id), board_id: mapId(e.board_id), source_node_id: mapId(e.source_node_id), target_node_id: mapId(e.target_node_id) }));

    set(state => ({
      projects: [...state.projects, newProject],
      boards: [...state.boards, ...newBoards],
      boardNodes: [...state.boardNodes, ...newNodes],
      boardEdges: [...state.boardEdges, ...newEdges],
    }));
    gdProject.upsert({ ...newProject, platform_targets: JSON.stringify(newProject.platform_targets) });
    newBoards.forEach(b => gdBoard.upsert(b));
    newNodes.forEach(n => gdBoardNode.upsert(n));
    newEdges.forEach(e => gdBoardEdge.upsert(e));
    return newProjectId;
  },

  // Board CRUD
  addBoard: (b) => { const id = genId(); const row = { ...b, id }; set(s => ({ boards: [...s.boards, row] })); gdBoard.upsert(row); return id; },
  updateBoard: (id, data) => { set(s => ({ boards: s.boards.map(b => b.id === id ? { ...b, ...data } : b) })); const u = get().boards.find(b => b.id === id); if (u) gdBoard.upsert(u); },
  removeBoard: (id) => {
    set(s => ({
      boards: s.boards.filter(b => b.id !== id),
      boardNodes: s.boardNodes.filter(n => n.board_id !== id),
      boardEdges: s.boardEdges.filter(e => e.board_id !== id),
      crossCanvasLinks: s.crossCanvasLinks.filter(l => l.source_board_id !== id && l.target_board_id !== id),
      activeBoardId: s.activeBoardId === id ? null : s.activeBoardId,
    }));
    gdBoard.delete(id);
    gdCloudDeleteWhere('gd_board_nodes', 'board_id', id);
    gdCloudDeleteWhere('gd_board_edges', 'board_id', id);
  },

  // Roadmap Board CRUD
  addRoadmapBoard: (b) => { const id = genId(); const row = { ...b, id }; set(s => ({ roadmapBoards: [...s.roadmapBoards, row] })); gdRoadmapBoard.upsert(row); return id; },
  updateRoadmapBoard: (id, data) => { set(s => ({ roadmapBoards: s.roadmapBoards.map(r => r.id === id ? { ...r, ...data } : r) })); const u = get().roadmapBoards.find(r => r.id === id); if (u) gdRoadmapBoard.upsert(u); },
  removeRoadmapBoard: (id) => { set(s => ({ roadmapBoards: s.roadmapBoards.filter(r => r.id !== id) })); gdRoadmapBoard.delete(id); },

  // Board Node CRUD
  addBoardNode: (node) => { const id = genId(); const row = { ...node, id }; set(s => ({ boardNodes: [...s.boardNodes, row] })); gdBoardNode.upsert(row); return id; },
  updateBoardNode: (id, data) => { set(s => ({ boardNodes: s.boardNodes.map(n => n.id === id ? { ...n, ...data } : n) })); const u = get().boardNodes.find(n => n.id === id); if (u) gdBoardNode.upsert(u); },
  removeBoardNode: (id) => { set(s => ({ boardNodes: s.boardNodes.filter(n => n.id !== id), boardEdges: s.boardEdges.filter(e => e.source_node_id !== id && e.target_node_id !== id) })); gdBoardNode.delete(id); },

  // Board Edge CRUD
  addBoardEdge: (edge) => { const id = genId(); const row = { ...edge, id }; set(s => ({ boardEdges: [...s.boardEdges, row] })); gdBoardEdge.upsert(row); return id; },
  updateBoardEdge: (id, data) => { set(s => ({ boardEdges: s.boardEdges.map(e => e.id === id ? { ...e, ...data } : e) })); const u = get().boardEdges.find(e => e.id === id); if (u) gdBoardEdge.upsert(u); },
  removeBoardEdge: (id) => { set(s => ({ boardEdges: s.boardEdges.filter(e => e.id !== id) })); gdBoardEdge.delete(id); },

  // Cross-Canvas Link
  addCrossCanvasLink: (link) => { const id = genId(); const row = { ...link, id }; set(s => ({ crossCanvasLinks: [...s.crossCanvasLinks, row] })); gdCrossCanvasLink.upsert(row); return id; },
  removeCrossCanvasLink: (id) => { set(s => ({ crossCanvasLinks: s.crossCanvasLinks.filter(l => l.id !== id) })); gdCrossCanvasLink.delete(id); },

  // Planning Record CRUD
  addPlanningRecord: (r) => { const id = genId(); const row = { ...r, id, created_at: new Date().toISOString() }; set(s => ({ planningRecords: [...s.planningRecords, row] })); gdPlanningRecord.upsert(row); return id; },
  updatePlanningRecord: (id, data) => { set(s => ({ planningRecords: s.planningRecords.map(r => r.id === id ? { ...r, ...data } : r) })); const u = get().planningRecords.find(r => r.id === id); if (u) gdPlanningRecord.upsert(u); },
  removePlanningRecord: (id) => { set(s => ({ planningRecords: s.planningRecords.filter(r => r.id !== id) })); gdPlanningRecord.delete(id); },

  // Milestone CRUD
  addMilestone: (m) => { const id = genId(); const row = { ...m, id }; set(s => ({ milestones: [...s.milestones, row] })); gdMilestone.upsert(row); return id; },
  updateMilestone: (id, data) => { set(s => ({ milestones: s.milestones.map(m => m.id === id ? { ...m, ...data } : m) })); const u = get().milestones.find(m => m.id === id); if (u) gdMilestone.upsert(u); },

  // Asset Requirement CRUD
  addAssetRequirement: (a) => { const id = genId(); const row = { ...a, id }; set(s => ({ assetRequirements: [...s.assetRequirements, row] })); gdAssetRequirement.upsert(row); return id; },
  updateAssetRequirement: (id, data) => { set(s => ({ assetRequirements: s.assetRequirements.map(a => a.id === id ? { ...a, ...data } : a) })); const u = get().assetRequirements.find(a => a.id === id); if (u) gdAssetRequirement.upsert(u); },
  removeAssetRequirement: (id) => { set(s => ({ assetRequirements: s.assetRequirements.filter(a => a.id !== id) })); gdCloudDeleteWhere('gd_asset_requirements', 'id', id); },

  // Story Beat CRUD
  addStoryBeat: (b) => { const id = genId(); const row = { ...b, id }; set(s => ({ storyBeats: [...s.storyBeats, row] })); gdStoryBeat.upsert(row); return id; },
  updateStoryBeat: (id, data) => { set(s => ({ storyBeats: s.storyBeats.map(b => b.id === id ? { ...b, ...data } : b) })); const u = get().storyBeats.find(b => b.id === id); if (u) gdStoryBeat.upsert(u); },
  removeStoryBeat: (id) => {
    set(s => ({ storyBeats: s.storyBeats.filter(b => b.id !== id), storyConnections: s.storyConnections.filter(c => c.source_beat_id !== id && c.target_beat_id !== id) }));
    gdStoryBeat.delete(id);
    gdCloudDeleteWhere('gd_story_connections', 'source_beat_id', id);
  },
  addStoryConnection: (c) => { const id = genId(); const row = { ...c, id }; set(s => ({ storyConnections: [...s.storyConnections, row] })); gdStoryConnection.upsert(row); return id; },
  removeStoryConnection: (id) => { set(s => ({ storyConnections: s.storyConnections.filter(c => c.id !== id) })); gdStoryConnection.delete(id); },

  // Character CRUD
  addCharacter: (c) => { const id = genId(); const row = { ...c, id }; set(s => ({ characters: [...s.characters, row] })); gdCharacter.upsert(row); return id; },
  updateCharacter: (id, data) => { set(s => ({ characters: s.characters.map(c => c.id === id ? { ...c, ...data } : c) })); const u = get().characters.find(c => c.id === id); if (u) gdCharacter.upsert(u); },
  removeCharacter: (id) => {
    set(s => ({
      characters: s.characters.filter(c => c.id !== id),
      characterRelations: s.characterRelations.filter(r => r.source_character_id !== id && r.target_character_id !== id),
      characterArcs: s.characterArcs.filter(a => a.character_id !== id),
    }));
    gdCharacter.delete(id);
    gdCloudDeleteWhere('gd_character_relations', 'source_character_id', id);
    gdCloudDeleteWhere('gd_character_arcs', 'character_id', id);
  },
  addCharacterRelation: (r) => { const id = genId(); const row = { ...r, id }; set(s => ({ characterRelations: [...s.characterRelations, row] })); gdCharacterRelation.upsert(row); return id; },
  removeCharacterRelation: (id) => { set(s => ({ characterRelations: s.characterRelations.filter(r => r.id !== id) })); gdCharacterRelation.delete(id); },
  addCharacterArc: (a) => { const id = genId(); const row = { ...a, id }; set(s => ({ characterArcs: [...s.characterArcs, row] })); gdCharacterArc.upsert(row); return id; },
  updateCharacterArc: (id, data) => { set(s => ({ characterArcs: s.characterArcs.map(a => a.id === id ? { ...a, ...data } : a) })); const u = get().characterArcs.find(a => a.id === id); if (u) gdCharacterArc.upsert(u); },
  removeCharacterArc: (id) => { set(s => ({ characterArcs: s.characterArcs.filter(a => a.id !== id) })); gdCharacterArc.delete(id); },
  addFaction: (f) => { const id = genId(); const row = { ...f, id }; set(s => ({ factions: [...s.factions, row] })); gdFaction.upsert(row); return id; },
  updateFaction: (id, data) => { set(s => ({ factions: s.factions.map(f => f.id === id ? { ...f, ...data } : f) })); const u = get().factions.find(f => f.id === id); if (u) gdFaction.upsert(u); },
  removeFaction: (id) => {
    set(s => ({ factions: s.factions.filter(f => f.id !== id), characters: s.characters.map(c => c.faction_id === id ? { ...c, faction_id: undefined } : c) }));
    gdFaction.delete(id);
  },

  // Raid & Event CRUD
  addRaid: (r) => { const id = genId(); const row = { ...r, id }; set(s => ({ raids: [...s.raids, row] })); gdRaid.upsert(row); return id; },
  updateRaid: (id, data) => { set(s => ({ raids: s.raids.map(r => r.id === id ? { ...r, ...data } : r) })); const u = get().raids.find(r => r.id === id); if (u) gdRaid.upsert(u); },
  removeRaid: (id) => { set(s => ({ raids: s.raids.filter(r => r.id !== id) })); gdRaid.delete(id); },
  addEvent: (e) => { const id = genId(); const row = { ...e, id }; set(s => ({ events: [...s.events, row] })); gdEvent.upsert(row); return id; },
  updateEvent: (id, data) => { set(s => ({ events: s.events.map(e => e.id === id ? { ...e, ...data } : e) })); const u = get().events.find(e => e.id === id); if (u) gdEvent.upsert(u); },
  removeEvent: (id) => { set(s => ({ events: s.events.filter(e => e.id !== id) })); gdEvent.delete(id); },

  // Wiki CRUD
  addWikiArticle: (a) => { const id = genId(); const ts = new Date().toISOString(); const row = { ...a, id, created_at: ts, updated_at: ts }; set(s => ({ wikiArticles: [...s.wikiArticles, row] })); gdWikiArticle.upsert(row); return id; },
  updateWikiArticle: (id, data) => {
    set(s => ({
      wikiArticles: s.wikiArticles.map(a => {
        if (a.id !== id) return a;
        const revision = { timestamp: new Date().toISOString(), title: a.title, content: a.content };
        const revisions = [...(a.revisions ?? []), revision].slice(-50);
        return { ...a, ...data, revisions, updated_at: new Date().toISOString() };
      }),
    }));
    const u = get().wikiArticles.find(a => a.id === id);
    if (u) gdWikiArticle.upsert(u);
  },
  removeWikiArticle: (id) => { set(s => ({ wikiArticles: s.wikiArticles.filter(a => a.id !== id) })); gdWikiArticle.delete(id); },

  // Plan Task CRUD
  addPlanTask: (t) => { const id = genId(); const row = { ...t, id, created_at: new Date().toISOString() }; set(s => ({ planTasks: [...s.planTasks, row] })); gdPlanTask.upsert(row); return id; },
  updatePlanTask: (id, data) => { set(s => ({ planTasks: s.planTasks.map(t => t.id === id ? { ...t, ...data } : t) })); const u = get().planTasks.find(t => t.id === id); if (u) gdPlanTask.upsert(u); },
  removePlanTask: (id) => { set(s => ({ planTasks: s.planTasks.filter(t => t.id !== id) })); gdPlanTask.delete(id); },

  // Game Item & Loot CRUD
  addGameItem: (item) => { const id = genId(); const row = { ...item, id }; set(s => ({ gameItems: [...s.gameItems, row] })); gdGameItem.upsert(row); return id; },
  updateGameItem: (id, data) => { set(s => ({ gameItems: s.gameItems.map(i => i.id === id ? { ...i, ...data } : i) })); const u = get().gameItems.find(i => i.id === id); if (u) gdGameItem.upsert(u); },
  removeGameItem: (id) => {
    set(s => ({
      gameItems: s.gameItems.filter(i => i.id !== id),
      lootTables: s.lootTables.map(lt => ({ ...lt, entries: lt.entries.filter(e => e.item_id !== id) })),
    }));
    gdGameItem.delete(id);
  },
  addLootTable: (table) => { const id = genId(); const row = { ...table, id }; set(s => ({ lootTables: [...s.lootTables, row] })); gdLootTable.upsert(row); return id; },
  updateLootTable: (id, data) => { set(s => ({ lootTables: s.lootTables.map(lt => lt.id === id ? { ...lt, ...data } : lt) })); const u = get().lootTables.find(lt => lt.id === id); if (u) gdLootTable.upsert(u); },
  removeLootTable: (id) => { set(s => ({ lootTables: s.lootTables.filter(lt => lt.id !== id) })); gdLootTable.delete(id); },
  addCustomDbField: (f) => { const id = genId(); const row = { ...f, id }; set(s => ({ customDbFields: [...s.customDbFields, row] })); gdCustomDbField.upsert(row); return id; },
  removeCustomDbField: (id) => { set(s => ({ customDbFields: s.customDbFields.filter(f => f.id !== id) })); gdCustomDbField.delete(id); },

  // Item Set CRUD
  addItemSet: (s2) => { const id = genId(); const row = { ...s2, id }; set(s => ({ itemSets: [...s.itemSets, row] })); gdItemSet.upsert(row); return id; },
  updateItemSet: (id, data) => { set(s => ({ itemSets: s.itemSets.map(s2 => s2.id === id ? { ...s2, ...data } : s2) })); const u = get().itemSets.find(s2 => s2.id === id); if (u) gdItemSet.upsert(u); },
  removeItemSet: (id) => { set(s => ({ itemSets: s.itemSets.filter(s2 => s2.id !== id) })); gdItemSet.delete(id); },

  // Crafting Recipe CRUD
  addCraftingRecipe: (r) => { const id = genId(); const row = { ...r, id }; set(s => ({ craftingRecipes: [...s.craftingRecipes, row] })); gdCraftingRecipe.upsert(row); return id; },
  updateCraftingRecipe: (id, data) => { set(s => ({ craftingRecipes: s.craftingRecipes.map(r => r.id === id ? { ...r, ...data } : r) })); const u = get().craftingRecipes.find(r => r.id === id); if (u) gdCraftingRecipe.upsert(u); },
  removeCraftingRecipe: (id) => { set(s => ({ craftingRecipes: s.craftingRecipes.filter(r => r.id !== id) })); gdCraftingRecipe.delete(id); },

  // Dialogue Tree CRUD
  addDialogueTree: (t) => { const id = genId(); const row = { ...t, id }; set(s => ({ dialogueTrees: [...s.dialogueTrees, row] })); gdDialogueTree.upsert(row); return id; },
  updateDialogueTree: (id, data) => { set(s => ({ dialogueTrees: s.dialogueTrees.map(t => t.id === id ? { ...t, ...data } : t) })); const u = get().dialogueTrees.find(t => t.id === id); if (u) gdDialogueTree.upsert(u); },
  removeDialogueTree: (id) => {
    set(s => ({
      dialogueTrees: s.dialogueTrees.filter(t => t.id !== id),
      dialogueNodes: s.dialogueNodes.filter(n => n.tree_id !== id),
      dialogueEdges: s.dialogueEdges.filter(e => e.tree_id !== id),
    }));
    gdDialogueTree.delete(id);
    gdCloudDeleteWhere('gd_dialogue_nodes', 'tree_id', id);
    gdCloudDeleteWhere('gd_dialogue_edges', 'tree_id', id);
  },
  addDialogueNode: (n) => { const id = genId(); const row = { ...n, id }; set(s => ({ dialogueNodes: [...s.dialogueNodes, row] })); gdDialogueNode.upsert(row); return id; },
  updateDialogueNode: (id, data) => { set(s => ({ dialogueNodes: s.dialogueNodes.map(n => n.id === id ? { ...n, ...data } : n) })); const u = get().dialogueNodes.find(n => n.id === id); if (u) gdDialogueNode.upsert(u); },
  removeDialogueNode: (id) => {
    set(s => ({ dialogueNodes: s.dialogueNodes.filter(n => n.id !== id), dialogueEdges: s.dialogueEdges.filter(e => e.source_node_id !== id && e.target_node_id !== id) }));
    gdDialogueNode.delete(id);
  },
  addDialogueEdge: (e) => { const id = genId(); const row = { ...e, id }; set(s => ({ dialogueEdges: [...s.dialogueEdges, row] })); gdDialogueEdge.upsert(row); return id; },
  removeDialogueEdge: (id) => { set(s => ({ dialogueEdges: s.dialogueEdges.filter(e => e.id !== id) })); gdDialogueEdge.delete(id); },
  addDialogueVariable: (v) => { const id = genId(); const row = { ...v, id }; set(s => ({ dialogueVariables: [...s.dialogueVariables, row] })); gdDialogueVariable.upsert(row); return id; },
  updateDialogueVariable: (id, data) => { set(s => ({ dialogueVariables: s.dialogueVariables.map(v => v.id === id ? { ...v, ...data } : v) })); const u = get().dialogueVariables.find(v => v.id === id); if (u) gdDialogueVariable.upsert(u); },
  removeDialogueVariable: (id) => { set(s => ({ dialogueVariables: s.dialogueVariables.filter(v => v.id !== id) })); gdDialogueVariable.delete(id); },

  // Economy Curve CRUD
  addEconomyCurve: (c) => { const id = genId(); const row = { ...c, id }; set(s => ({ economyCurves: [...s.economyCurves, row] })); gdEconomyCurve.upsert(row); return id; },
  updateEconomyCurve: (id, data) => { set(s => ({ economyCurves: s.economyCurves.map(c => c.id === id ? { ...c, ...data } : c) })); const u = get().economyCurves.find(c => c.id === id); if (u) gdEconomyCurve.upsert(u); },
  removeEconomyCurve: (id) => { set(s => ({ economyCurves: s.economyCurves.filter(c => c.id !== id) })); gdEconomyCurve.delete(id); },

  // World Zone CRUD
  addWorldZone: (z) => { const id = genId(); const row = { ...z, id }; set(s => ({ worldZones: [...s.worldZones, row] })); gdWorldZone.upsert(row); return id; },
  updateWorldZone: (id, data) => { set(s => ({ worldZones: s.worldZones.map(z => z.id === id ? { ...z, ...data } : z) })); const u = get().worldZones.find(z => z.id === id); if (u) gdWorldZone.upsert(u); },
  removeWorldZone: (id) => { set(s => ({ worldZones: s.worldZones.filter(z => z.id !== id) })); gdWorldZone.delete(id); },

  // Playtest Session CRUD
  addPlaytestSession: (s2) => { const id = genId(); const row = { ...s2, id }; set(s => ({ playtestSessions: [...s.playtestSessions, row] })); gdPlaytestSession.upsert(row); return id; },
  updatePlaytestSession: (id, data) => { set(s => ({ playtestSessions: s.playtestSessions.map(ps => ps.id === id ? { ...ps, ...data } : ps) })); const u = get().playtestSessions.find(ps => ps.id === id); if (u) gdPlaytestSession.upsert(u); },
  removePlaytestSession: (id) => { set(s => ({ playtestSessions: s.playtestSessions.filter(ps => ps.id !== id) })); gdPlaytestSession.delete(id); },

  // Locale String CRUD
  addLocaleString: (ls) => { const id = genId(); const row = { ...ls, id }; set(s => ({ localeStrings: [...s.localeStrings, row] })); gdLocaleString.upsert(row); return id; },
  updateLocaleString: (id, data) => { set(s => ({ localeStrings: s.localeStrings.map(ls => ls.id === id ? { ...ls, ...data } : ls) })); const u = get().localeStrings.find(ls => ls.id === id); if (u) gdLocaleString.upsert(u); },
  removeLocaleString: (id) => { set(s => ({ localeStrings: s.localeStrings.filter(ls => ls.id !== id) })); gdLocaleString.delete(id); },

  // Quest CRUD
  addQuest: (q) => { const id = genId(); const row = { ...q, id }; set(s => ({ quests: [...s.quests, row] })); gdQuest.upsert(row); return id; },
  updateQuest: (id, data) => { set(s => ({ quests: s.quests.map(q => q.id === id ? { ...q, ...data } : q) })); const u = get().quests.find(q => q.id === id); if (u) gdQuest.upsert(u); },
  removeQuest: (id) => { set(s => ({ quests: s.quests.filter(q => q.id !== id) })); gdQuest.delete(id); },
}));
