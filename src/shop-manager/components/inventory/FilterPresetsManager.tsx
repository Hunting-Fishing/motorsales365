import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { 
  Bookmark, 
  BookmarkPlus, 
  Trash2, 
  Star,
  Filter,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFilterPresets, FilterPreset } from '@/hooks/inventory/useFilterPresets';

interface FilterPresetsManagerProps {
  currentFilters: {
    search: string;
    category: string[];
    status: string[];
    supplier: string;
    location: string;
  };
  onApplyPreset: (preset: FilterPreset) => void;
  className?: string;
}

export function FilterPresetsManager({ 
  currentFilters, 
  onApplyPreset, 
  className 
}: FilterPresetsManagerProps) {
  const { toast } = useToast();
  const { presets, isLoading, addPreset, deletePreset, setDefaultPreset } = useFilterPresets();
  const [isOpen, setIsOpen] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState('');

  const hasActiveFilters = currentFilters.search || 
    currentFilters.category.length > 0 || 
    currentFilters.status.length > 0 || 
    currentFilters.supplier || 
    currentFilters.location;

  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your filter preset",
        variant: "destructive"
      });
      return;
    }

    const newPreset = addPreset(presetName, currentFilters);
    setPresetName('');
    setShowSaveDialog(false);
    
    toast({
      title: "Preset saved",
      description: `Filter preset "${newPreset.name}" has been saved`,
    });
  }, [presetName, currentFilters, addPreset, toast]);

  const handleDeletePreset = useCallback((presetId: string, presetName: string, isDefault?: boolean) => {
    if (isDefault) {
      toast({
        title: "Cannot delete",
        description: "Default presets cannot be deleted",
        variant: "destructive"
      });
      return;
    }

    const success = deletePreset(presetId);
    if (success) {
      toast({
        title: "Preset deleted",
        description: `Filter preset "${presetName}" has been deleted`,
      });
    }
  }, [deletePreset, toast]);

  const handleApplyPreset = useCallback((preset: FilterPreset) => {
    onApplyPreset(preset);
    setIsOpen(false);
    toast({
      title: "Preset applied",
      description: `Applied filter preset "${preset.name}"`,
    });
  }, [onApplyPreset, toast]);

  const handleSetDefault = useCallback((presetId: string, presetName: string) => {
    setDefaultPreset(presetId);
    toast({
      title: "Default updated",
      description: `"${presetName}" is now your default preset`,
    });
  }, [setDefaultPreset, toast]);

  const getPresetDescription = (preset: FilterPreset) => {
    const parts = [];
    if (preset.filters.search) parts.push(`Search: "${preset.filters.search}"`);
    if (preset.filters.category.length) parts.push(`Categories: ${preset.filters.category.length}`);
    if (preset.filters.status.length) parts.push(`Status: ${preset.filters.status.length}`);
    if (preset.filters.supplier) parts.push(`Supplier: ${preset.filters.supplier}`);
    if (preset.filters.location) parts.push(`Location: ${preset.filters.location}`);
    return parts.join(', ') || 'No filters';
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return '';
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Bookmark className="h-4 w-4" />
            Presets
            {presets.length > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                {presets.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filter Presets</h4>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSaveDialog(true)}
                  className="gap-1"
                >
                  <BookmarkPlus className="h-3 w-3" />
                  Save
                </Button>
              )}
            </div>
          </div>
          
          {showSaveDialog && (
            <div className="p-4 border-b bg-muted/20">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Preset Name</label>
                  <Input
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="Enter preset name..."
                    className="mt-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSavePreset();
                      if (e.key === 'Escape') setShowSaveDialog(false);
                    }}
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSavePreset}
                    disabled={!presetName.trim()}
                  >
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowSaveDialog(false);
                      setPresetName('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                <p className="text-sm mt-2">Loading presets...</p>
              </div>
            ) : presets.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Filter className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No saved presets</p>
                <p className="text-xs mt-1">Apply some filters and save them as presets</p>
              </div>
            ) : (
              <div className="p-2">
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    className="group flex items-start justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleApplyPreset(preset)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h5 className="font-medium text-sm truncate">
                          {preset.name}
                        </h5>
                        {preset.isDefault && (
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {getPresetDescription(preset)}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {formatDate(preset.created)}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {!preset.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetDefault(preset.id, preset.name);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 text-muted-foreground hover:text-yellow-500"
                          title="Set as default"
                        >
                          <Star className="h-3 w-3" />
                        </Button>
                      )}
                      {!preset.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePreset(preset.id, preset.name, preset.isDefault);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          title="Delete preset"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
