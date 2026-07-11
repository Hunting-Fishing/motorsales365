import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEquipmentCategories } from '@/hooks/useEquipmentCategories';
import { getTypesForCategory, getCategoryForType, CATEGORY_TYPE_MAP } from '@/types/equipmentCategory';

interface EquipmentCategorySelectorProps {
  categoryId: string;
  equipmentType: string;
  onCategoryChange: (categoryId: string, categoryName: string) => void;
  onTypeChange: (type: string) => void;
  disabled?: boolean;
}

export function EquipmentCategorySelector({
  categoryId,
  equipmentType,
  onCategoryChange,
  onTypeChange,
  disabled = false,
}: EquipmentCategorySelectorProps) {
  const { categories, loading } = useEquipmentCategories();

  // Sort categories alphabetically
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  // Get the current category name from ID
  const currentCategory = useMemo(() => {
    return categories.find(c => c.id === categoryId);
  }, [categories, categoryId]);

  // Get types for the current category, sorted alphabetically
  const availableTypes = useMemo(() => {
    if (!currentCategory) return [];
    return getTypesForCategory(currentCategory.name);
  }, [currentCategory]);

  // Auto-select category based on equipment type if not already set
  React.useEffect(() => {
    if (equipmentType && !categoryId) {
      const categoryName = getCategoryForType(equipmentType);
      if (categoryName) {
        const matchingCategory = categories.find(c => c.name === categoryName);
        if (matchingCategory) {
          onCategoryChange(matchingCategory.id, matchingCategory.name);
        }
      }
    }
  }, [equipmentType, categoryId, categories, onCategoryChange]);

  const handleCategoryChange = (newCategoryId: string) => {
    const category = categories.find(c => c.id === newCategoryId);
    if (category) {
      onCategoryChange(newCategoryId, category.name);
      // Reset equipment type when category changes
      onTypeChange('');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="category">Category *</Label>
        <Select 
          value={categoryId} 
          onValueChange={handleCategoryChange}
          disabled={disabled || loading}
        >
          <SelectTrigger>
            <SelectValue placeholder={loading ? "Loading..." : "Select category"} />
          </SelectTrigger>
          <SelectContent>
            {sortedCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="equipment_type">Type *</Label>
        <Select 
          value={equipmentType} 
          onValueChange={onTypeChange}
          disabled={disabled || !categoryId}
        >
          <SelectTrigger>
            <SelectValue placeholder={!categoryId ? "Select category first" : "Select type"} />
          </SelectTrigger>
          <SelectContent>
            {availableTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
