import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface PartsCategory {
  id: string;
  name: string;
  description: string;
}

interface PartsCategorySelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function PartsCategorySelector({ 
  value, 
  onValueChange, 
  placeholder = "Select category..." 
}: PartsCategorySelectorProps) {
  const [categories, setCategories] = useState<PartsCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('parts_categories')
          .select('id, name, description')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        setCategories(data || []);
      } catch (error) {
        console.error('Error fetching parts categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <div className="flex items-center">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Loading categories...
          </div>
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {categories.map((category) => (
          <SelectItem key={category.id} value={category.id}>
            <div className="flex flex-col">
              <span className="font-medium">{category.name}</span>
              {category.description && (
                <span className="text-xs text-muted-foreground">{category.description}</span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}