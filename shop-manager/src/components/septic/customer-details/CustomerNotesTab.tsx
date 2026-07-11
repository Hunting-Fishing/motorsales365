import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, MessageSquare, Lightbulb, AlertCircle, StickyNote } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import AddNoteDialog from './AddNoteDialog';

interface CustomerNotesTabProps {
  customerId: string;
}

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  dismissed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

const typeIcons: Record<string, React.ReactNode> = {
  general: <StickyNote className="h-4 w-4" />,
  customer_request: <MessageSquare className="h-4 w-4" />,
  employee_suggestion: <Lightbulb className="h-4 w-4" />,
  recommendation: <AlertCircle className="h-4 w-4" />,
};

export default function CustomerNotesTab({ customerId }: CustomerNotesTabProps) {
  const { shopId } = useShopId();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [subTab, setSubTab] = useState('all');

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['septic-customer-notes', customerId, shopId],
    queryFn: async () => {
      if (!customerId || !shopId) return [];
      const { data, error } = await supabase
        .from('septic_customer_notes')
        .select('*')
        .eq('customer_id', customerId)
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!customerId && !!shopId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ noteId, status }: { noteId: string; status: string }) => {
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (status === 'resolved') updates.resolved_at = new Date().toISOString();
      const { error } = await supabase.from('septic_customer_notes').update(updates).eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['septic-customer-notes', customerId] }),
  });

  const filtered = subTab === 'all' ? notes : notes.filter((n: any) => n.note_type === subTab);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Tabs value={subTab} onValueChange={setSubTab} className="w-full">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <TabsList>
              <TabsTrigger value="all">All ({notes.length})</TabsTrigger>
              <TabsTrigger value="customer_request">Requests</TabsTrigger>
              <TabsTrigger value="employee_suggestion">Suggestions</TabsTrigger>
              <TabsTrigger value="general">General</TabsTrigger>
            </TabsList>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Note
            </Button>
          </div>
        </Tabs>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <StickyNote className="h-10 w-10 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">No notes yet. Add one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((note: any) => (
            <Card key={note.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-0.5 text-muted-foreground">
                      {typeIcons[note.note_type] || typeIcons.general}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {note.title && <span className="font-semibold text-sm">{note.title}</span>}
                        <Badge className={priorityColors[note.priority] || ''} variant="secondary">
                          {note.priority}
                        </Badge>
                        <Badge className={statusColors[note.status] || ''} variant="secondary">
                          {note.status?.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm">{note.content}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}</span>
                        {note.estimated_cost && <span>Est. Cost: ${Number(note.estimated_cost).toFixed(2)}</span>}
                      </div>
                    </div>
                  </div>
                  {note.status !== 'resolved' && note.status !== 'dismissed' && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7"
                        onClick={() => updateStatusMutation.mutate({ noteId: note.id, status: 'in_progress' })}
                      >
                        Start
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7 text-emerald-600"
                        onClick={() => updateStatusMutation.mutate({ noteId: note.id, status: 'resolved' })}
                      >
                        Resolve
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddNoteDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        customerId={customerId}
      />
    </div>
  );
}
