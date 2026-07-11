
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X } from "lucide-react";
import { ReminderTag } from "@/types/reminder";
import { getReminderTags } from "@/services/reminders/reminderQueries";
import { createReminderTag } from "@/services/reminders/reminderMutations";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export function ReminderTagsManager() {
  const [tags, setTags] = useState<ReminderTag[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const loadTags = async () => {
    try {
      setLoading(true);
      const data = await getReminderTags();
      setTags(data);
    } catch (err) {
      console.error("Failed to load tags:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load tags."
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadTags();
  }, []);
  
  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTagName.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Tag name cannot be empty."
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Check if tag already exists
      const { data: existingTags } = await supabase
        .from("reminder_tags")
        .select("name")
        .ilike("name", newTagName.trim())
        .limit(1);
      
      if (existingTags && existingTags.length > 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "A tag with this name already exists."
        });
        setIsSubmitting(false);
        return;
      }
      
      await createReminderTag(newTagName.trim());
      
      toast({
        title: "Success",
        description: "Tag created successfully."
      });
      
      setNewTagName("");
      loadTags();
    } catch (error) {
      console.error("Error creating tag:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create tag. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteTag = async (tagId: string) => {
    try {
      // Check if tag is used in any reminders
      const { data: usedTags, error: checkError } = await supabase
        .from("service_reminder_tags")
        .select("reminder_id")
        .eq("tag_id", tagId)
        .limit(1);
      
      if (checkError) throw checkError;
      
      if (usedTags && usedTags.length > 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "This tag is in use and cannot be deleted."
        });
        return;
      }
      
      const { error: deleteError } = await supabase
        .from("reminder_tags")
        .delete()
        .eq("id", tagId);
      
      if (deleteError) throw deleteError;
      
      toast({
        title: "Success",
        description: "Tag deleted successfully."
      });
      
      loadTags();
    } catch (error) {
      console.error("Error deleting tag:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete tag. Please try again."
      });
    }
  };
  
  return (
    <Card>
      <CardHeader className="bg-slate-50 border-b">
        <CardTitle className="text-lg">Reminder Tags</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleCreateTag} className="flex gap-2 mb-6">
          <Input
            placeholder="New tag name"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            disabled={isSubmitting}
          />
          <Button type="submit" disabled={isSubmitting || !newTagName.trim()}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </form>
        
        {loading ? (
          <div className="text-center py-4">Loading tags...</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.length === 0 ? (
              <div className="text-center w-full py-4 text-muted-foreground">
                No tags found. Create your first tag to get started.
              </div>
            ) : (
              tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="flex items-center gap-1 py-1 px-3"
                  style={{ borderColor: tag.color, color: tag.color }}
                >
                  <span>{tag.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 rounded-full p-0 ml-1"
                    onClick={() => handleDeleteTag(tag.id)}
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Delete tag</span>
                  </Button>
                </Badge>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
