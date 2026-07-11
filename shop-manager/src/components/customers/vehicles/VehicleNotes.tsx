
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Plus } from 'lucide-react';
import { CustomerNote } from '@/types/customer';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export const VehicleNotes: React.FC<{ 
  vehicleId: string;
  customerId: string;
}> = ({ vehicleId, customerId }) => {
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        // In a real application, you would have a table specifically for vehicle notes
        // or filter customer notes that are related to this vehicle
        // For this example, we'll just fetch any customer notes
        const { data, error } = await supabase
          .from('customer_notes')
          .select('*')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Ensure the notes have the correct category type
        const typedNotes = (data || []).map(note => ({
          ...note,
          category: note.category as "service" | "sales" | "follow-up" | "general"
        }));
        
        setNotes(typedNotes);
      } catch (error) {
        console.error("Error fetching notes:", error);
        setNotes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [vehicleId, customerId]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    try {
      // Add vehicle-specific metadata to identify this note as related to the vehicle
      const { data, error } = await supabase
        .from('customer_notes')
        .insert({
          customer_id: customerId,
          content: `[Vehicle Note] ${newNote}`,
          category: 'service' as "service" | "sales" | "follow-up" | "general",
          created_by: 'staff'  // In a real app, this would be the logged-in user
        })
        .select();

      if (error) throw error;
      
      if (data && data.length > 0) {
        const typedNote = {
          ...data[0], 
          category: data[0].category as "service" | "sales" | "follow-up" | "general"
        };
        setNotes([typedNote, ...notes]);
        setNewNote('');
        setIsAdding(false);
        toast({
          title: "Note Added",
          description: "Your note has been added successfully."
        });
      }
    } catch (error) {
      console.error("Error adding note:", error);
      toast({
        title: "Error",
        description: "Failed to add note. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading notes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Vehicle Notes</h3>
        <Button 
          onClick={() => setIsAdding(!isAdding)}
          variant={isAdding ? "outline" : "default"}
        >
          {isAdding ? (
            <>Cancel</>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </>
          )}
        </Button>
      </div>

      {isAdding && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add New Note</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid w-full gap-1.5">
                <Label htmlFor="note-content">Note Content</Label>
                <Textarea
                  id="note-content"
                  placeholder="Enter note details here..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
                <Button onClick={handleAddNote}>Save Note</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <FileText className="w-16 h-16 mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No Notes Found</h3>
          <p className="text-muted-foreground">There are no notes recorded for this vehicle.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <Card key={note.id} className="overflow-hidden">
              <CardHeader className="bg-slate-50 p-4">
                <div className="flex justify-between">
                  <span className="font-medium">
                    {new Date(note.created_at).toLocaleDateString()} 
                    {" • "}
                    {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    By: {note.created_by}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <p>{note.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
