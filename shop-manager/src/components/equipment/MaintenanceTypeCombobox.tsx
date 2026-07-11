import React, { useState, useEffect } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMaintenanceTypePresets, MaintenanceTypePreset } from '@/hooks/useMaintenanceTypePresets';

interface MaintenanceTypeComboboxProps {
  value: string;
  onSelect: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function MaintenanceTypeCombobox({
  value,
  onSelect,
  placeholder = "Select type...",
  className
}: MaintenanceTypeComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const { presets, isLoading, addPreset, incrementUsage, getSuggestions } = useMaintenanceTypePresets();
  const [suggestions, setSuggestions] = useState<MaintenanceTypePreset[]>([]);
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

  const handleSelectPreset = async (preset: MaintenanceTypePreset) => {
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

  const showAddNewOption = inputValue.trim() && 
    !suggestions.some(s => s.name.toLowerCase() === inputValue.toLowerCase().trim());

  // Get display value - find matching preset or use raw value
  const displayValue = value || '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between h-8 font-normal", className)}
        >
          <span className={cn("truncate", !displayValue && "text-muted-foreground")}>
            {displayValue || placeholder}
          </span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search types..."
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
                  <CommandEmpty>No types found.</CommandEmpty>
                )}

                {suggestions.length > 0 && (
                  <CommandGroup heading="Types">
                    {suggestions.map((preset) => (
                      <div
                        key={preset.id}
                        onClick={() => handleSelectPreset(preset)}
                        className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                      >
                        <Check
                          className={cn(
                            "h-4 w-4 shrink-0",
                            value === preset.name ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="truncate">{preset.name}</span>
                          {preset.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {preset.description}
                            </p>
                          )}
                        </div>
                        {preset.is_system_default && (
                          <span className="text-[10px] text-muted-foreground">default</span>
                        )}
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
                      <span>Add "{inputValue.trim()}" as new type</span>
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
