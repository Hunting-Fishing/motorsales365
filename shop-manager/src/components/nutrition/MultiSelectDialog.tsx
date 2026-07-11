import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Search, Plus, ChevronDown } from 'lucide-react';

interface MultiSelectDialogProps {
  label: string;
  options: string[];
  selected: string[];
  onSelectionChange: (selected: string[]) => void;
  allowCustom?: boolean;
  customPlaceholder?: string;
  categorized?: Record<string, string[]>;
  onAddCustomToCategory?: (category: string, value: string) => void;
}

export default function MultiSelectDialog({
  label,
  options,
  selected,
  onSelectionChange,
  allowCustom = false,
  customPlaceholder = 'Add custom option...',
  categorized,
  onAddCustomToCategory,
}: MultiSelectDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [customValue, setCustomValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const allOptions = categorized
    ? Object.values(categorized).flat()
    : options;

  const filteredOptions = search
    ? allOptions.filter(o => o.toLowerCase().includes(search.toLowerCase()))
    : null;

  const toggle = (item: string) => {
    onSelectionChange(
      selected.includes(item)
        ? selected.filter(s => s !== item)
        : [...selected, item]
    );
  };

  const categoryKeys = categorized ? Object.keys(categorized) : [];

  const addCustom = () => {
    const val = customValue.trim().toLowerCase().replace(/\s+/g, '_');
    if (!val) return;

    if (!selected.includes(val)) {
      onSelectionChange([...selected, val]);
    }

    if (categorized && selectedCategory && onAddCustomToCategory) {
      onAddCustomToCategory(selectedCategory, val);
    }

    setCustomValue('');
  };

  const renderOptions = (items: string[]) =>
    items.map(item => (
      <label
        key={item}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
      >
        <Checkbox
          checked={selected.includes(item)}
          onCheckedChange={() => toggle(item)}
        />
        <span className="capitalize text-sm">{item.replace(/_/g, ' ')}</span>
      </label>
    ));

  return (
    <div className="space-y-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full justify-between h-auto min-h-10 py-2">
            <span className="text-left flex-1">
              {selected.length === 0 ? (
                <span className="text-muted-foreground">Select {label.toLowerCase()}...</span>
              ) : (
                <span className="text-sm">{selected.length} selected</span>
              )}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Select {label}</DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${label.toLowerCase()}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pb-2 border-b">
              {selected.map(s => (
                <Badge key={s} variant="default" className="capitalize gap-1 cursor-pointer" onClick={() => toggle(s)}>
                  {s.replace(/_/g, ' ')}
                  <X className="h-3 w-3" />
                </Badge>
              ))}
            </div>
          )}

          <ScrollArea className="max-h-[40vh]">
            {filteredOptions ? (
              <div className="space-y-0.5">
                {filteredOptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No matches found</p>
                ) : (
                  renderOptions(filteredOptions)
                )}
              </div>
            ) : categorized ? (
              <div className="space-y-3">
                {Object.entries(categorized).map(([category, items]) => (
                  <div key={category}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pb-1">{category}</p>
                    <div className="space-y-0.5">{renderOptions(items)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-0.5">{renderOptions(options)}</div>
            )}
          </ScrollArea>

          {allowCustom && (
            <div className="space-y-2 pt-2 border-t">
              {categorized && categoryKeys.length > 0 && (
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Add to category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryKeys.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder={customPlaceholder}
                  value={customValue}
                  onChange={e => setCustomValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustom()}
                  className="flex-1"
                />
                <Button size="sm" variant="secondary" onClick={addCustom} disabled={!customValue.trim() || (!!categorized && !selectedCategory)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {categorized && !selectedCategory && customValue.trim() && (
                <p className="text-xs text-muted-foreground">Pick a category first</p>
              )}
            </div>
          )}

          <Button onClick={() => setOpen(false)} className="w-full">
            Done
          </Button>
        </DialogContent>
      </Dialog>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(s => (
            <Badge key={s} variant="secondary" className="capitalize gap-1 cursor-pointer text-xs" onClick={() => toggle(s)}>
              {s.replace(/_/g, ' ')}
              <X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
