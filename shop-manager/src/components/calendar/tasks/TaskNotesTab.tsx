import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

interface TaskNotesTabProps {
  taskData: ReturnType<typeof import('@/hooks/useTaskData').useTaskData>;
}

export function TaskNotesTab({ taskData }: TaskNotesTabProps) {
  const { activities, addNote, currentUserName } = taskData;
  const [newNote, setNewNote] = useState('');

  const notes = activities.filter((a) => a.is_note);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    addNote(newNote.trim());
    setNewNote('');
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Notes List */}
      <div className="flex-1 space-y-3 overflow-y-auto mb-4">
        {notes.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notes yet</p>
              <p className="text-sm">Add a note to communicate with your team</p>
            </CardContent>
          </Card>
        ) : (
          notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="py-3">
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getInitials(note.user_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{note.user_name || 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(note.created_at), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{note.notes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Note Form */}
      <form onSubmit={handleSubmit} className="flex-shrink-0">
        <Card>
          <CardContent className="py-3">
            <div className="flex gap-2">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {getInitials(currentUserName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 flex gap-2">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  className="min-h-[60px] resize-none"
                />
                <Button type="submit" size="icon" disabled={!newNote.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
