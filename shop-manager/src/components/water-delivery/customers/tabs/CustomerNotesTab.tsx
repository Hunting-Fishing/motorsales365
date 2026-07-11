import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { StickyNote, Plus, Loader2, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCustomerNotes, addCustomerNote, deleteCustomerNote } from '@/services/customer/customerNotesService';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface CustomerNotesTabProps {
  customerId: string;
}

const categoryColors: Record<string, string> = {
  general: 'bg-muted text-muted-foreground',
  service: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  sales: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'follow-up': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
};

export function CustomerNotesTab({ customerId }: CustomerNotesTabProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'service' | 'sales' | 'follow-up' | 'general'>('general');

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['customer-notes', customerId],
    queryFn: () => getCustomerNotes(customerId),
    enabled: !!customerId,
  });

  const addMutation = useMutation({
    mutationFn: () => addCustomerNote(customerId, content, category),
    onSuccess: () => {
      toast.success('Note added');
      queryClient.invalidateQueries({ queryKey: ['customer-notes', customerId] });
      setContent('');
      setCategory('general');
      setShowForm(false);
    },
    onError: () => toast.error('Failed to add note'),
  });

  const deleteMutation = useMutation({
    mutationFn: (noteId: string) => deleteCustomerNote(noteId),
    onSuccess: () => {
      toast.success('Note deleted');
      queryClient.invalidateQueries({ queryKey: ['customer-notes', customerId] });
    },
    onError: () => toast.error('Failed to delete note'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Notes & Activity</h3>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> Add Note
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write a note..."
              rows={3}
            />
            <div className="flex items-center gap-3">
              <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="follow-up">Follow-up</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex-1" />
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" disabled={!content.trim() || addMutation.isPending} onClick={() => addMutation.mutate()}>
                {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : notes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <StickyNote className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No notes yet. Add the first one!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className={categoryColors[note.category] || ''}>{note.category}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                      {note.created_by && (
                        <span className="text-xs text-muted-foreground">by {note.created_by}</span>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMutation.mutate(note.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
