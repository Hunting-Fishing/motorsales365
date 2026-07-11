import React, { useState, useEffect } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMaintenanceItemPresets, MaintenanceItemPreset } from '@/hooks/useMaintenanceItemPresets';

interface MaintenanceItemComboboxProps {
  value: string;
  onSelect: (value: string) => void;
  placeholder?: string;
  className?: string;
}

interface ScoredPreset extends MaintenanceItemPreset {
  similarity: number;
}

export function MaintenanceItemCombobox({
  value,
  onSelect,
  placeholder = "Search item name...",
  className
}: MaintenanceItemComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const { presets, isLoading, addPreset, incrementUsage, getSuggestions } = useMaintenanceItemPresets();
  const [suggestions, setSuggestions] = useState<ScoredPreset[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Update suggestions when input changes
  useEffect(() => {
    const results = getSuggestions(inputValue);
    setSuggestions(results);
  }, [inputValue, getSuggestions]);

  // Sync external value changes
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const handleSelectPreset = async (preset: ScoredPreset) => {
    setInputValue(preset.name);
    onSelect(preset.name);
    setOpen(false);
    await incrementUsage(preset.id);
  };

  const handleSelectCustom = (customValue: string) => {
    setInputValue(customValue);
    onSelect(customValue);
    setOpen(false);
  };

  const handleAddNew = async () => {
    if (!inputValue.trim()) return;
    
    setIsAddingNew(true);
    const newPreset = await addPreset(inputValue.trim());
    setIsAddingNew(false);

    if (newPreset) {
      setInputValue(newPreset.name);
      onSelect(newPreset.name);
      setOpen(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      engine: 'bg-red-500/10 text-red-600 border-red-200',
      marine: 'bg-blue-500/10 text-blue-600 border-blue-200',
      safety: 'bg-amber-500/10 text-amber-600 border-amber-200',
      filters: 'bg-green-500/10 text-green-600 border-green-200',
      component: 'bg-purple-500/10 text-purple-600 border-purple-200',
      custom: 'bg-muted text-muted-foreground border-border'
    };
    return colors[category] || colors.custom;
  };

  const showAddNewOption = inputValue.trim() && 
    !suggestions.some(s => s.name.toLowerCase() === inputValue.toLowerCase().trim());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between h-8 font-normal", className)}
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {suggestions.length === 0 && !showAddNewOption && (
                  <CommandEmpty>No items found.</CommandEmpty>
                )}

                {suggestions.length > 0 && (
                  <CommandGroup heading="Suggestions">
                    {suggestions.map((preset) => (
                      <div
                        key={preset.id}
                        onClick={() => handleSelectPreset(preset)}
                        className="relative flex cursor-pointer select-none items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Check
                            className={cn(
                              "h-4 w-4 shrink-0",
                              value === preset.name ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="truncate">{preset.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge 
                            variant="outline" 
                            className={cn("text-[10px] px-1.5 py-0", getCategoryColor(preset.category))}
                          >
                            {preset.category}
                          </Badge>
                          {preset.similarity > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              {preset.similarity}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </CommandGroup>
                )}

                {showAddNewOption && (
                  <CommandGroup heading="Custom">
                    <div
                      onClick={handleAddNew}
                      className={cn(
                        "relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                        isAddingNew && "pointer-events-none opacity-50"
                      )}
                    >
                      {isAddingNew ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      <span>Add "{inputValue.trim()}" as new preset</span>
                    </div>
                    <div
                      onClick={() => handleSelectCustom(inputValue.trim())}
                      className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                    >
                      <Check className="h-4 w-4 opacity-0" />
                      <span>Use "{inputValue.trim()}" without saving</span>
                    </div>
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
