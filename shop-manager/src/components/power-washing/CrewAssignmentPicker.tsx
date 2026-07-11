import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  job_title: string | null;
}

interface CrewAssignmentPickerProps {
  shopId: string;
  selectedCrew: string[];
  onCrewChange: (crew: string[]) => void;
  maxSelections?: number;
}

export function CrewAssignmentPicker({ 
  shopId, 
  selectedCrew, 
  onCrewChange,
  maxSelections 
}: CrewAssignmentPickerProps) {
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (shopId) fetchEmployees();
  }, [shopId]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, job_title')
        .eq('shop_id', shopId)
        .order('first_name', { ascending: true });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (employeeId: string) => {
    if (selectedCrew.includes(employeeId)) {
      onCrewChange(selectedCrew.filter(id => id !== employeeId));
    } else {
      if (maxSelections && selectedCrew.length >= maxSelections) {
        return;
      }
      onCrewChange([...selectedCrew, employeeId]);
    }
  };

  const getInitials = (profile: Profile) => {
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    return profile.email?.[0]?.toUpperCase() || '?';
  };

  const getName = (profile: Profile) => {
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return profile.email || 'Unknown';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center">
          <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No team members found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {selectedCrew.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedCrew.map(id => {
            const employee = employees.find(e => e.id === id);
            if (!employee) return null;
            return (
              <Badge 
                key={id} 
                variant="secondary"
                className="flex items-center gap-1 pr-1"
              >
                <Avatar className="h-4 w-4">
                  <AvatarFallback className="text-[8px]">{getInitials(employee)}</AvatarFallback>
                </Avatar>
                {getName(employee)}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 ml-1 hover:bg-destructive/20"
                  onClick={() => handleToggle(id)}
                >
                  ×
                </Button>
              </Badge>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
        {employees.map(employee => {
          const isSelected = selectedCrew.includes(employee.id);
          const isDisabled = !isSelected && maxSelections && selectedCrew.length >= maxSelections;
          
          return (
            <div
              key={employee.id}
              className={`flex items-center gap-3 p-2 rounded-lg border transition-colors ${
                isSelected 
                  ? 'border-primary bg-primary/5' 
                  : isDisabled 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-muted/50'
              }`}
            >
              <Checkbox 
                checked={isSelected} 
                disabled={!!isDisabled}
                onCheckedChange={() => !isDisabled && handleToggle(employee.id)}
              />
              <label 
                className="flex-1 flex items-center gap-3 cursor-pointer min-w-0"
                onClick={(e) => {
                  e.preventDefault();
                  if (!isDisabled) handleToggle(employee.id);
                }}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{getInitials(employee)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{getName(employee)}</p>
                  {employee.job_title && (
                    <p className="text-xs text-muted-foreground capitalize">{employee.job_title}</p>
                  )}
                </div>
              </label>
            </div>
          );
        })}
      </div>

      {maxSelections && (
        <p className="text-xs text-muted-foreground text-right">
          {selectedCrew.length} / {maxSelections} selected
        </p>
      )}
    </div>
  );
}
