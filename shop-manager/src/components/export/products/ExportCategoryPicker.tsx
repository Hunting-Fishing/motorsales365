import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Tag, ChevronRight } from 'lucide-react';
import { useExportMainCategories, useCreateExportMainCategory } from '@/hooks/export/useExportMainCategories';
import { useExportProductCategories, useCreateExportCategory, ExportCategory } from '@/hooks/export/useExportProductCategories';
import { useExportProductSubcategories, useCreateExportSubcategory } from '@/hooks/export/useExportProductSubcategories';

interface ExportCategoryPickerProps {
  categoryId: string;
  subcategoryId: string;
  onCategoryChange: (categoryId: string, categorySlug: string) => void;
  onSubcategoryChange: (subcategoryId: string) => void;
}

export function ExportCategoryPicker({
  categoryId,
  subcategoryId,
  onCategoryChange,
  onSubcategoryChange,
}: ExportCategoryPickerProps) {
  const [mainCategoryId, setMainCategoryId] = useState<string>('');
  const [newMainName, setNewMainName] = useState('');
  const [showAddMain, setShowAddMain] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [showAddSub, setShowAddSub] = useState(false);

  const { data: mainCategories = [], isLoading: mainLoading } = useExportMainCategories();
  const { data: categories = [], isLoading: catsLoading } = useExportProductCategories();
  const { data: subcategories = [], isLoading: subsLoading } = useExportProductSubcategories(categoryId || null);
  const createMain = useCreateExportMainCategory();
  const createCat = useCreateExportCategory();
  const createSub = useCreateExportSubcategory();

  // Derive selected category and auto-sync main category for edit mode
  const selectedCategory = categories.find(c => c.id === categoryId);
  const effectiveMainCategoryId = useMemo(() => {
    if (selectedCategory?.main_category_id) return selectedCategory.main_category_id;
    return mainCategoryId;
  }, [selectedCategory, mainCategoryId]);

  const selectedMainCategory = mainCategories.find(m => m.id === effectiveMainCategoryId);

  // Filter categories by selected main category
  const filteredCategories = useMemo(() => {
    if (!effectiveMainCategoryId) return [];
    return categories.filter(c => c.main_category_id === effectiveMainCategoryId);
  }, [categories, effectiveMainCategoryId]);

  const handleMainCategoryChange = (value: string) => {
    setMainCategoryId(value);
    onCategoryChange('', '');
    onSubcategoryChange('');
    setShowAddCat(false);
    setShowAddSub(false);
  };

  const handleCategorySelect = (catId: string) => {
    const cat = categories.find(c => c.id === catId);
    if (cat) {
      onCategoryChange(cat.id, cat.slug);
      onSubcategoryChange('');
      setShowAddSub(false);
    }
  };

  const handleAddMain = async () => {
    if (!newMainName.trim()) return;
    const result = await createMain.mutateAsync({ name: newMainName.trim() });
    setMainCategoryId(result.id);
    onCategoryChange('', '');
    onSubcategoryChange('');
    setNewMainName('');
    setShowAddMain(false);
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim() || !effectiveMainCategoryId) return;
    const result = await createCat.mutateAsync({
      name: newCatName.trim(),
      main_category_id: effectiveMainCategoryId,
    });
    onCategoryChange(result.id, result.slug);
    onSubcategoryChange('');
    setNewCatName('');
    setShowAddCat(false);
  };

  const handleAddSubcategory = async () => {
    if (!newSubName.trim() || !categoryId) return;
    const result = await createSub.mutateAsync({ category_id: categoryId, name: newSubName.trim() });
    onSubcategoryChange(result.id);
    setNewSubName('');
    setShowAddSub(false);
  };

  const renderInlineAdd = (
    show: boolean,
    value: string,
    onChange: (v: string) => void,
    onSubmit: () => void,
    onCancel: () => void,
    isPending: boolean,
    placeholder: string,
  ) => (
    <div className="flex gap-1.5">
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 text-xs flex-1"
        autoFocus
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); onSubmit(); }
          if (e.key === 'Escape') onCancel();
        }}
      />
      <Button type="button" size="sm" className="h-9 px-2.5 text-xs" onClick={onSubmit} disabled={!value.trim() || isPending}>
        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-9 px-2 text-xs text-muted-foreground" onClick={onCancel}>
        ✕
      </Button>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Breadcrumb indicator */}
      {(selectedMainCategory || selectedCategory) && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground flex-wrap">
          <Tag className="h-3 w-3 text-primary" />
          {selectedMainCategory && (
            <span>{selectedMainCategory.icon} {selectedMainCategory.name}</span>
          )}
          {selectedCategory && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-medium">{selectedCategory.name}</span>
            </>
          )}
          {subcategoryId && subcategories.find(s => s.id === subcategoryId) && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-medium">
                {subcategories.find(s => s.id === subcategoryId)?.name}
              </span>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. Main Category */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-muted-foreground">Main Category *</Label>
            {!showAddMain && (
              <button type="button" onClick={() => setShowAddMain(true)} className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                <Plus className="h-3 w-3" /> Add
              </button>
            )}
          </div>
          {showAddMain ? (
            renderInlineAdd(showAddMain, newMainName, setNewMainName, handleAddMain, () => { setShowAddMain(false); setNewMainName(''); }, createMain.isPending, 'New main category...')
          ) : mainLoading ? (
            <div className="flex items-center h-9 px-3 border rounded-md"><Loader2 className="h-3 w-3 animate-spin" /></div>
          ) : (
            <Select value={effectiveMainCategoryId || undefined} onValueChange={handleMainCategoryChange}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select main category..." />
              </SelectTrigger>
              <SelectContent>
                {mainCategories.map(mc => (
                  <SelectItem key={mc.id} value={mc.id} className="text-xs">
                    {mc.icon} {mc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* 2. Category */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-muted-foreground">Category *</Label>
            {effectiveMainCategoryId && !showAddCat && (
              <button type="button" onClick={() => setShowAddCat(true)} className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                <Plus className="h-3 w-3" /> Add
              </button>
            )}
          </div>
          {showAddCat && effectiveMainCategoryId ? (
            renderInlineAdd(showAddCat, newCatName, setNewCatName, handleAddCategory, () => { setShowAddCat(false); setNewCatName(''); }, createCat.isPending, 'New category...')
          ) : !effectiveMainCategoryId ? (
            <div className="flex items-center h-9 px-3 border rounded-md bg-muted/30">
              <span className="text-xs text-muted-foreground">Select main category first</span>
            </div>
          ) : catsLoading ? (
            <div className="flex items-center h-9 px-3 border rounded-md"><Loader2 className="h-3 w-3 animate-spin" /></div>
          ) : (
            <Select value={categoryId || undefined} onValueChange={handleCategorySelect}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id} className="text-xs">
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* 3. Subcategory */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-muted-foreground">Subcategory</Label>
            {categoryId && !showAddSub && (
              <button type="button" onClick={() => setShowAddSub(true)} className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                <Plus className="h-3 w-3" /> Add
              </button>
            )}
          </div>
          {showAddSub && categoryId ? (
            renderInlineAdd(showAddSub, newSubName, setNewSubName, handleAddSubcategory, () => { setShowAddSub(false); setNewSubName(''); }, createSub.isPending, 'New subcategory...')
          ) : !categoryId ? (
            <div className="flex items-center h-9 px-3 border rounded-md bg-muted/30">
              <span className="text-xs text-muted-foreground">Select category first</span>
            </div>
          ) : subsLoading ? (
            <div className="flex items-center h-9 px-3 border rounded-md"><Loader2 className="h-3 w-3 animate-spin" /></div>
          ) : subcategories.length === 0 ? (
            <div className="flex items-center h-9 px-3 border rounded-md bg-muted/30">
              <span className="text-xs text-muted-foreground">No subcategories — add one</span>
            </div>
          ) : (
            <Select value={subcategoryId || undefined} onValueChange={onSubcategoryChange}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select subcategory..." />
              </SelectTrigger>
              <SelectContent>
                {subcategories.map(sub => (
                  <SelectItem key={sub.id} value={sub.id} className="text-xs">
                    {sub.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
    </div>
  );
}
