
import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Category {
  name: string;
  description?: string;
}

interface CategorySelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
}

export function CategorySelector({
  value,
  onValueChange
}: CategorySelectorProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log('Fetching part categories from database...');

        const { data, error } = await supabase
          .from('parts_categories')
          .select('name, description')
          .eq('is_active', true)
          .order('name');

        if (error) {
          console.error('Error fetching categories:', error);
          setError('Failed to load categories');
          // Fallback to basic categories
          setCategories([
            { name: 'Engine Components', description: 'Engine-related parts and components' },
            { name: 'Electrical', description: 'Electrical system components' },
            { name: 'Brakes', description: 'Brake system parts' },
            { name: 'Suspension', description: 'Suspension and steering components' },
            { name: 'Exhaust', description: 'Exhaust system parts' },
            { name: 'Filters', description: 'Air, oil, and fuel filters' },
            { name: 'Fluids', description: 'Automotive fluids and lubricants' }
          ]);
        } else {
          const categoryData = data?.map(cat => ({
            name: cat.name,
            description: cat.description || undefined
          })) || [];
          console.log('Categories loaded:', categoryData.length, 'categories');
          setCategories(categoryData);
        }
      } catch (err) {
        console.error('Error setting up categories:', err);
        setError('Failed to load categories');
        // Fallback categories
        setCategories([
          { name: 'Engine Components', description: 'Engine-related parts and components' },
          { name: 'Electrical', description: 'Electrical system components' },
          { name: 'Brakes', description: 'Brake system parts' },
          { name: 'Suspension', description: 'Suspension and steering components' },
          { name: 'Exhaust', description: 'Exhaust system parts' },
          { name: 'Filters', description: 'Air, oil, and fuel filters' },
          { name: 'Fluids', description: 'Automotive fluids and lubricants' }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>Category</Label>
        <div className="flex items-center gap-2 p-2 border rounded bg-white">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading categories...</span>
        </div>
      </div>
    );
  }

  if (error && categories.length === 0) {
    return (
      <div className="space-y-2">
        <Label>Category</Label>
        <div className="p-2 border rounded bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 bg-slate-100 p-4 rounded-lg">
      <Label className="text-sm font-medium text-slate-700">Category</Label>
      <Select value={value || 'no-selection'} onValueChange={(newValue) => {
        if (newValue !== 'no-selection') {
          onValueChange(newValue);
        }
      }}>
        <SelectTrigger className="bg-white border-slate-300 text-slate-900">
          <SelectValue placeholder="Select a category" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px] overflow-y-auto bg-white border-slate-200 shadow-lg">
          <SelectItem value="no-selection" className="hover:bg-slate-50 focus:bg-slate-100">
            <span className="text-slate-500">Select a category</span>
          </SelectItem>
          {categories.length === 0 ? (
            <SelectItem value="no-categories" disabled>
              No categories available
            </SelectItem>
          ) : (
            categories.map(category => (
              <SelectItem key={category.name} value={category.name} className="hover:bg-slate-50 focus:bg-slate-100">
                <div className="flex flex-col items-start">
                  <span className="font-medium text-slate-900">{category.name}</span>
                  {category.description && (
                    <span className="text-xs text-slate-600 mt-0.5">
                      {category.description}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
