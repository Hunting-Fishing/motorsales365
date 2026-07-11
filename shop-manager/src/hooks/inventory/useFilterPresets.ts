import { useState, useCallback, useEffect } from 'react';

export interface FilterPreset {
  id: string;
  name: string;
  filters: {
    search: string;
    category: string[];
    status: string[];
    supplier: string;
    location: string;
  };
  isDefault?: boolean;
  created: string;
}

const STORAGE_KEY = 'inventory_filter_presets';

// Default presets that are always available
const defaultPresets: FilterPreset[] = [
  {
    id: 'default_low_stock',
    name: 'Low Stock Items',
    filters: {
      search: '',
      category: [],
      status: ['low_stock'],
      supplier: '',
      location: ''
    },
    isDefault: true,
    created: new Date().toISOString()
  }
];

export function useFilterPresets() {
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load presets from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as FilterPreset[];
        // Merge with default presets (ensure defaults exist)
        const defaultIds = defaultPresets.map(p => p.id);
        const userPresets = parsed.filter(p => !defaultIds.includes(p.id));
        setPresets([...defaultPresets, ...userPresets]);
      } else {
        setPresets(defaultPresets);
      }
    } catch (error) {
      console.error('Error loading filter presets:', error);
      setPresets(defaultPresets);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save presets to localStorage whenever they change
  const saveToStorage = useCallback((newPresets: FilterPreset[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPresets));
    } catch (error) {
      console.error('Error saving filter presets:', error);
    }
  }, []);

  const addPreset = useCallback((name: string, filters: FilterPreset['filters']): FilterPreset => {
    const newPreset: FilterPreset = {
      id: `preset_${Date.now()}`,
      name: name.trim(),
      filters: { ...filters },
      created: new Date().toISOString()
    };

    setPresets(prev => {
      const updated = [...prev, newPreset];
      saveToStorage(updated);
      return updated;
    });

    return newPreset;
  }, [saveToStorage]);

  const updatePreset = useCallback((id: string, updates: Partial<FilterPreset>) => {
    setPresets(prev => {
      const updated = prev.map(p => 
        p.id === id ? { ...p, ...updates } : p
      );
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  const deletePreset = useCallback((id: string) => {
    // Don't allow deleting default presets
    const preset = presets.find(p => p.id === id);
    if (preset?.isDefault) {
      return false;
    }

    setPresets(prev => {
      const updated = prev.filter(p => p.id !== id);
      saveToStorage(updated);
      return updated;
    });
    return true;
  }, [presets, saveToStorage]);

  const setDefaultPreset = useCallback((id: string) => {
    setPresets(prev => {
      const updated = prev.map(p => ({
        ...p,
        isDefault: p.id === id
      }));
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  return {
    presets,
    isLoading,
    addPreset,
    updatePreset,
    deletePreset,
    setDefaultPreset
  };
}
