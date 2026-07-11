import { useState } from 'react';
import { useGameDevStore } from '@/stores/game-dev-store';
import { GameDevProjectSelector } from '@/components/game-development/GameDevProjectSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Plus, Search, Trash2, Edit, Layers, FlaskConical } from 'lucide-react';
import {
  GameItem, ItemRarity, ItemCategory, LootTable, LootTableEntry,
  ItemSet, CraftingRecipe, CraftingIngredient,
  ITEM_RARITY_CONFIG, ITEM_CATEGORY_CONFIG,
} from '@/types/game-development';

export default function GameDevItems() {
  const {
    activeProjectId, gameItems, lootTables, itemSets, craftingRecipes,
    addGameItem, updateGameItem, removeGameItem,
    addLootTable, updateLootTable, removeLootTable,
    addItemSet, updateItemSet, removeItemSet,
    addCraftingRecipe, updateCraftingRecipe, removeCraftingRecipe,
  } = useGameDevStore();

  const [search, setSearch] = useState('');
  const [filterRarity, setFilterRarity] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItem, setEditingItem] = useState<GameItem | null>(null);
  const [showAddLootTable, setShowAddLootTable] = useState(false);
  const [showAddSet, setShowAddSet] = useState(false);
  const [showAddRecipe, setShowAddRecipe] = useState(false);

  // Item form state
  const [itemName, setItemName] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemCategory, setItemCategory] = useState<ItemCategory>('weapon');
  const [itemRarity, setItemRarity] = useState<ItemRarity>('common');
  const [itemValue, setItemValue] = useState('0');
  const [itemStackable, setItemStackable] = useState(false);
  const [itemMaxStack, setItemMaxStack] = useState('1');
  const [itemEffect, setItemEffect] = useState('');
  const [itemLore, setItemLore] = useState('');

  const projectItems = gameItems.filter(i => i.project_id === activeProjectId);
  const projectLootTables = lootTables.filter(l => l.project_id === activeProjectId);
  const projectSets = itemSets.filter(s => s.project_id === activeProjectId);
  const projectRecipes = craftingRecipes.filter(r => r.project_id === activeProjectId);

  const filtered = projectItems.filter(i => {
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterRarity !== 'all' && i.rarity !== filterRarity) return false;
    if (filterCategory !== 'all' && i.category !== filterCategory) return false;
    return true;
  });

  const resetItemForm = () => {
    setItemName(''); setItemDesc(''); setItemCategory('weapon'); setItemRarity('common');
    setItemValue('0'); setItemStackable(false); setItemMaxStack('1'); setItemEffect(''); setItemLore('');
  };

  const handleSaveItem = () => {
    if (!itemName.trim() || !activeProjectId) return;
    const data: Partial<GameItem> = {
      name: itemName, description: itemDesc, category: itemCategory, rarity: itemRarity,
      value: Number(itemValue) || 0, stackable: itemStackable, max_stack: Number(itemMaxStack) || 1,
      effect: itemEffect, lore: itemLore, stats: {}, tags: [], status: 'planned',
    };
    if (editingItem) {
      updateGameItem(editingItem.id, data);
    } else {
      addGameItem({ ...data, project_id: activeProjectId } as Omit<GameItem, 'id'>);
    }
    resetItemForm(); setShowAddItem(false); setEditingItem(null);
  };

  const openEdit = (item: GameItem) => {
    setEditingItem(item); setItemName(item.name); setItemDesc(item.description || '');
    setItemCategory(item.category); setItemRarity(item.rarity);
    setItemValue(String(item.value || 0)); setItemStackable(item.stackable || false);
    setItemMaxStack(String(item.max_stack || 1)); setItemEffect(item.effect || ''); setItemLore(item.lore || '');
    setShowAddItem(true);
  };

  if (!activeProjectId) {
    return (
      <div className="p-6 space-y-4">
        <GameDevProjectSelector />
        <Card><CardContent className="p-12 text-center text-muted-foreground">Select a project to manage items & loot.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6 text-primary" /> Items & Loot</h1>
          <p className="text-sm text-muted-foreground">{projectItems.length} items · {projectLootTables.length} loot tables</p>
        </div>
        <div className="flex items-center gap-2">
          <GameDevProjectSelector />
        </div>
      </div>

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Items ({projectItems.length})</TabsTrigger>
          <TabsTrigger value="loot">Loot Tables ({projectLootTables.length})</TabsTrigger>
          <TabsTrigger value="sets">Item Sets ({projectSets.length})</TabsTrigger>
          <TabsTrigger value="crafting">Crafting ({projectRecipes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterRarity} onValueChange={setFilterRarity}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rarities</SelectItem>
                {Object.entries(ITEM_RARITY_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(ITEM_CATEGORY_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => { resetItemForm(); setEditingItem(null); setShowAddItem(true); }}><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map(item => {
              const rarCfg = ITEM_RARITY_CONFIG[item.rarity];
              const catCfg = ITEM_CATEGORY_CONFIG[item.category];
              return (
                <Card key={item.id} className="group hover:shadow-md transition-shadow">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm">{catCfg.emoji} {item.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{item.description || 'No description'}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(item)}><Edit className="h-3 w-3" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeGameItem(item.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      <Badge variant="outline" className="text-xs" style={{ borderColor: `hsl(${rarCfg.color})`, color: `hsl(${rarCfg.color})` }}>{rarCfg.emoji} {rarCfg.label}</Badge>
                      <Badge variant="secondary" className="text-xs">{catCfg.label}</Badge>
                      {item.value ? <Badge variant="outline" className="text-xs">💰 {item.value}</Badge> : null}
                    </div>
                    {item.effect && <p className="text-xs text-muted-foreground">⚡ {item.effect}</p>}
                  </CardContent>
                </Card>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">No items found. Create your first item!</div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="loot" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Define loot tables for enemies, chests, and rewards.</p>
            <Button onClick={() => setShowAddLootTable(true)}><Plus className="h-4 w-4 mr-1" /> Add Loot Table</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {projectLootTables.map(lt => (
              <Card key={lt.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">🎲 {lt.name}</CardTitle>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeLootTable(lt.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <p className="text-xs text-muted-foreground">{lt.description || 'No description'}</p>
                  <p className="text-xs mt-1">{lt.entries.length} entries</p>
                </CardContent>
              </Card>
            ))}
            {projectLootTables.length === 0 && <div className="col-span-full text-center py-12 text-muted-foreground">No loot tables yet.</div>}
          </div>
        </TabsContent>

        <TabsContent value="sets" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Group items into sets with bonuses.</p>
            <Button onClick={() => setShowAddSet(true)}><Plus className="h-4 w-4 mr-1" /> Add Set</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {projectSets.map(s => (
              <Card key={s.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <CardTitle className="text-sm"><Layers className="h-4 w-4 inline mr-1" />{s.name}</CardTitle>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeItemSet(s.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <p className="text-xs text-muted-foreground">{s.description || 'No description'}</p>
                  <p className="text-xs">{s.item_ids.length} items · {s.bonuses.length} bonuses</p>
                </CardContent>
              </Card>
            ))}
            {projectSets.length === 0 && <div className="col-span-full text-center py-12 text-muted-foreground">No item sets yet.</div>}
          </div>
        </TabsContent>

        <TabsContent value="crafting" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Define crafting recipes for your game.</p>
            <Button onClick={() => setShowAddRecipe(true)}><Plus className="h-4 w-4 mr-1" /> Add Recipe</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {projectRecipes.map(r => (
              <Card key={r.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <CardTitle className="text-sm"><FlaskConical className="h-4 w-4 inline mr-1" />{r.name}</CardTitle>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeCraftingRecipe(r.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <p className="text-xs text-muted-foreground">{r.description || 'No description'}</p>
                  <p className="text-xs">{r.ingredients.length} ingredients → {r.output_quantity}x output</p>
                </CardContent>
              </Card>
            ))}
            {projectRecipes.length === 0 && <div className="col-span-full text-center py-12 text-muted-foreground">No crafting recipes yet.</div>}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Item Dialog */}
      <Dialog open={showAddItem} onOpenChange={v => { if (!v) { setShowAddItem(false); setEditingItem(null); } }}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingItem ? 'Edit Item' : 'Add Item'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={itemName} onChange={e => setItemName(e.target.value)} placeholder="Excalibur" /></div>
            <div><Label>Description</Label><Textarea value={itemDesc} onChange={e => setItemDesc(e.target.value)} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={itemCategory} onValueChange={v => setItemCategory(v as ItemCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(ITEM_CATEGORY_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Rarity</Label>
                <Select value={itemRarity} onValueChange={v => setItemRarity(v as ItemRarity)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(ITEM_RARITY_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Value (Gold)</Label><Input type="number" value={itemValue} onChange={e => setItemValue(e.target.value)} /></div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={itemStackable} onCheckedChange={setItemStackable} /><Label>Stackable</Label>
                {itemStackable && <Input type="number" value={itemMaxStack} onChange={e => setItemMaxStack(e.target.value)} className="w-16" />}
              </div>
            </div>
            <div><Label>Effect</Label><Input value={itemEffect} onChange={e => setItemEffect(e.target.value)} placeholder="+20 ATK" /></div>
            <div><Label>Lore</Label><Textarea value={itemLore} onChange={e => setItemLore(e.target.value)} rows={2} placeholder="Ancient sword forged in..." /></div>
            <Button onClick={handleSaveItem} className="w-full">{editingItem ? 'Update Item' : 'Create Item'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Loot Table Dialog */}
      <Dialog open={showAddLootTable} onOpenChange={setShowAddLootTable}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Loot Table</DialogTitle></DialogHeader>
          <QuickAddForm onSave={(name, desc) => { addLootTable({ project_id: activeProjectId!, name, description: desc, entries: [] } as Omit<LootTable, 'id'>); setShowAddLootTable(false); }} />
        </DialogContent>
      </Dialog>

      {/* Add Item Set Dialog */}
      <Dialog open={showAddSet} onOpenChange={setShowAddSet}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Item Set</DialogTitle></DialogHeader>
          <QuickAddForm onSave={(name, desc) => { addItemSet({ project_id: activeProjectId!, name, description: desc, item_ids: [], bonuses: [] } as Omit<ItemSet, 'id'>); setShowAddSet(false); }} />
        </DialogContent>
      </Dialog>

      {/* Add Crafting Recipe Dialog */}
      <Dialog open={showAddRecipe} onOpenChange={setShowAddRecipe}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Crafting Recipe</DialogTitle></DialogHeader>
          <QuickAddForm onSave={(name, desc) => { addCraftingRecipe({ project_id: activeProjectId!, name, description: desc, ingredients: [], output_item_id: '', output_quantity: 1, tags: [] } as Omit<CraftingRecipe, 'id'>); setShowAddRecipe(false); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuickAddForm({ onSave }: { onSave: (name: string, desc: string) => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  return (
    <div className="space-y-3">
      <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
      <div><Label>Description</Label><Textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} /></div>
      <Button onClick={() => name.trim() && onSave(name, desc)} className="w-full">Create</Button>
    </div>
  );
}
