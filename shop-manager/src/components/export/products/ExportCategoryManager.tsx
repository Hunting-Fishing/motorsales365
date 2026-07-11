import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Trash2, Tag, Loader2, FolderOpen, ChevronDown, ChevronRight, Search, Layers } from 'lucide-react';
import { useExportProductCategories, useCreateExportCategory, useDeleteExportCategory } from '@/hooks/export/useExportProductCategories';
import { useExportProductSubcategories, useCreateExportSubcategory, useDeleteExportSubcategory } from '@/hooks/export/useExportProductSubcategories';

function SubcategoryList({ categoryId }: { categoryId: string }) {
  const { data: subcategories = [], isLoading } = useExportProductSubcategories(categoryId);
  const createSub = useCreateExportSubcategory();
  const deleteSub = useDeleteExportSubcategory();
  const [newName, setNewName] = useState('');

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await createSub.mutateAsync({ category_id: categoryId, name: newName.trim() });
    setNewName('');
  };

  if (isLoading) return <Loader2 className="h-3 w-3 animate-spin ml-6 my-2" />;

  return (
    <div className="ml-6 mt-2 space-y-1.5">
      {subcategories.map(sub => (
        <div key={sub.id} className="flex items-center justify-between py-1 px-2 rounded bg-background/50 text-xs">
          <span className="text-foreground">{sub.name}</span>
          <div className="flex items-center gap-1">
            {sub.is_system && <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">System</Badge>}
            {!sub.is_system && (
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteSub.mutate(sub.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      ))}
      <div className="flex gap-1.5 mt-1">
        <Input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Add subcategory..."
          className="h-7 text-xs"
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <Button size="sm" className="h-7 px-2 text-xs" onClick={handleAdd} disabled={!newName.trim() || createSub.isPending}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export function ExportCategoryManager() {
  const { data: categories = [], isLoading } = useExportProductCategories();
  const createCategory = useCreateExportCategory();
  const deleteCategory = useDeleteExportCategory();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createCategory.mutateAsync({ name: name.trim(), description: description.trim() || undefined });
    setName('');
    setDescription('');
    setDialogOpen(false);
  };

  const toggleExpand = (id: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  // Group by group_name
  const groups: Record<string, typeof filtered> = {};
  filtered.forEach(cat => {
    const g = (cat as any).group_name || 'Other';
    if (!groups[g]) groups[g] = [];
    groups[g].push(cat);
  });

  const groupOrder = ['Food & Agriculture', 'Industrial', 'Consumer Goods', 'Raw Materials', 'Other'];
  const sortedGroups = groupOrder.filter(g => groups[g]?.length);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div>
            <h1 className="text-xl font-bold text-foreground">Product Categories</h1>
            <p className="text-xs text-muted-foreground">{categories.length} categories • Click to expand subcategories</p>
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              className="pl-8 h-8 text-xs"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Add Category</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Category</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Category Name *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Frozen Goods" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Brief description..." />
              </div>
              <Button onClick={handleCreate} disabled={!name.trim() || createCategory.isPending} className="w-full">
                {createCategory.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Category
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {search ? 'No categories match your search.' : 'No categories yet. Add one above.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        sortedGroups.map(groupName => (
          <Card key={groupName}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-600" />
                {groupName} ({groups[groupName].length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {groups[groupName].map(cat => {
                const isExpanded = expandedCats.has(cat.id);
                return (
                  <Collapsible key={cat.id} open={isExpanded} onOpenChange={() => toggleExpand(cat.id)}>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors">
                      <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left">
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                        <div>
                          <p className="text-sm font-medium text-foreground">{cat.name}</p>
                          {cat.description && <p className="text-xs text-muted-foreground">{cat.description}</p>}
                        </div>
                      </CollapsibleTrigger>
                      <div className="flex items-center gap-1">
                        {cat.is_system ? (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">System</Badge>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteCategory.mutate(cat.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <CollapsibleContent>
                      <SubcategoryList categoryId={cat.id} />
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
