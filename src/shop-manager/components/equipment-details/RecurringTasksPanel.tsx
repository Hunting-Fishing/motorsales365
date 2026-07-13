import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Plus, Trash2, Edit, Clock, User } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface RecurringTasksPanelProps {
  equipmentId: string;
  shopId: string;
}

const PATTERN_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Every 2 Weeks',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  hours_based: 'Hours-Based'
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
};

export function RecurringTasksPanel({ equipmentId, shopId }: RecurringTasksPanelProps) {
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['recurring-task-templates', equipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_recurring_task_templates')
        .select('*')
        .eq('equipment_id', equipmentId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('equipment_recurring_task_templates')
        .update({ is_active: isActive })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-task-templates', equipmentId] });
      toast.success('Template updated');
    },
    onError: () => {
      toast.error('Failed to update template');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('equipment_recurring_task_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-task-templates', equipmentId] });
      toast.success('Template deleted');
    },
    onError: () => {
      toast.error('Failed to delete template');
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Recurring Task Templates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Recurring Task Templates
            {templates && templates.length > 0 && (
              <Badge variant="secondary">{templates.length}</Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {templates?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recurring task templates</p>
            <p className="text-sm mt-1">Create recurring tasks to auto-generate maintenance tasks</p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates?.map((template) => (
              <div 
                key={template.id}
                className={`p-4 rounded-lg border border-border ${!template.is_active ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">{template.title}</span>
                      <Badge className={PRIORITY_COLORS[template.priority || 'medium']}>
                        {template.priority}
                      </Badge>
                      <Badge variant="outline">
                        {PATTERN_LABELS[template.recurrence_pattern] || template.recurrence_pattern}
                        {template.recurrence_pattern === 'hours_based' && template.hours_interval && (
                          ` (${template.hours_interval} hrs)`
                        )}
                      </Badge>
                    </div>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      {template.assigned_to_name && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {template.assigned_to_name}
                        </span>
                      )}
                      {template.estimated_hours && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {template.estimated_hours}h estimated
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={template.is_active}
                      onCheckedChange={(checked) => 
                        toggleActiveMutation.mutate({ id: template.id, isActive: checked })
                      }
                    />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Template</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this recurring task template? 
                            Existing generated tasks will not be affected.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(template.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
