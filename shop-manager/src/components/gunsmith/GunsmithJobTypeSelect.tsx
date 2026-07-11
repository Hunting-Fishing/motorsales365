import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface GunsmithJobTypeSelectProps {
  value: string;
  customValue: string;
  onValueChange: (value: string) => void;
  onCustomValueChange: (value: string) => void;
}

// Generate a unique code from the job type name
export function generateJobTypeCode(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return cleaned.slice(0, 3) || 'OTH';
}

// Insert a new job type into the database
export async function insertCustomJobType(name: string): Promise<boolean> {
  const trimmedName = name.trim();
  if (!trimmedName) return false;

  // Check if it already exists (case-insensitive)
  const { data: existing } = await supabase
    .from('module_work_types')
    .select('id')
    .eq('module_type', 'gunsmith')
    .ilike('name', trimmedName)
    .maybeSingle();

  if (existing) {
    // Already exists, no need to insert
    return true;
  }

  // Generate a unique code
  let baseCode = generateJobTypeCode(trimmedName);
  let code = baseCode;
  let counter = 1;

  // Check for code collision and make unique
  while (true) {
    const { data: codeExists } = await supabase
      .from('module_work_types')
      .select('id')
      .eq('module_type', 'gunsmith')
      .eq('code', code)
      .maybeSingle();

    if (!codeExists) break;
    code = `${baseCode}${counter}`;
    counter++;
  }

  // Get max display order
  const { data: maxOrder } = await supabase
    .from('module_work_types')
    .select('display_order')
    .eq('module_type', 'gunsmith')
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const newOrder = (maxOrder?.display_order || 0) + 1;

  // Insert the new job type
  const { error } = await supabase
    .from('module_work_types')
    .insert({
      module_type: 'gunsmith',
      name: trimmedName,
      code: code,
      description: `User-contributed job type: ${trimmedName}`,
      is_active: true,
      is_system: false,
      display_order: newOrder
    });

  return !error;
}

export default function GunsmithJobTypeSelect({ 
  value, 
  customValue,
  onValueChange, 
  onCustomValueChange 
}: GunsmithJobTypeSelectProps) {
  // Fetch job types from database
  const { data: jobTypes, isLoading } = useQuery({
    queryKey: ['gunsmith-job-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_work_types')
        .select('id, name, code, description')
        .eq('module_type', 'gunsmith')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data || [];
    }
  });

  // Fallback default types if database is empty
  const defaultTypes = [
    'Repair',
    'Cleaning',
    'Trigger Job',
    'Barrel Work',
    'Stock Work',
    'Bluing/Refinish',
    'Scope Mount',
    'Custom Build',
    'Safety Check'
  ];

  const displayTypes = jobTypes && jobTypes.length > 0 
    ? jobTypes.map(t => t.name) 
    : defaultTypes;

  const isOther = value === 'Other';

  return (
    <div className="space-y-2">
      <Label>Job Type *</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder={isLoading ? "Loading..." : "Select type"} />
        </SelectTrigger>
        <SelectContent>
          {displayTypes.map((type) => (
            <SelectItem key={type} value={type}>{type}</SelectItem>
          ))}
          <SelectItem value="Other" className="text-amber-600 font-medium">
            + Other (Add New Type)
          </SelectItem>
        </SelectContent>
      </Select>

      {isOther && (
        <div className="pt-2">
          <Label className="text-sm text-muted-foreground">Enter custom job type</Label>
          <Input
            value={customValue}
            onChange={(e) => onCustomValueChange(e.target.value)}
            placeholder="e.g., Cerakote Application, Laser Engraving..."
            className="mt-1"
            autoFocus
          />
          <p className="text-xs text-muted-foreground mt-1">
            This will be added to the job types list for future use.
          </p>
        </div>
      )}
    </div>
  );
}
