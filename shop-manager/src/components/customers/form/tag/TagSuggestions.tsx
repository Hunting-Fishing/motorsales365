
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { cn } from "@/lib/utils";

interface TagSuggestionsProps {
  onSelectTag: (tag: string) => void;
  selectedTags: string[];
}

export const TagSuggestions: React.FC<TagSuggestionsProps> = ({ onSelectTag, selectedTags }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    const fetchTags = async () => {
      try {
        setLoading(true);
        // Use a table that exists in the database
        const { data, error } = await supabase
          .from('customer_segments')
          .select('name')
          .limit(5);

        if (error) {
          console.error("Error fetching tags:", error);
        }

        setSuggestions(data ? data.map(item => item.name) : []);
      } finally {
        setLoading(false);
      }
    };

    fetchTags();
  }, []);

  const handleSelectTag = (tag: string) => {
    onSelectTag(tag);
    setIsOpen(false);
  };

  const handleCreateTag = async () => {
    if (!newTag.trim()) return;

    try {
      setLoading(true);
      // For now, just add the tag directly without creating in database
      setSuggestions([...suggestions, newTag]);
      onSelectTag(newTag);
      setNewTag('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={isOpen} className="w-full justify-between">
          Select Tags
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <div className="p-2">
          <Input
            type="text"
            placeholder="Create new tag"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            className="mb-2"
          />
          <Button onClick={handleCreateTag} disabled={loading} className="w-full">
            Create Tag
          </Button>
        </div>
        {loading ? (
          <div className="p-2">Loading suggestions...</div>
        ) : (
          suggestions.map((tag) => (
            <Button
              key={tag}
              variant="ghost"
              className="justify-start w-full rounded-none px-2 hover:bg-slate-100 data-[state=checked]:bg-slate-500 data-[state=checked]:text-white"
              onClick={() => handleSelectTag(tag)}
              disabled={selectedTags.includes(tag)}
            >
              {tag}
            </Button>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { }

const InputComponent = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300",
        className
      )}
      {...props}
      ref={ref}
    />
  )
})
InputComponent.displayName = "Input"
