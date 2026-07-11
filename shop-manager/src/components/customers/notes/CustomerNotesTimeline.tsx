
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Customer, CustomerNote } from "@/types/customer";
import { Plus, Search, File, Briefcase, Clock, MessageCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { AddNoteDialog } from "./AddNoteDialog";
import { getCustomerNotes } from "@/services/customers";
import { useToast } from "@/hooks/use-toast";

interface CustomerNotesTimelineProps {
  customer: Customer;
  notes?: CustomerNote[];
  isLoading?: boolean;
  onNoteAdded?: (note: CustomerNote) => void;
}

export const CustomerNotesTimeline: React.FC<CustomerNotesTimelineProps> = ({
  customer,
  notes: initialNotes,
  isLoading: externalIsLoading,
  onNoteAdded
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [notes, setNotes] = useState<CustomerNote[]>(initialNotes || []);
  const [isLoading, setIsLoading] = useState(!initialNotes || externalIsLoading);
  const { toast } = useToast();

  useEffect(() => {
    if (initialNotes) {
      setNotes(initialNotes);
      setIsLoading(externalIsLoading || false);
    } else {
      loadNotes();
    }
  }, [customer.id, initialNotes, externalIsLoading]);

  const loadNotes = async () => {
    try {
      setIsLoading(true);
      const loadedNotes = await getCustomerNotes(customer.id);
      setNotes(loadedNotes);
    } catch (error) {
      console.error("Failed to load notes:", error);
      toast({
        title: "Error Loading Notes",
        description: "Could not load customer notes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter notes based on search query and category
  const filteredNotes = notes.filter(note => {
    const matchesSearch = searchQuery === "" || 
      note.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === "" || categoryFilter === "all" || 
      note.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  // Sort notes by date (newest first)
  const sortedNotes = [...filteredNotes].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const handleNoteAdded = (newNote: CustomerNote) => {
    setNotes([newNote, ...notes]);
    if (onNoteAdded) {
      onNoteAdded(newNote);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch(category) {
      case 'service':
        return <File className="h-4 w-4" />;
      case 'sales':
        return <Briefcase className="h-4 w-4" />;
      case 'follow-up':
        return <Clock className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getCategoryClass = (category: string) => {
    switch(category) {
      case 'service':
        return "bg-blue-100 text-blue-800";
      case 'sales':
        return "bg-green-100 text-green-800";
      case 'follow-up':
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">Notes Timeline</CardTitle>
        <Button size="sm" onClick={() => setIsAddNoteOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Note
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="service">Service</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="follow-up">Follow-up</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading notes...
            </div>
          ) : sortedNotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {notes.length === 0 ? (
                <>No notes recorded yet for this customer.</>
              ) : (
                <>No notes match your filters.</>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {sortedNotes.map((note) => (
                <div 
                  key={note.id} 
                  className="border rounded-lg p-4 relative hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`rounded-full p-2 ${getCategoryClass(note.category)}`}>
                        {getCategoryIcon(note.category)}
                      </div>
                      <div>
                        <p className="font-medium mb-1 flex flex-wrap items-center gap-2">
                          <span className="capitalize">{note.category}</span>
                          <span className="text-muted-foreground text-xs">
                            {format(parseISO(note.created_at), "PPP")}
                          </span>
                        </p>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{note.content}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Added by {note.created_by}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <AddNoteDialog
          customer={customer}
          open={isAddNoteOpen}
          onOpenChange={setIsAddNoteOpen}
          onNoteAdded={handleNoteAdded}
        />
      </CardContent>
    </Card>
  );
};
