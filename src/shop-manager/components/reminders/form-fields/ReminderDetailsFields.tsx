
import { useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ReminderFormValues } from "../schemas/reminderFormSchema";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Check, ChevronsUpDown, Tag } from "lucide-react";
import { ReminderTag } from "@/types/reminder";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getReminderTags } from "@/services/reminders/reminderQueries";

interface ReminderDetailsFieldsProps {
  form: UseFormReturn<ReminderFormValues>;
}

export function ReminderDetailsFields({ form }: ReminderDetailsFieldsProps) {
  const [availableTags, setAvailableTags] = useState<ReminderTag[]>([]);
  const [tagsOpen, setTagsOpen] = useState(false);
  
  const selectedTagIds = form.watch("tagIds") || [];
  
  // Fetch available tags
  useEffect(() => {
    const loadTags = async () => {
      try {
        const tags = await getReminderTags();
        setAvailableTags(tags);
      } catch (error) {
        console.error("Error loading tags:", error);
      }
    };
    
    loadTags();
  }, []);
  
  // Handle tag selection/deselection
  const toggleTag = (tagId: string) => {
    const currentTags = form.getValues("tagIds") || [];
    if (currentTags.includes(tagId)) {
      form.setValue(
        "tagIds",
        currentTags.filter((id) => id !== tagId)
      );
    } else {
      form.setValue("tagIds", [...currentTags, tagId]);
    }
  };
  
  // Get selected tag objects
  const selectedTags = availableTags.filter(tag => 
    selectedTagIds.includes(tag.id)
  );
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Reminder title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="follow_up">Follow-up</SelectItem>
                  <SelectItem value="warranty">Warranty</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Details about this reminder"
                className="min-h-[100px]"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {form.getValues("categories")?.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center">
                          <div
                            className="h-2 w-2 rounded-full mr-2"
                            style={{ backgroundColor: category.color }}
                          />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      
      <FormField
        control={form.control}
        name="tagIds"
        render={() => (
          <FormItem>
            <FormLabel>Tags</FormLabel>
            <Popover open={tagsOpen} onOpenChange={setTagsOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "w-full justify-between",
                      !selectedTagIds.length && "text-muted-foreground"
                    )}
                  >
                    {selectedTagIds.length > 0
                      ? `${selectedTagIds.length} tag${selectedTagIds.length > 1 ? "s" : ""} selected`
                      : "Select tags"}
                    <Tag className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search tags..." />
                  <CommandEmpty>No tags found.</CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-auto">
                    {availableTags.map((tag) => (
                      <CommandItem
                        key={tag.id}
                        value={tag.name}
                        onSelect={() => toggleTag(tag.id)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedTagIds.includes(tag.id)
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <div
                          className="h-3 w-3 rounded-full mr-2"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedTags.map(tag => (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    className="text-xs"
                    style={{ borderColor: tag.color, color: tag.color }}
                  >
                    {tag.name}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1 text-muted-foreground hover:text-foreground"
                      onClick={() => toggleTag(tag.id)}
                    >
                      <span className="sr-only">Remove {tag.name}</span>
                      ×
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
